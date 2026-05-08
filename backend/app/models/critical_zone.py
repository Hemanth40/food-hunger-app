"""
CriticalZone model — ML-detected hunger demand hotspots.
"""

from datetime import datetime, timezone
from sqlalchemy import Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class CriticalZone(Base):
    __tablename__ = "critical_zones"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    cluster_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    cluster_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    demand_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    point_count: Mapped[int] = mapped_column(default=0)
    radius_km: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self):
        return f"<CriticalZone {self.id}: score={self.demand_score}>"
