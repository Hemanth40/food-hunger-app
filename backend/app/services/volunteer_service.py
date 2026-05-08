"""
Volunteer Service — availability, nearby matching, rating.
"""

import math
from typing import List

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.volunteer import Volunteer
from app.models.user import User, UserRole
from app.schemas.volunteer import VolunteerResponse


async def toggle_availability(db: AsyncSession, user_id: int, available: bool) -> Volunteer:
    result = await db.execute(
        select(Volunteer).where(Volunteer.user_id == user_id)
    )
    volunteer = result.scalar_one_or_none()
    if not volunteer:
        volunteer = Volunteer(user_id=user_id, availability_status=available)
        db.add(volunteer)
    else:
        volunteer.availability_status = available
    await db.flush()
    return volunteer


async def get_nearby_volunteers(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    radius_km: float = 10.0,
) -> List[VolunteerResponse]:
    """Find nearby available volunteers."""
    lat_range = radius_km / 111.0
    lon_range = radius_km / (111.0 * max(math.cos(math.radians(latitude)), 0.01))

    result = await db.execute(
        select(Volunteer, User)
        .join(User, Volunteer.user_id == User.id)
        .where(
            and_(
                Volunteer.availability_status == True,
                User.latitude.isnot(None),
                User.latitude.between(latitude - lat_range, latitude + lat_range),
                User.longitude.between(longitude - lon_range, longitude + lon_range),
            )
        )
    )

    volunteers = []
    for vol, user in result.all():
        from app.services.donation_service import haversine_distance
        dist = haversine_distance(latitude, longitude, user.latitude, user.longitude)
        if dist <= radius_km:
            volunteers.append(VolunteerResponse(
                id=vol.id,
                user_id=vol.user_id,
                volunteer_name=user.full_name,
                phone=user.phone,
                availability_status=vol.availability_status,
                rating=vol.rating,
                total_deliveries=vol.total_deliveries,
                latitude=user.latitude,
                longitude=user.longitude,
                distance_km=round(dist, 2),
            ))

    volunteers.sort(key=lambda v: (v.distance_km, -v.rating))
    return volunteers


async def get_volunteer_profile(db: AsyncSession, user_id: int) -> Volunteer:
    result = await db.execute(
        select(Volunteer).where(Volunteer.user_id == user_id)
    )
    vol = result.scalar_one_or_none()
    if not vol:
        raise ValueError("Volunteer profile not found")
    return vol


async def increment_deliveries(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(Volunteer).where(Volunteer.user_id == user_id)
    )
    vol = result.scalar_one_or_none()
    if vol:
        vol.total_deliveries += 1
        await db.flush()
