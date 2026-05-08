"""
Volunteers API Routes
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.schemas.volunteer import VolunteerUpdate, VolunteerResponse
from app.services import volunteer_service

router = APIRouter()

@router.put("/availability", response_model=VolunteerResponse)
async def update_availability(
    data: VolunteerUpdate,
    current_user: dict = Depends(require_roles(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    if data.availability_status is None:
        raise HTTPException(status_code=400, detail="availability_status is required")
        
    return await volunteer_service.toggle_availability(
        db, current_user["user_id"], data.availability_status
    )

@router.get("/nearby", response_model=List[VolunteerResponse])
async def get_nearby_volunteers(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_km: float = Query(10.0),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await volunteer_service.get_nearby_volunteers(
        db, latitude, longitude, radius_km
    )

@router.get("/profile", response_model=VolunteerResponse)
async def my_volunteer_profile(
    current_user: dict = Depends(require_roles(["volunteer"])),
    db: AsyncSession = Depends(get_db)
):
    try:
        return await volunteer_service.get_volunteer_profile(db, current_user["user_id"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
