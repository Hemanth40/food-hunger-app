"""
Auth API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.user import (
    UserRegister, UserLogin, OTPVerify, OTPRequest,
    TokenResponse, RefreshTokenRequest, UserResponse, UserUpdate
)
from app.services import auth_service

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register new user — creates inactive account and sends OTP to phone."""
    try:
        return await auth_service.register_user(db, user_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login with phone + password — returns JWT directly, no OTP needed."""
    try:
        return await auth_service.login_user(db, login_data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(otp_data: OTPVerify, db: AsyncSession = Depends(get_db)):
    try:
        return await auth_service.verify_otp_and_login(
            db, otp_data.phone, otp_data.firebase_id_token
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/refresh")
async def refresh_token(token_data: RefreshTokenRequest):
    try:
        return await auth_service.refresh_access_token(token_data.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/logout")
async def logout(token_data: RefreshTokenRequest):
    await auth_service.logout_user(token_data.refresh_token)
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        return await auth_service.get_user_by_id(db, current_user["user_id"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/me", response_model=UserResponse)
async def update_me(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        return await auth_service.update_user_profile(
            db, current_user["user_id"], update_data.model_dump(exclude_unset=True)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
