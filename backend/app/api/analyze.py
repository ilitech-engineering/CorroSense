"""
POST /analyze-run
Receives analysis job request from Next.js, validates it,
and dispatches to background worker.
"""

import logging
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional

from app.core.config import settings
from app.schemas.analysis import AnalyzeRunRequest, AnalyzeRunResponse
from app.workers.job_worker import submit_analysis_job

logger = logging.getLogger(__name__)
router = APIRouter()


def verify_service_key(x_service_key: Optional[str] = Header(default=None)):
    """Validate the shared service key from the frontend."""
    if settings.SERVICE_KEY and x_service_key != settings.SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Invalid service key")


@router.post(
    "/analyze-run",
    response_model=AnalyzeRunResponse,
    status_code=202,
    dependencies=[Depends(verify_service_key)],
)
async def analyze_run(request: AnalyzeRunRequest):
    """
    Trigger an asynchronous analysis job.

    Request:
        {
            "job_id": "uuid",
            "run_id": "uuid",
            "organization_id": "uuid",
            "pipeline_id": "uuid",
            "parameters": { "segment_length_m": 100.0 }
        }

    Response (202 Accepted):
        {
            "job_id": "uuid",
            "status": "queued",
            "message": "Analysis job accepted"
        }
    """
    logger.info(f"Received analyze-run request: job={request.job_id} run={request.run_id}")

    submit_analysis_job(
        job_id=request.job_id,
        run_id=request.run_id,
        organization_id=request.organization_id,
        pipeline_id=request.pipeline_id,
        parameters=request.parameters or {},
    )

    return AnalyzeRunResponse(
        job_id=request.job_id,
        status="queued",
        message="Analysis job accepted and queued for processing.",
    )
