"""
Food Hunger App core configuration.
Loads settings from environment variables via pydantic-settings.
"""

from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./foodhunger.db"
    DATABASE_URL_SYNC: str = "sqlite:///./foodhunger.db"

    @property
    def async_database_url(self) -> str:
        """Return async-compatible DB URL. Converts Render's postgres:// to asyncpg format."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://") and "+asyncpg" not in url:
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    OTP_EXPIRE_SECONDS: int = 300
    OTP_LENGTH: int = 6
    DEV_MODE: bool = False
    DEV_OTP: str = "123456"

    # TextBee.dev Integration
    TEXTBEE_API_KEY: str = ""
    TEXTBEE_DEVICE_ID: str = ""

    # Twilio Verify (kept as fallback)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_VERIFY_SERVICE_SID: str = ""

    # Firebase Phone Auth
    USE_FIREBASE_AUTH: bool = False
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:19006,http://localhost:8081,exp://localhost:8081"

    ML_CLUSTER_RADIUS_KM: float = 2.0
    ML_MIN_SAMPLES: int = 5
    ML_RERUN_HOURS: int = 6

    DONATION_EXPIRY_CHECK_MINUTES: int = 5

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_flag(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "production", "prod"}:
                return False
        return value

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
