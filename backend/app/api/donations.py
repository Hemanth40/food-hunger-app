"""
Donations API routes.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.schemas.donation import DonationCreate, DonationListResponse, DonationResponse, NearbyDonationQuery
from app.services import donation_service

router = APIRouter()


@router.post("/", response_model=DonationResponse)
async def create_donation(
    donation_data: DonationCreate,
    current_user: dict = Depends(require_roles(["restaurant", "user"])),
    db: AsyncSession = Depends(get_db),
):
    return await donation_service.create_donation(db, current_user["user_id"], donation_data)


@router.get("/", response_model=DonationListResponse)
async def list_donations(
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    donations, total = await donation_service.get_donations(db, status, limit, offset)
    return {"donations": donations, "total": total}


@router.get("/nearby", response_model=List[DonationResponse])
async def nearby_donations(
    query: NearbyDonationQuery = Depends(),
    db: AsyncSession = Depends(get_db),
):
    return await donation_service.get_nearby_donations(
        db, query.latitude, query.longitude, query.radius_km, query.limit
    )


@router.get("/my/history", response_model=List[DonationResponse])
async def my_donation_history(
    current_user: dict = Depends(require_roles(["restaurant", "user"])),
    db: AsyncSession = Depends(get_db),
):
    return await donation_service.get_donor_history(db, current_user["user_id"])


@router.get("/my/stats")
async def my_donation_stats(
    current_user: dict = Depends(require_roles(["restaurant", "user"])),
    db: AsyncSession = Depends(get_db),
):
    return await donation_service.get_donor_stats(db, current_user["user_id"])


@router.get("/{donation_id}", response_model=DonationResponse)
async def get_donation(donation_id: int, db: AsyncSession = Depends(get_db)):
    donation = await donation_service.get_donation_by_id(db, donation_id)
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    return donation


@router.put("/{donation_id}/status", response_model=DonationResponse)
async def update_status(
    donation_id: int,
    status: str = Query(..., pattern="^(available|claimed|picked_up|delivered|expired)$"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    donation = await donation_service.get_donation_by_id(db, donation_id)
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    if donation.donor_id != current_user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="Only the donation owner can update this status directly",
        )

    try:
        return await donation_service.update_donation_status(db, donation_id, status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{donation_id}/image")
async def get_image(donation_id: int, db: AsyncSession = Depends(get_db)):
    image_info = await donation_service.get_donation_image(db, donation_id)
    if not image_info:
        raise HTTPException(status_code=404, detail="Image not found")

    image_data, mime_type = image_info
    return Response(content=image_data, media_type=mime_type)
