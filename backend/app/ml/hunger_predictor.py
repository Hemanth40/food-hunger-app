"""
Hunger Hotspot Predictor — Pure Python clustering on donation/claim coordinates.

Uses haversine distance for geospatial clustering to identify
repeated hunger demand zones — no external ML libraries required.
"""

import math
from datetime import datetime, timezone
from typing import List, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.donation import Donation, DonationStatus
from app.models.donation_request import DonationRequest
from app.models.critical_zone import CriticalZone
from app.schemas.ml import HotspotCluster, HotspotResponse
from app.core.config import settings

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two GPS coordinates."""
    r = EARTH_RADIUS_KM
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def pure_python_dbscan(
    coords: List[Tuple[float, float]],
    eps_km: float,
    min_samples: int,
) -> List[int]:
    """
    Simple DBSCAN implementation in pure Python using haversine distance.
    Returns a list of cluster labels (-1 = noise) for each point.
    """
    n = len(coords)
    labels = [-1] * n
    visited = [False] * n
    cluster_id = 0

    def get_neighbors(idx: int) -> List[int]:
        return [
            j for j in range(n)
            if haversine_km(coords[idx][0], coords[idx][1], coords[j][0], coords[j][1]) <= eps_km
        ]

    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True
        neighbors = get_neighbors(i)

        if len(neighbors) < min_samples:
            labels[i] = -1  # noise
            continue

        labels[i] = cluster_id
        seed_set = set(neighbors) - {i}

        while seed_set:
            j = seed_set.pop()
            if not visited[j]:
                visited[j] = True
                new_neighbors = get_neighbors(j)
                if len(new_neighbors) >= min_samples:
                    seed_set.update(new_neighbors)
            if labels[j] == -1:
                labels[j] = cluster_id

        cluster_id += 1

    return labels


async def collect_coordinates(db: AsyncSession) -> List[Tuple[float, float]]:
    """
    Collect all donation and claim coordinates.
    Weight claimed/delivered donations more heavily.
    """
    coords = []

    result = await db.execute(select(Donation.latitude, Donation.longitude, Donation.status))
    for lat, lon, status in result.all():
        if lat is not None and lon is not None:
            coords.append((lat, lon))
            if status in (DonationStatus.CLAIMED, DonationStatus.DELIVERED):
                coords.append((lat, lon))
                coords.append((lat, lon))

    result = await db.execute(
        select(Donation.latitude, Donation.longitude)
        .join(DonationRequest, DonationRequest.donation_id == Donation.id)
        .where(DonationRequest.status.in_(["approved", "delivered"]))
    )
    for lat, lon in result.all():
        if lat is not None and lon is not None:
            coords.append((lat, lon))

    return coords


def run_dbscan_clustering(
    coordinates: List[Tuple[float, float]],
    radius_km: float = None,
    min_samples: int = None,
) -> List[HotspotCluster]:
    """Run pure-Python DBSCAN and return cluster summaries."""
    if len(coordinates) < 2:
        return []

    radius_km = radius_km or settings.ML_CLUSTER_RADIUS_KM
    min_samples = min_samples or settings.ML_MIN_SAMPLES

    labels = pure_python_dbscan(coordinates, eps_km=radius_km, min_samples=min_samples)

    clusters = []
    unique_labels = set(l for l in labels if l != -1)

    for label in unique_labels:
        cluster_points = [coordinates[i] for i, l in enumerate(labels) if l == label]
        n = len(cluster_points)

        centroid_lat = sum(p[0] for p in cluster_points) / n
        centroid_lon = sum(p[1] for p in cluster_points) / n
        demand_score = round(n * (1.0 / max(radius_km, 0.1)), 2)

        if n > 1:
            distances = [
                haversine_km(p[0], p[1], centroid_lat, centroid_lon)
                for p in cluster_points
            ]
            actual_radius = round(max(distances), 2)
        else:
            actual_radius = 0.0

        clusters.append(HotspotCluster(
            cluster_id=label,
            latitude=centroid_lat,
            longitude=centroid_lon,
            demand_score=demand_score,
            point_count=n,
            radius_km=actual_radius,
        ))

    clusters.sort(key=lambda c: c.demand_score, reverse=True)
    return clusters


async def predict_hunger_hotspots(db: AsyncSession) -> HotspotResponse:
    coordinates = await collect_coordinates(db)
    clusters = run_dbscan_clustering(coordinates)

    return HotspotResponse(
        clusters=clusters,
        total_clusters=len(clusters),
        generated_at=datetime.now(timezone.utc),
        coverage_summary=f"Analyzed {len(coordinates)} data points, found {len(clusters)} demand zones",
    )


async def persist_hotspots(db: AsyncSession, clusters: List[HotspotCluster]):
    result = await db.execute(select(CriticalZone))
    for zone in result.scalars().all():
        await db.delete(zone)

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
    response = await predict_hunger_hotspots(db)
    await persist_hotspots(db, response.clusters)
    return response
