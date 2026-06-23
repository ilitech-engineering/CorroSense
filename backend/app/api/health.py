"""Health check endpoint."""

from datetime import datetime, timezone
from fastapi import APIRouter
from app.schemas.analysis import HealthResponse
from app.core.config import settings
from app.core.supabase import get_db

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Service liveness check. Verifies Supabase connectivity."""
    supabase_ok = False
    try:
        db = get_db()
        db.table("organizations").select("id").limit(1).execute()
        supabase_ok = True
    except Exception:
        supabase_ok = False

    return HealthResponse(
        status="ok" if supabase_ok else "degraded",
        version=settings.ANALYZER_VERSION,
        supabase_connected=supabase_ok,
        timestamp=datetime.now(timezone.utc),
    )
