"""Application configuration loaded from environment variables."""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Service identity
    ANALYZER_VERSION: str = "mock-v1"
    SERVICE_KEY: str = ""  # Shared secret with frontend

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Analysis parameters (defaults)
    DEFAULT_SEGMENT_LENGTH_M: float = 100.0
    DEFAULT_ANOMALY_THRESHOLD: float = 0.3
    DEFAULT_DEPTH_THRESHOLD_PCT: float = 10.0

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "https://your-app.vercel.app"]

    # Storage
    RAW_INSPECTIONS_BUCKET: str = "raw-inspections"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
