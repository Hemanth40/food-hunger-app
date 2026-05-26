"""
Request service for NGO claims, driver assignment, and delivery state.
"""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.donation import Donation, DonationStatus
from app.models.donation_request import DonationRequest, RequestStatus
from app.models.user import User
from app.schemas.donation_request import RequestResponse
from app.core.websocket import manager


def _status_text(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _build_request_response(
    claim: DonationRequest,
    donation: Donation,
    donor: User,
    receiver: User,
    driver: Optional[User] = None,
) -> RequestResponse:
    # In SQLAlchemy 2.x + PostgreSQL, outerjoin aliased entity may be a zombie object
    # with id=None instead of Python None — check .id explicitly
    driver_id = getattr(driver, "id", None)
    driver_name = driver.full_name if (driver and driver_id) else None

    return RequestResponse(
        id=claim.id,
        donation_id=claim.donation_id,
        receiver_id=claim.receiver_id,
        receiver_name=receiver.full_name if receiver else None,
        receiver_role=receiver.role.value if receiver else None,
        receiver_latitude=receiver.latitude if receiver else None,
        receiver_longitude=receiver.longitude if receiver else None,
        receiver_address=receiver.address if receiver else None,
        status=_status_text(claim.status),
        message=claim.message,
        claimed_at=claim.claimed_at,
        completed_at=claim.completed_at,
        created_at=claim.created_at,
        assigned_driver_id=claim.assigned_driver_id,
        assigned_driver_name=driver_name,
        delivery_mode=claim.delivery_mode,
        donor_name=donor.full_name if donor else None,
        donor_phone=donor.phone if donor else None,
        donation_food_type=donation.food_type,
        donation_quantity=donation.quantity,
        donation_pickup_address=donation.pickup_address,
        donation_latitude=donation.latitude,
        donation_longitude=donation.longitude,
        driver_latitude=claim.driver_latitude,
        driver_longitude=claim.driver_longitude,
    )


def _context_query():
    donor_alias = aliased(User)
    receiver_alias = aliased(User)
    driver_alias = aliased(User)
    query = (
        select(DonationRequest, Donation, donor_alias, receiver_alias, driver_alias)
        .join(Donation, Donation.id == DonationRequest.donation_id)
        .join(donor_alias, donor_alias.id == Donation.donor_id)
        .join(receiver_alias, receiver_alias.id == DonationRequest.receiver_id)
        .outerjoin(driver_alias, driver_alias.id == DonationRequest.assigned_driver_id)
    )
    return query, donor_alias, receiver_alias, driver_alias


async def _serialize_rows(rows) -> List[RequestResponse]:
    return [_build_request_response(*row) for row in rows]


async def _get_claim_context(db: AsyncSession, request_id: int):
    query, _, _, _ = _context_query()
    result = await db.execute(query.where(DonationRequest.id == request_id))
    return result.one_or_none()


async def create_claim(
    db: AsyncSession,
    donation_id: int,
    receiver_id: int,
    message: Optional[str] = None,
) -> RequestResponse:
    donation = (await db.execute(select(Donation).where(Donation.id == donation_id))).scalar_one_or_none()
    if not donation:
        raise ValueError("Donation not found")
    if donation.status != DonationStatus.AVAILABLE:
        raise ValueError("Donation is no longer available")

    existing = await db.execute(
        select(DonationRequest).where(
            and_(
                DonationRequest.donation_id == donation_id,
                DonationRequest.receiver_id == receiver_id,
                DonationRequest.status.in_([RequestStatus.PENDING, RequestStatus.APPROVED]),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("You already have an active claim on this donation")

    request = DonationRequest(
        donation_id=donation_id,
        receiver_id=receiver_id,
        status=RequestStatus.APPROVED,
        delivery_mode=donation.delivery_preference,
        message=message,
        claimed_at=datetime.now(timezone.utc),
    )
    db.add(request)
    donation.status = DonationStatus.CLAIMED
    await db.flush()

    context = await _get_claim_context(db, request.id)
    return _build_request_response(*context)


async def update_claim_status(
    db: AsyncSession,
    request_id: int,
    user_id: int,
    new_status: str,
) -> RequestResponse:
    context = await _get_claim_context(db, request_id)
    if not context:
        raise ValueError("Claim not found")

    claim, donation, donor, receiver, driver = context
    target_status = RequestStatus(new_status)

    is_donor = donation.donor_id == user_id
    is_receiver = claim.receiver_id == user_id
    is_driver = claim.assigned_driver_id == user_id

    if target_status == RequestStatus.DRIVER_REACHED:
        if claim.delivery_mode == "driver" and not is_driver:
            raise ValueError("Only the assigned driver can update this status")
        claim.status = RequestStatus.DRIVER_REACHED
        
        # Notify donor and receiver via websocket
        try:
            await manager.send_personal_json({"type": "STATUS_UPDATE", "status": "driver_reached", "request_id": request_id}, donation.donor_id)
            await manager.send_personal_json({"type": "STATUS_UPDATE", "status": "driver_reached", "request_id": request_id}, claim.receiver_id)
        except Exception:
            pass

    elif target_status == RequestStatus.PICKED_UP:
        if claim.delivery_mode == "self" and not is_donor:
            raise ValueError("Only the donor can start this self-delivery")
        if claim.delivery_mode == "driver" and not is_driver:
            raise ValueError("Only the assigned driver can start this delivery")
        if claim.delivery_mode == "flex":
            raise ValueError("Choose a delivery partner first")
        claim.status = RequestStatus.PICKED_UP
        donation.status = DonationStatus.PICKED_UP
    elif target_status == RequestStatus.DELIVERED:
        if claim.delivery_mode == "self" and not (is_donor or is_receiver):
            raise ValueError("Only the donor or NGO can close this delivery")
        if claim.delivery_mode == "driver" and not (is_driver or is_receiver):
            raise ValueError("Only the assigned driver or NGO can close this delivery")
        if claim.delivery_mode == "flex":
            raise ValueError("Choose a delivery partner first")
        claim.status = RequestStatus.DELIVERED
        donation.status = DonationStatus.DELIVERED
        claim.completed_at = datetime.now(timezone.utc)
        if claim.delivery_mode == "driver" and claim.assigned_driver_id:
            from app.services.volunteer_service import increment_deliveries
            await increment_deliveries(db, claim.assigned_driver_id)
    elif target_status == RequestStatus.CANCELLED:
        if not (is_donor or is_receiver or is_driver):
            raise ValueError("You cannot cancel this claim")
        claim.status = RequestStatus.CANCELLED
        claim.assigned_driver_id = None
        claim.delivery_mode = donation.delivery_preference
        donation.status = DonationStatus.AVAILABLE
    elif target_status == RequestStatus.APPROVED:
        if not (is_donor or is_receiver):
            raise ValueError("You cannot reopen this claim")
        claim.status = RequestStatus.APPROVED
        donation.status = DonationStatus.CLAIMED

    await db.flush()
    refreshed = await _get_claim_context(db, request_id)
    return _build_request_response(*refreshed)


async def get_my_claims(db: AsyncSession, receiver_id: int) -> List[RequestResponse]:
    query, _, _, _ = _context_query()
    result = await db.execute(
        query.where(DonationRequest.receiver_id == receiver_id).order_by(DonationRequest.created_at.desc())
    )
    return await _serialize_rows(result.all())


async def get_donation_claims(db: AsyncSession, donation_id: int) -> List[RequestResponse]:
    query, _, _, _ = _context_query()
    result = await db.execute(
        query.where(DonationRequest.donation_id == donation_id).order_by(DonationRequest.created_at.desc())
    )
    return await _serialize_rows(result.all())


async def get_donor_dispatches(db: AsyncSession, donor_id: int) -> List[RequestResponse]:
    query, donor_alias, _, _ = _context_query()
    result = await db.execute(
        query.where(
            and_(
                donor_alias.id == donor_id,
                DonationRequest.status.in_([
                    RequestStatus.APPROVED,
                    RequestStatus.DRIVER_REACHED,
                    RequestStatus.PICKED_UP,
                ]),
            )
        ).order_by(DonationRequest.claimed_at.desc())
    )
    return await _serialize_rows(result.all())


async def get_open_driver_jobs(db: AsyncSession, user_id: int) -> List[RequestResponse]:
    query, donor_alias, receiver_alias, _ = _context_query()
    result = await db.execute(
        query.where(
            and_(
                DonationRequest.status == RequestStatus.APPROVED,
                DonationRequest.assigned_driver_id.is_(None),
                DonationRequest.delivery_mode.in_(["driver", "flex"]),
                donor_alias.id != user_id,
                receiver_alias.id != user_id,
                receiver_alias.latitude.isnot(None),
                receiver_alias.longitude.isnot(None),
            )
        ).order_by(DonationRequest.claimed_at.desc())
    )
    return await _serialize_rows(result.all())


async def get_my_driver_jobs(db: AsyncSession, user_id: int) -> List[RequestResponse]:
    query, _, _, _ = _context_query()
    result = await db.execute(
        query.where(
            and_(
                DonationRequest.assigned_driver_id == user_id,
                DonationRequest.status.in_([
                    RequestStatus.APPROVED,
                    RequestStatus.DRIVER_REACHED,
                    RequestStatus.PICKED_UP,
                ]),
            )
        ).order_by(DonationRequest.claimed_at.desc())
    )
    return await _serialize_rows(result.all())


async def accept_driver_job(
    db: AsyncSession,
    request_id: int,
    user_id: int,
) -> RequestResponse:
    context = await _get_claim_context(db, request_id)
    if not context:
        raise ValueError("Claim not found")

    claim, donation, donor, receiver, driver = context
    if claim.status != RequestStatus.APPROVED:
        raise ValueError("Only active approved claims can be accepted")
    if claim.delivery_mode not in {"driver", "flex"}:
        raise ValueError("This delivery is donor-led")
    if claim.assigned_driver_id:
        raise ValueError("This delivery already has a driver assigned")
    if user_id in {donation.donor_id, claim.receiver_id}:
        raise ValueError("Use another account to act as the driver")

    claim.assigned_driver_id = user_id
    claim.delivery_mode = "driver"
    await db.flush()

    refreshed = await _get_claim_context(db, request_id)
    return _build_request_response(*refreshed)


async def set_donor_self_delivery(
    db: AsyncSession,
    request_id: int,
    donor_id: int,
) -> RequestResponse:
    context = await _get_claim_context(db, request_id)
    if not context:
        raise ValueError("Claim not found")

    claim, donation, donor, receiver, driver = context
    if donation.donor_id != donor_id:
        raise ValueError("Only the donor can switch to self-delivery")
    if claim.status != RequestStatus.APPROVED:
        raise ValueError("Only active approved claims can change delivery mode")
    if claim.assigned_driver_id:
        raise ValueError("A driver is already assigned to this delivery")

    claim.delivery_mode = "self"
    await db.flush()

    refreshed = await _get_claim_context(db, request_id)
    return _build_request_response(*refreshed)


async def update_driver_location(
    db: AsyncSession,
    request_id: int,
    driver_id: int,
    latitude: float,
    longitude: float,
) -> None:
    """Save the driver's current GPS coordinates on the request record."""
    result = await db.execute(select(DonationRequest).where(DonationRequest.id == request_id))
    claim = result.scalar_one_or_none()
    if not claim:
        return
    if claim.assigned_driver_id != driver_id:
        return  # Only the assigned driver can update their location
    claim.driver_latitude = latitude
    claim.driver_longitude = longitude
    await db.flush()


async def get_driver_location(
    db: AsyncSession,
    request_id: int,
) -> Optional[dict]:
    """Return the driver's latest GPS coordinates, or None if not yet set."""
    result = await db.execute(select(DonationRequest).where(DonationRequest.id == request_id))
    claim = result.scalar_one_or_none()
    if not claim or claim.driver_latitude is None:
        return None
    return {"latitude": claim.driver_latitude, "longitude": claim.driver_longitude}


async def get_claim(
    db: AsyncSession,
    request_id: int,
) -> Optional[RequestResponse]:
    """Retrieve details for a single claim/request by ID."""
    context = await _get_claim_context(db, request_id)
    if not context:
        return None
    return _build_request_response(*context)


