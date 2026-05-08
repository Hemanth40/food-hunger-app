"""
User schemas — registration, login, OTP, profile, tokens.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=10, max_length=20)
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(restaurant|user|ngo|volunteer)$")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None


class UserLogin(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=6)


class OTPRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)


class OTPVerify(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    otp: str = Field(..., min_length=4, max_length=8)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    full_name: str
    phone: str
    email: Optional[str] = None
    role: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class UserStats(BaseModel):
    total_donations: int = 0
    total_claimed: int = 0
    total_delivered: int = 0
    meals_saved: int = 0
    people_fed: int = 0


TokenResponse.model_rebuild()
