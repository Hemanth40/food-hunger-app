"""
DonationRequest schemas.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RequestCreate(BaseModel):
    donation_id: int
    message: Optional[str] = Field(None, max_length=500)


class RequestUpdate(BaseModel):
    status: str = Field(..., pattern="^(approved|picked_up|delivered|cancelled)$")


class RequestResponse(BaseModel):
    id: int
    donation_id: int
    receiver_id: int
    receiver_name: Optional[str] = None
    receiver_role: Optional[str] = None
    receiver_latitude: Optional[float] = None
    receiver_longitude: Optional[float] = None
    receiver_address: Optional[str] = None
    status: str
    message: Optional[str] = None
    claimed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    assigned_driver_id: Optional[int] = None
    assigned_driver_name: Optional[str] = None
    delivery_mode: Optional[str] = None
    donor_name: Optional[str] = None
    donor_phone: Optional[str] = None
    donation_food_type: Optional[str] = None
    donation_quantity: Optional[int] = None
    donation_pickup_address: Optional[str] = None
    donation_latitude: Optional[float] = None
    donation_longitude: Optional[float] = None

    class Config:
        from_attributes = True
