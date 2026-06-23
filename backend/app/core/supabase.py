"""Supabase client singleton for the analysis service."""

import logging
from functools import lru_cache
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache()
def get_supabase() -> Client:
    """Return a service-role Supabase client (bypasses RLS)."""
    client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )
    logger.info("Supabase service client initialized")
    return client


def get_db() -> Client:
    return get_supabase()
