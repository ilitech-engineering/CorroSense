"""
CorroSense Analysis Service
FastAPI backend for pipeline inspection data analysis.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, jobs, analyze
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CorroSense Analysis Service starting up")
    logger.info(f"Analyzer version: {settings.ANALYZER_VERSION}")
    yield
    logger.info("CorroSense Analysis Service shutting down")


app = FastAPI(
    title="CorroSense Analysis Service",
    description="Pipeline inspection data analysis engine for CorroSense.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(analyze.router, tags=["Analysis"])
app.include_router(jobs.router, tags=["Jobs"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
