"""
Volunteer schemas.
"""

from typing import Optional
from pydantic import BaseModel, Field


class VolunteerUpdate(BaseModel):
    availability_status: Optional[bool] = None


class VolunteerResponse(BaseModel):
    id: int
    user_id: int
    volunteer_name: Optional[str] = None
    phone: Optional[str] = None
    availability_status: bool
    rating: float
    total_deliveries: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True
