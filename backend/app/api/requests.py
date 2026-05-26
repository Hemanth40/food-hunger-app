"""
Requests and delivery assignment API routes.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.schemas.donation_request import RequestCreate, RequestResponse, RequestUpdate
from app.services import request_service

router = APIRouter()


@router.post("/claim", response_model=RequestResponse)
async def claim_donation(
    data: RequestCreate,
    current_user: dict = Depends(require_roles(["ngo"])),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await request_service.create_claim(
            db, data.donation_id, current_user["user_id"], data.message
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/driver/open", response_model=List[RequestResponse])
async def open_driver_jobs(
    current_user: dict = Depends(require_roles(["user", "volunteer"])),
    db: AsyncSession = Depends(get_db),
):
    return await request_service.get_open_driver_jobs(db, current_user["user_id"])


@router.get("/driver/my", response_model=List[RequestResponse])
async def my_driver_jobs(
    current_user: dict = Depends(require_roles(["user", "volunteer"])),
    db: AsyncSession = Depends(get_db),
):
    return await request_service.get_my_driver_jobs(db, current_user["user_id"])


@router.get("/donor/dispatches", response_model=List[RequestResponse])
async def donor_dispatches(
    current_user: dict = Depends(require_roles(["restaurant", "user"])),
    db: AsyncSession = Depends(get_db),
):
    return await request_service.get_donor_dispatches(db, current_user["user_id"])


@router.get("/my", response_model=List[RequestResponse])
async def my_claims(
    current_user: dict = Depends(require_roles(["ngo"])),
    db: AsyncSession = Depends(get_db),
):
    return await request_service.get_my_claims(db, current_user["user_id"])


@router.post("/{request_id}/accept-driver", response_model=RequestResponse)
async def accept_driver_job(
    request_id: int,
    current_user: dict = Depends(require_roles(["user", "volunteer"])),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await request_service.accept_driver_job(db, request_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{request_id}/self-deliver", response_model=RequestResponse)
async def self_deliver_claim(
    request_id: int,
    current_user: dict = Depends(require_roles(["restaurant", "user"])),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await request_service.set_donor_self_delivery(db, request_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/{request_id}/status", response_model=RequestResponse)
async def update_claim_status(
    request_id: int,
    data: RequestUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await request_service.update_claim_status(
            db, request_id, current_user["user_id"], data.status
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/donation/{donation_id}", response_model=List[RequestResponse])
async def get_claims_for_donation(
    donation_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await request_service.get_donation_claims(db, donation_id)


class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float


@router.put("/{request_id}/driver-location")
async def update_driver_location(
    request_id: int,
    data: DriverLocationUpdate,
    current_user: dict = Depends(require_roles(["user", "volunteer"])),
    db: AsyncSession = Depends(get_db),
):
    """Called by the volunteer app every few seconds to broadcast live GPS."""
    await request_service.update_driver_location(
        db, request_id, current_user["user_id"], data.latitude, data.longitude
    )
    return {"ok": True}


@router.get("/{request_id}", response_model=RequestResponse)
async def get_claim_by_id(
    request_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details for a single delivery request by ID."""
    claim = await request_service.get_claim(db, request_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Request not found")
    return claim


@router.get("/{request_id}/driver-location")
async def get_driver_location(
    request_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Polled by restaurant/NGO to get driver's current GPS coordinates."""
    loc = await request_service.get_driver_location(db, request_id)
    if loc is None:
        return {"latitude": None, "longitude": None}
    return loc
