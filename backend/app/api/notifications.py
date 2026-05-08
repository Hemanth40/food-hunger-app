"""
Notifications API Routes
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.services import notification_service

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await notification_service.get_user_notifications(
        db, current_user["user_id"], limit, offset
    )

@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    count = await notification_service.get_unread_count(db, current_user["user_id"])
    return {"count": count}

@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        return await notification_service.mark_as_read(
            db, notification_id, current_user["user_id"]
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/read-all")
async def mark_all_read(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await notification_service.mark_all_read(db, current_user["user_id"])
    return {"message": "All marked as read"}
