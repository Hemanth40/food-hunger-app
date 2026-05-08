"""
Food Hunger App — Scheduler setup
Handles recurring background tasks using APScheduler.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import logging

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services.donation_service import expire_old_donations
from app.ml.hunger_predictor import run_and_persist

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def scheduled_expire_donations():
    """Job to mark old donations as EXPIRED."""
    try:
        async with AsyncSessionLocal() as session:
            count = await expire_old_donations(session)
            await session.commit()
            if count > 0:
                logger.info(f"Scheduler: Expired {count} donations.")
    except Exception as e:
        logger.error(f"Error in scheduled_expire_donations: {e}")


async def scheduled_ml_hotspots():
    """Job to recalculate hunger hotspots."""
    try:
        async with AsyncSessionLocal() as session:
            response = await run_and_persist(session)
            await session.commit()
            logger.info(f"Scheduler: ML hotspots updated. Found {response.total_clusters} zones.")
    except Exception as e:
        logger.error(f"Error in scheduled_ml_hotspots: {e}")


def start_scheduler():
    """Configure and start the background scheduler."""
    # Run expiry check (e.g., every 5 minutes by default)
    scheduler.add_job(
        scheduled_expire_donations,
        trigger=IntervalTrigger(minutes=settings.DONATION_EXPIRY_CHECK_MINUTES),
        id="expire_donations",
        name="Expire old donations",
        replace_existing=True,
    )

    # Run ML clustering (e.g., every 6 hours by default)
    scheduler.add_job(
        scheduled_ml_hotspots,
        trigger=IntervalTrigger(hours=settings.ML_RERUN_HOURS),
        id="recalc_hotspots",
        name="Recalculate ML hotspots",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Background scheduler started.")


def stop_scheduler():
    """Stop the scheduler."""
    scheduler.shutdown()
    logger.info("Background scheduler stopped.")
