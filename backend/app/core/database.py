"""
Food Hunger App async database engine and session helpers.
"""

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(
    settings.async_database_url,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


DEV_SCHEMA_PATCHES = {
    "donations": {
        "delivery_preference": "VARCHAR(20) NOT NULL DEFAULT 'flex'",
    },
    "donation_requests": {
        "assigned_driver_id": "INTEGER",
        "delivery_mode": "VARCHAR(20) NOT NULL DEFAULT 'flex'",
    },
}


def apply_dev_schema_patches(sync_conn):
    """
    Lightweight additive migrations for the local prototype database.
    This keeps the checked-in SQLite DB usable without Alembic.
    """
    inspector = inspect(sync_conn)

    for table_name, columns in DEV_SCHEMA_PATCHES.items():
        if not inspector.has_table(table_name):
            continue

        existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
        for column_name, ddl in columns.items():
            if column_name in existing_columns:
                continue
            sync_conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        from app.models import critical_zone, donation, donation_request, notification, user, volunteer  # noqa

        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(apply_dev_schema_patches)
        
    # Safe ALTER TYPE outside transaction block for PostgreSQL
    if "postgres" in str(engine.url):
        try:
            async with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                await conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'driver_reached'"))
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Could not alter enum requeststatus: {e}")


async def close_db():
    await engine.dispose()
