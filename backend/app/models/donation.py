"""
Donation model for food rescue listings.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DonationStatus(str, enum.Enum):
    AVAILABLE = "available"
    CLAIMED = "claimed"
    PICKED_UP = "picked_up"
    DELIVERED = "delivered"
    EXPIRED = "expired"


class Donation(Base):
    __tablename__ = "donations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    donor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    food_type: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    image_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=True)
    image_mime_type: Mapped[str] = mapped_column(String(50), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    pickup_address: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_preference: Mapped[str] = mapped_column(String(20), default="flex", nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[DonationStatus] = mapped_column(
        Enum(DonationStatus),
        default=DonationStatus.AVAILABLE,
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    donor = relationship("User", back_populates="donations", lazy="selectin")
    requests = relationship("DonationRequest", back_populates="donation", lazy="selectin")

    def __repr__(self):
        return f"<Donation {self.id}: {self.food_type} ({self.status.value})>"
