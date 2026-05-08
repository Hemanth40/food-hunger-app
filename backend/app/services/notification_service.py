"""
Notification Service — create and manage in-app notifications.
"""

from typing import List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def create_notification(
    db: AsyncSession,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "general",
) -> Notification:
    """Create a new in-app notification."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
    )
    db.add(notif)
    await db.flush()
    return notif


async def get_user_notifications(
    db: AsyncSession,
    user_id: int,
    limit: int = 50,
    offset: int = 0,
) -> List[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def mark_as_read(db: AsyncSession, notification_id: int, user_id: int) -> Notification:
    result = await db.execute(
        select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == user_id)
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise ValueError("Notification not found")
    notif.is_read = True
    await db.flush()
    return notif


async def get_unread_count(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.count(Notification.id)).where(
            and_(Notification.user_id == user_id, Notification.is_read == False)
        )
    )
    return result.scalar() or 0


async def mark_all_read(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(Notification).where(
            and_(Notification.user_id == user_id, Notification.is_read == False)
        )
    )
    for notif in result.scalars().all():
        notif.is_read = True
    await db.flush()
