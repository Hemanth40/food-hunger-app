"""
DonationRequest model for NGO claims and delivery assignment.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DRIVER_REACHED = "driver_reached"
    PICKED_UP = "picked_up"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class DonationRequest(Base):
    __tablename__ = "donation_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    donation_id: Mapped[int] = mapped_column(ForeignKey("donations.id"), nullable=False, index=True)
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    assigned_driver_id: Mapped[int | None] = mapped_column(nullable=True)
    delivery_mode: Mapped[str] = mapped_column(String(20), default="flex", nullable=False)
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus),
        default=RequestStatus.PENDING,
        nullable=False,
    )
    message: Mapped[str] = mapped_column(String(500), nullable=True)
    claimed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    driver_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    driver_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    donation = relationship("Donation", back_populates="requests", lazy="selectin")
    receiver = relationship("User", back_populates="donation_requests", lazy="selectin")

    def __repr__(self):
        return f"<DonationRequest {self.id}: donation={self.donation_id} status={self.status.value}>"
