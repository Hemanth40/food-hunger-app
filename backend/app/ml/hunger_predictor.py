"""
Hunger Hotspot Predictor — DBSCAN clustering on donation/claim coordinates.

Uses haversine metric for geospatial clustering to identify
repeated hunger demand zones and suggested food drive areas.
"""

import numpy as np
from datetime import datetime, timezone
from typing import List, Optional

from sklearn.cluster import DBSCAN
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.donation import Donation, DonationStatus
from app.models.donation_request import DonationRequest
from app.models.critical_zone import CriticalZone
from app.schemas.ml import HotspotCluster, HotspotResponse
from app.core.config import settings


EARTH_RADIUS_KM = 6371.0


async def collect_coordinates(db: AsyncSession) -> np.ndarray:
    """
    Collect all donation and claim coordinates for clustering.
    Weight claimed/delivered donations more heavily by duplicating their coordinates.
    """
    coords = []

    # Get all donation coordinates
    result = await db.execute(select(Donation.latitude, Donation.longitude, Donation.status))
    for lat, lon, status in result.all():
        if lat is not None and lon is not None:
            coords.append([lat, lon])
            # Weight delivered donations (higher demand signal)
            if status in (DonationStatus.CLAIMED, DonationStatus.DELIVERED):
                coords.append([lat, lon])
                coords.append([lat, lon])

    # Get claim coordinates (receiver locations from donation_requests)
    result = await db.execute(
        select(Donation.latitude, Donation.longitude)
        .join(DonationRequest, DonationRequest.donation_id == Donation.id)
        .where(DonationRequest.status.in_(["approved", "delivered"]))
    )
    for lat, lon in result.all():
        if lat is not None and lon is not None:
            coords.append([lat, lon])

    return np.array(coords) if coords else np.array([]).reshape(0, 2)


def run_dbscan_clustering(
    coordinates: np.ndarray,
    radius_km: float = None,
    min_samples: int = None,
) -> List[HotspotCluster]:
    """
    Run DBSCAN clustering with haversine metric.
    Returns list of cluster centroids with demand scores.
    """
    if len(coordinates) < 2:
        return []

    radius_km = radius_km or settings.ML_CLUSTER_RADIUS_KM
    min_samples = min_samples or settings.ML_MIN_SAMPLES

    # Convert to radians for haversine metric
    coords_radians = np.radians(coordinates)

    # eps in radians = km / Earth radius
    epsilon = radius_km / EARTH_RADIUS_KM

    # Run DBSCAN
    db = DBSCAN(
        eps=epsilon,
        min_samples=min_samples,
        metric="haversine",
        algorithm="ball_tree",
    )
    labels = db.fit_predict(coords_radians)

    # Process clusters (ignore noise labeled as -1)
    clusters = []
    unique_labels = set(labels)
    unique_labels.discard(-1)

    for label in unique_labels:
        mask = labels == label
        cluster_points = coordinates[mask]

        centroid_lat = float(np.mean(cluster_points[:, 0]))
        centroid_lon = float(np.mean(cluster_points[:, 1]))
        point_count = int(np.sum(mask))

        # Demand score: combination of point density and cluster size
        demand_score = round(point_count * (1.0 / max(radius_km, 0.1)), 2)

        # Calculate actual cluster radius
        if len(cluster_points) > 1:
            distances_from_centroid = np.sqrt(
                (cluster_points[:, 0] - centroid_lat) ** 2 +
                (cluster_points[:, 1] - centroid_lon) ** 2
            ) * 111.0  # rough km conversion
            actual_radius = float(np.max(distances_from_centroid))
        else:
            actual_radius = 0.0

        clusters.append(HotspotCluster(
            cluster_id=int(label),
            latitude=centroid_lat,
            longitude=centroid_lon,
            demand_score=demand_score,
            point_count=point_count,
            radius_km=round(actual_radius, 2),
        ))

    # Sort by demand score desc
    clusters.sort(key=lambda c: c.demand_score, reverse=True)
    return clusters


async def predict_hunger_hotspots(db: AsyncSession) -> HotspotResponse:
    """
    Main entry point: collect data, run DBSCAN, return response.
    """
    coordinates = await collect_coordinates(db)
    clusters = run_dbscan_clustering(coordinates)

    return HotspotResponse(
        clusters=clusters,
        total_clusters=len(clusters),
        generated_at=datetime.now(timezone.utc),
        coverage_summary=f"Analyzed {len(coordinates)} data points, found {len(clusters)} demand zones",
    )


async def persist_hotspots(db: AsyncSession, clusters: List[HotspotCluster]):
    """Save clusters to critical_zones table, replacing old data."""
    # Clear old zones
    result = await db.execute(select(CriticalZone))
    for zone in result.scalars().all():
        await db.delete(zone)

    # Insert new zones
    for cluster in clusters:
        zone = CriticalZone(
            cluster_latitude=cluster.latitude,
            cluster_longitude=cluster.longitude,
            demand_score=cluster.demand_score,
            point_count=cluster.point_count,
            radius_km=cluster.radius_km,
        )
        db.add(zone)

    await db.flush()


async def run_and_persist(db: AsyncSession) -> HotspotResponse:
    """Run ML prediction and persist results."""
    response = await predict_hunger_hotspots(db)
    await persist_hotspots(db, response.clusters)
    return response
