"""GET /jobs/{job_id} — Job status polling endpoint."""

import logging
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional

from app.core.config import settings
from app.core.supabase import get_db
from app.schemas.analysis import JobStatusResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def verify_service_key(x_service_key: Optional[str] = Header(default=None)):
    if settings.SERVICE_KEY and x_service_key != settings.SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Invalid service key")


@router.get(
    "/jobs/{job_id}",
    response_model=JobStatusResponse,
    dependencies=[Depends(verify_service_key)],
)
async def get_job_status(job_id: str):
    """
    Poll the status of an analysis job.

    Response:
        {
            "job_id": "uuid",
            "status": "processing",
            "progress_pct": 70,
            "defects_found": 0,
            "segments_analyzed": 0,
            "error_message": null,
            "started_at": "2024-03-15T10:00:00Z",
            "completed_at": null
        }
    """
    db = get_db()
    resp = db.table("analysis_jobs").select("*").eq("id", job_id).single().execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    job = resp.data
    return JobStatusResponse(
        job_id=job["id"],
        status=job["status"],
        progress_pct=job.get("progress_pct", 0),
        defects_found=job.get("defects_found", 0),
        segments_analyzed=job.get("segments_analyzed", 0),
        error_message=job.get("error_message"),
        started_at=job.get("started_at"),
        completed_at=job.get("completed_at"),
    )
