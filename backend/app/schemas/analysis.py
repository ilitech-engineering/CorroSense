"""Pydantic schemas for the CorroSense analysis service API."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class JobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class SeverityLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class DefectType(str, Enum):
    corrosion = "corrosion"
    metal_loss = "metal_loss"
    anomaly = "anomaly"
    crack = "crack"
    dent = "dent"
    other = "other"


# ── Request Schemas ──────────────────────────────────────────

class AnalyzeRunRequest(BaseModel):
    """Payload sent from Next.js to trigger analysis."""
    job_id: str = Field(..., description="Pre-created job UUID in Supabase")
    run_id: str = Field(..., description="Inspection run UUID")
    organization_id: str = Field(..., description="Organization UUID")
    pipeline_id: str = Field(..., description="Pipeline UUID")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AnalysisParameters(BaseModel):
    """Configurable parameters for the analysis engine."""
    segment_length_m: float = Field(default=100.0, ge=10.0, le=5000.0)
    anomaly_threshold: float = Field(default=0.3, ge=0.0, le=1.0)
    depth_threshold_pct: float = Field(default=10.0, ge=0.0, le=100.0)
    min_signal_for_anomaly: float = Field(default=0.25, ge=0.0, le=1.0)


# ── Response Schemas ─────────────────────────────────────────

class AnalyzeRunResponse(BaseModel):
    job_id: str
    status: JobStatus
    message: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress_pct: int
    defects_found: int
    segments_analyzed: int
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    supabase_connected: bool
    timestamp: datetime


# ── Internal data models (not exposed as API) ────────────────

class RawDataRow(BaseModel):
    """One row parsed from an uploaded CSV inspection file."""
    distance_m: float
    signal_strength: float = 0.0
    wall_thickness_mm: float
    nominal_thickness_mm: float
    anomaly_index: float = 0.0
    temperature_c: Optional[float] = None
    pressure_bar: Optional[float] = None


class ComputedDefect(BaseModel):
    """Fully computed defect record ready to persist."""
    distance_from_start_m: float
    defect_type: DefectType
    length_mm: Optional[float]
    width_mm: Optional[float]
    depth_mm: float
    depth_percent: float
    corrosion_probability: float
    severity_level: SeverityLevel
    confidence_score: float
    risk_score: float
    signal_strength: float
    anomaly_index: float
    wall_thickness_mm: float
    nominal_thickness_mm: float
    segment_label: str


class SegmentSummary(BaseModel):
    """Aggregated per-segment risk metrics."""
    segment_label: str
    segment_start_m: float
    segment_end_m: float
    defect_count: int
    dominant_severity: Optional[SeverityLevel]
    max_depth_percent: Optional[float]
    avg_depth_percent: Optional[float]
    avg_corrosion_probability: Optional[float]
    max_corrosion_probability: Optional[float]
    aggregated_risk_score: Optional[float]
    critical_defect_count: int
    high_defect_count: int
