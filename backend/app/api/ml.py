"""
ML API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.ml import HotspotResponse
from app.ml import hunger_predictor

router = APIRouter()

@router.get("/hotspots", response_model=HotspotResponse)
async def get_hotspots(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current hunger hotspots (re-runs predictor on demand for now, can cache later)."""
    try:
        return await hunger_predictor.predict_hunger_hotspots(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML prediction error: {str(e)}")

@router.post("/hotspots/refresh", response_model=HotspotResponse)
async def refresh_hotspots(
    current_user: dict = Depends(get_current_user),  # Could restrict to admin role here
    db: AsyncSession = Depends(get_db)
):
    """Force an update of the ML hotspots and persist them."""
    try:
        return await hunger_predictor.run_and_persist(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML prediction error: {str(e)}")
