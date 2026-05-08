"""
ML schemas — hunger hotspot responses.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class HotspotCluster(BaseModel):
    cluster_id: int
    latitude: float
    longitude: float
    demand_score: float
    point_count: int
    radius_km: Optional[float] = None


class HotspotResponse(BaseModel):
    clusters: List[HotspotCluster]
    total_clusters: int
    generated_at: datetime
    coverage_summary: Optional[str] = None
