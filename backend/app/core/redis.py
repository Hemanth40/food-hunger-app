"""
Food Hunger App — Redis Client
Handles OTP storage, caching, and pub/sub for real-time features.
"""

import json
from typing import Optional
import redis.asyncio as redis

from app.core.config import settings

redis_client: Optional[redis.Redis] = None


class MockRedis:
    def __init__(self):
        self.store = {}
    async def setex(self, key, time, value):
        self.store[key] = value
    async def get(self, key):
        return self.store.get(key)
    async def delete(self, key):
        self.store.pop(key, None)
    async def exists(self, key):
        return 1 if key in self.store else 0
    async def close(self):
        pass

async def init_redis() -> redis.Redis:
    global redis_client
    try:
        redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            ssl_cert_reqs=None,  # Required for Upstash TLS (rediss://)
        )
        # Test connection
        await redis_client.ping()
        print("Redis connected successfully!")
    except Exception as e:
        print(f"Failed to connect to Redis, using Mock fallback. Error: {e}")
        redis_client = MockRedis()
        
    return redis_client


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()


async def get_redis() -> redis.Redis:
    if redis_client is None:
        await init_redis()
    return redis_client


# ── OTP helpers ──

async def store_otp(identifier: str, otp: str):
    """Store OTP in Redis with TTL."""
    r = await get_redis()
    await r.setex(f"otp:{identifier}", settings.OTP_EXPIRE_SECONDS, otp)


async def verify_otp_from_store(identifier: str, otp: str) -> bool:
    """Verify OTP and delete on success."""
    r = await get_redis()
    stored = await r.get(f"otp:{identifier}")
    if stored and stored == otp:
        await r.delete(f"otp:{identifier}")
        return True
    return False


# ── Cache helpers ──

async def cache_set(key: str, value: dict, ttl: int = 300):
    r = await get_redis()
    await r.setex(key, ttl, json.dumps(value))


async def cache_get(key: str) -> Optional[dict]:
    r = await get_redis()
    data = await r.get(key)
    if data:
        return json.loads(data)
    return None


async def cache_delete(key: str):
    r = await get_redis()
    await r.delete(key)


# ── Refresh token blacklist ──

async def blacklist_token(token: str, ttl: int = 86400 * 7):
    r = await get_redis()
    await r.setex(f"blacklist:{token}", ttl, "1")


async def is_token_blacklisted(token: str) -> bool:
    r = await get_redis()
    return await r.exists(f"blacklist:{token}") > 0
