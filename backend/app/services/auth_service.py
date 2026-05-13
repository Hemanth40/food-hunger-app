"""
Auth service for registration, login, OTP, and token management.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import blacklist_token, is_token_blacklisted
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.donation import Donation
from app.models.user import User, UserRole
from app.models.volunteer import Volunteer
from app.schemas.user import TokenResponse, UserLogin, UserRegister, UserResponse
from app.services.sms_service import send_otp_sms, verify_otp_via_twilio


async def register_user(db: AsyncSession, data: UserRegister) -> dict:
    """Create account (inactive), send OTP for verification."""
    existing_result = await db.execute(select(User).where(User.phone == data.phone))
    existing = existing_result.scalar_one_or_none()

    if existing:
        if existing.is_active:
            raise ValueError("Phone number already registered")
        else:
            # Incomplete registration (OTP was never verified) — delete and retry
            await db.delete(existing)
            await db.flush()

    if data.email:
        existing_email = await db.execute(select(User).where(User.email == data.email))
        ex_email_user = existing_email.scalar_one_or_none()
        if ex_email_user and ex_email_user.is_active:
            raise ValueError("Email already registered")
        elif ex_email_user and not ex_email_user.is_active:
            await db.delete(ex_email_user)
            await db.flush()

    user = User(
        full_name=data.full_name,
        phone=data.phone,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole(data.role),
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address,
        is_active=False,  # Stays inactive until OTP verified
    )
    db.add(user)
    await db.flush()

    if data.role == "volunteer":
        db.add(Volunteer(user_id=user.id, availability_status=True, rating=5.0))

    await db.flush()

    # Firebase handles OTP client-side — no backend SMS needed
    if settings.USE_FIREBASE_AUTH or settings.DEV_MODE:
        mode = 'DEV' if settings.DEV_MODE else 'Firebase'
        print(f"[Auth] {mode} mode: backend skips OTP send, client handles it.")
    else:
        await send_otp_sms(user.phone)

    return {
        "phone": user.phone,
        "message": "OTP sent to your phone — enter it to activate your account",
        "otp_hint": settings.DEV_OTP if settings.DEV_MODE else None,
    }


async def login_user(db: AsyncSession, data: UserLogin) -> TokenResponse:
    """Verify phone + password → return JWT tokens immediately. No OTP needed."""
    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise ValueError("Invalid phone number or password")
    if not user.is_active:
        raise ValueError("Account not verified. Please complete OTP verification first.")

    token_data = {"sub": str(user.id), "role": user.role.value, "email": user.email or ""}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


async def verify_otp_and_login(db: AsyncSession, phone: str, firebase_id_token: str) -> TokenResponse:
    """Verify Firebase Phone Auth token (or DEV_OTP), activate account, return JWT."""
    if settings.DEV_MODE:
        # Dev mode: firebase_id_token is treated as the raw OTP code
        if firebase_id_token != settings.DEV_OTP:
            raise ValueError(f"Invalid OTP. Dev mode: use '{settings.DEV_OTP}'")
    else:
        # Firebase mode: verify the ID token from Firebase Phone Auth
        from app.services.firebase_service import verify_firebase_id_token
        decoded = verify_firebase_id_token(firebase_id_token)
        # Firebase returns E.164 phone_number: +91XXXXXXXXXX
        token_phone = decoded.get("phone_number", "")
        # Compare last 10 digits to be format-agnostic
        if not token_phone or phone.strip()[-10:] != token_phone[-10:]:
            raise ValueError("Phone number does not match Firebase token")

    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found")

    # Activate account on first OTP verification (registration)
    if not user.is_active:
        user.is_active = True
        await db.flush()

    token_data = {"sub": str(user.id), "role": user.role.value, "email": user.email or ""}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


async def refresh_access_token(refresh_token: str) -> dict:
    if await is_token_blacklisted(refresh_token):
        raise ValueError("Refresh token has been revoked")

    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise ValueError("Invalid refresh token")

    token_data = {
        "sub": payload["sub"],
        "role": payload["role"],
        "email": payload.get("email", ""),
    }
    return {
        "access_token": create_access_token(token_data),
        "token_type": "bearer",
    }


async def logout_user(refresh_token: str):
    await blacklist_token(refresh_token)


async def get_user_by_id(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found")
    return user


async def update_user_profile(db: AsyncSession, user_id: int, updates: dict) -> User:
    user = await get_user_by_id(db, user_id)
    for key, value in updates.items():
        if value is not None and hasattr(user, key):
            setattr(user, key, value)
    await db.flush()
    return user
