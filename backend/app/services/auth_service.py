"""
Auth service for registration, login, OTP, and token management.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import (
    blacklist_token,
    is_token_blacklisted,
    store_otp,
    verify_otp_from_store,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    hash_password,
    verify_password,
)
from app.services.sms_service import send_otp_sms
from app.models.user import User, UserRole
from app.models.volunteer import Volunteer
from app.schemas.user import TokenResponse, UserLogin, UserRegister, UserResponse


async def register_user(db: AsyncSession, data: UserRegister) -> dict:
    """Create account (inactive), send OTP for verification."""
    existing = await db.execute(select(User).where(User.phone == data.phone))
    if existing.scalar_one_or_none():
        raise ValueError("Phone number already registered")

    if data.email:
        existing_email = await db.execute(select(User).where(User.email == data.email))
        if existing_email.scalar_one_or_none():
            raise ValueError("Email already registered")

    user = User(
        full_name=data.full_name,
        phone=data.phone,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole(data.role),
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address,
        is_active=False,  # Stay inactive until OTP verified
    )
    db.add(user)
    await db.flush()

    if data.role == "volunteer":
        db.add(Volunteer(user_id=user.id, availability_status=True, rating=5.0))

    await db.flush()

    # Generate OTP, store in Redis, send via SMS
    otp = generate_otp()
    await store_otp(user.phone, otp)
    sms_sent = await send_otp_sms(user.phone, otp)

    return {
        "phone": user.phone,
        "message": f"OTP sent to {user.phone[-4:]} — enter it to activate your account",
        "otp_hint": None if sms_sent else otp,  # Only show hint if SMS failed
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


async def verify_otp_and_login(db: AsyncSession, phone: str, otp: str) -> TokenResponse:
    """Verify OTP during registration, activate account, return JWT."""
    if not await verify_otp_from_store(phone, otp):
        raise ValueError("Invalid or expired OTP")

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
