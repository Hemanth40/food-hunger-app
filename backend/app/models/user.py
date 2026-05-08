"""
User model — supports restaurant, user, ngo, volunteer roles.
"""

import enum
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    RESTAURANT = "restaurant"
    USER = "user"
    NGO = "ngo"
    VOLUNTEER = "volunteer"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    donations = relationship("Donation", back_populates="donor", lazy="selectin")
    donation_requests = relationship("DonationRequest", back_populates="receiver", lazy="selectin")
    notifications = relationship("Notification", back_populates="user", lazy="selectin")
    volunteer_profile = relationship("Volunteer", back_populates="user", uselist=False, lazy="selectin")

    def __repr__(self):
        return f"<User {self.id}: {self.full_name} ({self.role.value})>"
