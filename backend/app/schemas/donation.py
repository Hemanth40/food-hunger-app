"""
Donation schemas.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class DonationCreate(BaseModel):
    food_type: str = Field(..., min_length=2, max_length=255)
    quantity: int = Field(..., gt=0)
    description: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    pickup_address: str = Field(..., min_length=5)
    delivery_preference: str = Field(default="flex", pattern="^(flex|driver|self)$")
    expires_at: datetime
    image_base64: Optional[str] = None
    image_mime_type: Optional[str] = None


class DonationUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(available|claimed|picked_up|delivered|expired)$")
    food_type: Optional[str] = None
    quantity: Optional[int] = None
    description: Optional[str] = None


class DonationResponse(BaseModel):
    id: int
    donor_id: int
    donor_name: Optional[str] = None
    donor_phone: Optional[str] = None
    food_type: str
    quantity: int
    description: Optional[str] = None
    has_image: bool = False
    latitude: float
    longitude: float
    pickup_address: str
    delivery_preference: str = "flex"
    expires_at: datetime
    status: str
    created_at: datetime
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True


class NearbyDonationQuery(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=10.0, gt=0, le=100)
    limit: int = Field(default=20, gt=0, le=100)


class DonationListResponse(BaseModel):
    donations: List[DonationResponse]
    total: int
