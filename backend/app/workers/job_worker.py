"""
Background job worker.
Uses a ThreadPoolExecutor to process analysis jobs asynchronously.
For higher scale, replace with Celery + Redis or ARQ.
"""

import logging
from concurrent.futures import ThreadPoolExecutor

from app.services.job_runner import run_analysis_job

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="analyzer")


def submit_analysis_job(
    job_id: str,
    run_id: str,
    organization_id: str,
    pipeline_id: str,
    parameters: dict,
) -> None:
    """Submit an analysis job to the background thread pool."""
    logger.info(f"Submitting job {job_id} to thread pool")
    future = _executor.submit(
        run_analysis_job,
        job_id=job_id,
        run_id=run_id,
        organization_id=organization_id,
        pipeline_id=pipeline_id,
        parameters=parameters,
    )

    def _on_done(f):
        exc = f.exception()
        if exc:
            logger.error(f"Job {job_id} raised unhandled exception: {exc}")
        else:
            logger.info(f"Job {job_id} thread completed cleanly")

    future.add_done_callback(_on_done)
