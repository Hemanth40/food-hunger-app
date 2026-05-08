"""
Food Hunger App — Main Application Entry Point
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.redis import init_redis, close_redis
from app.core.scheduler import start_scheduler, stop_scheduler
from app.core.websocket import manager
from app.core.security import decode_token

# Import routers
from app.api.auth import router as auth_router
from app.api.donations import router as donations_router
from app.api.requests import router as requests_router
from app.api.volunteers import router as volunteers_router
from app.api.notifications import router as notifications_router
from app.api.ml import router as ml_router
from app.api.health import router as health_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Silence noisy library loggers — only show warnings/errors from them
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
logging.getLogger("apscheduler").setLevel(logging.WARNING)



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for FastAPI application."""
    logger.info("Starting up Food Hunger App backend...")
    
    # Init DB and create tables (for dev)
    await init_db()
    
    # Init Redis
    await init_redis()
    
    # Start background scheduler
    start_scheduler()
    
    yield
    
    logger.info("Shutting down Food Hunger App backend...")
    stop_scheduler()
    await close_redis()
    await close_db()


app = FastAPI(
    title="Food Hunger App",
    description="API for the Food Hunger platform connecting donors, NGOs, and volunteers.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(health_router, tags=["Health"])
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(donations_router, prefix="/api/donations", tags=["Donations"])
app.include_router(requests_router, prefix="/api/requests", tags=["Requests"])
app.include_router(volunteers_router, prefix="/api/volunteers", tags=["Volunteers"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(ml_router, prefix="/api/ml", tags=["ML Predictions"])


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    WebSocket endpoint for real-time notifications.
    Client must provide JWT token in query string: ws://host/ws?token=...
    """
    try:
        # Validate token and extract user_id
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except Exception as e:
        logger.error(f"WebSocket auth failed: {e}")
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive; can accept messages from client if needed
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)

