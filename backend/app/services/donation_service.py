"""
Donation service for CRUD, nearby geo queries, images, and donor analytics.
"""

import base64
import math
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.donation import Donation, DonationStatus
from app.models.user import User
from app.schemas.donation import DonationCreate, DonationResponse


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)
    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c


async def create_donation(db: AsyncSession, donor_id: int, data: DonationCreate) -> Donation:
    image_data = None
    if data.image_base64:
        try:
            image_data = base64.b64decode(data.image_base64)
        except Exception:
            image_data = None

    donation = Donation(
        donor_id=donor_id,
        food_type=data.food_type,
        quantity=data.quantity,
        description=data.description,
        image_data=image_data,
        image_mime_type=data.image_mime_type,
        latitude=data.latitude,
        longitude=data.longitude,
        pickup_address=data.pickup_address,
        delivery_preference=data.delivery_preference,
        expires_at=data.expires_at,
        status=DonationStatus.AVAILABLE,
    )
    db.add(donation)
    await db.flush()
    return donation


async def get_donation_by_id(db: AsyncSession, donation_id: int) -> Optional[Donation]:
    result = await db.execute(select(Donation).where(Donation.id == donation_id))
    return result.scalar_one_or_none()


async def get_donations(
    db: AsyncSession,
    status_filter: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[Donation], int]:
    query = select(Donation)
    count_query = select(func.count(Donation.id))

    if status_filter:
        status_value = DonationStatus(status_filter)
        query = query.where(Donation.status == status_value)
        count_query = count_query.where(Donation.status == status_value)

    query = query.order_by(Donation.created_at.desc()).limit(limit).offset(offset)

    donations = (await db.execute(query)).scalars().all()
    total = (await db.execute(count_query)).scalar()
    return list(donations), total


async def get_nearby_donations(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    radius_km: float = 10.0,
    limit: int = 20,
) -> List[DonationResponse]:
    lat_range = radius_km / 111.0
    lon_range = radius_km / (111.0 * max(math.cos(math.radians(latitude)), 0.01))

    result = await db.execute(
        select(Donation, User.full_name, User.phone)
        .join(User, Donation.donor_id == User.id)
        .where(
            and_(
                Donation.status == DonationStatus.AVAILABLE,
                Donation.expires_at > datetime.now(timezone.utc),
                Donation.latitude.between(latitude - lat_range, latitude + lat_range),
                Donation.longitude.between(longitude - lon_range, longitude + lon_range),
            )
        )
        .order_by(Donation.expires_at.asc())
        .limit(limit)
    )

    payload = []
    for donation, donor_name, donor_phone in result.all():
        distance_km = haversine_distance(latitude, longitude, donation.latitude, donation.longitude)
        if distance_km > radius_km:
            continue

        payload.append(
            DonationResponse(
                id=donation.id,
                donor_id=donation.donor_id,
                donor_name=donor_name,
                donor_phone=donor_phone,
                food_type=donation.food_type,
                quantity=donation.quantity,
                description=donation.description,
                has_image=donation.image_data is not None,
                latitude=donation.latitude,
                longitude=donation.longitude,
                pickup_address=donation.pickup_address,
                delivery_preference=donation.delivery_preference,
                expires_at=donation.expires_at,
                status=donation.status.value,
                created_at=donation.created_at,
                distance_km=round(distance_km, 2),
            )
        )

    payload.sort(key=lambda item: (item.distance_km or 0, item.expires_at, -item.quantity))
    return payload[:limit]


async def get_donor_history(db: AsyncSession, donor_id: int) -> List[Donation]:
    result = await db.execute(
        select(Donation)
        .where(Donation.donor_id == donor_id)
        .order_by(Donation.created_at.desc())
    )
    return list(result.scalars().all())


async def update_donation_status(db: AsyncSession, donation_id: int, status: str) -> Donation:
    donation = await get_donation_by_id(db, donation_id)
    if not donation:
        raise ValueError("Donation not found")
    donation.status = DonationStatus(status)
    await db.flush()
    return donation


async def get_donation_image(db: AsyncSession, donation_id: int) -> Optional[Tuple[bytes, str]]:
    donation = await get_donation_by_id(db, donation_id)
    if donation and donation.image_data:
        return donation.image_data, donation.image_mime_type or "image/jpeg"
    return None


async def expire_old_donations(db: AsyncSession) -> int:
    result = await db.execute(
        select(Donation).where(
            and_(
                Donation.status == DonationStatus.AVAILABLE,
                Donation.expires_at <= datetime.now(timezone.utc),
            )
        )
    )
    expired = result.scalars().all()
    for donation in expired:
        donation.status = DonationStatus.EXPIRED
    await db.flush()
    return len(expired)


async def get_donor_stats(db: AsyncSession, donor_id: int) -> dict:
    row = (
        await db.execute(
            select(
                func.count(Donation.id).label("total"),
                func.sum(case((Donation.status == DonationStatus.DELIVERED, 1), else_=0)).label("delivered"),
                func.sum(
                    case((Donation.status == DonationStatus.DELIVERED, Donation.quantity), else_=0)
                ).label("qty_delivered"),
            ).where(Donation.donor_id == donor_id)
        )
    ).one()

    qty_delivered = row.qty_delivered or 0
    return {
        "total_donations": row.total or 0,
        "total_delivered": row.delivered or 0,
        "meals_saved": qty_delivered * 3,
        "people_fed": qty_delivered,
        "active_routes": 0,
    }
