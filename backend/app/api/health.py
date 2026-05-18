"""
Health Check API Route
"""
from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.database import get_db

router = APIRouter()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Basic health check endpoint."""
    status = {"status": "ok"}
    try:
        # Check DB connection
        await db.execute(text("SELECT 1"))
        status["database"] = "connected"
    except Exception as e:
        status["database"] = f"error: {str(e)}"
        status["status"] = "degraded"
        
    return status

@router.get("/debug/schema")
async def debug_schema(db: AsyncSession = Depends(get_db)):
    try:
        res = await db.execute(text("PRAGMA table_info(donation_requests)"))
        cols = [dict(row._mapping) for row in res]
        return {"columns": cols}
    except Exception:
        try:
            res = await db.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'donation_requests'
            """))
            cols = [dict(row._mapping) for row in res]
            return {"columns": cols}
        except Exception as e2:
            return {"error": str(e2)}
