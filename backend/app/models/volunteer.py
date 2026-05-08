"""
Volunteer model — tracks volunteer availability and ratings.
"""

from sqlalchemy import Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Volunteer(Base):
    __tablename__ = "volunteers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False, index=True)
    availability_status: Mapped[bool] = mapped_column(Boolean, default=True)
    rating: Mapped[float] = mapped_column(Float, default=5.0)
    total_deliveries: Mapped[int] = mapped_column(default=0)

    # Relationships
    user = relationship("User", back_populates="volunteer_profile", lazy="selectin")

    def __repr__(self):
        return f"<Volunteer {self.id}: user={self.user_id} available={self.availability_status}>"
