"""
Analysis job runner.
Orchestrates: fetch files → parse → analyze → persist results → update job status.
This is the core workflow engine called by the background worker.
"""

import logging
from datetime import datetime, timezone
from typing import List

from app.core.config import settings
from app.core.supabase import get_db
from app.schemas.analysis import (
    AnalysisParameters,
    ComputedDefect,
    SegmentSummary,
)
from app.services.analyzer import MockAnalyzer
from app.services.file_parser import parse_file

logger = logging.getLogger(__name__)

UTC = timezone.utc


def run_analysis_job(
    job_id: str,
    run_id: str,
    organization_id: str,
    pipeline_id: str,
    parameters: dict,
) -> None:
    """
    Full analysis pipeline for one inspection run.
    Called from background thread.

    Lifecycle:
        queued → processing → completed | failed
    """
    db = get_db()

    try:
        _update_job(db, job_id, {
            "status": "processing",
            "started_at": datetime.now(UTC).isoformat(),
            "progress_pct": 5,
        })
        _update_run_status(db, run_id, "processing")

        # 1. Load analysis parameters
        params = AnalysisParameters(
            segment_length_m=parameters.get("segment_length_m", settings.DEFAULT_SEGMENT_LENGTH_M),
            anomaly_threshold=parameters.get("anomaly_threshold", settings.DEFAULT_ANOMALY_THRESHOLD),
            depth_threshold_pct=parameters.get("depth_threshold_pct", settings.DEFAULT_DEPTH_THRESHOLD_PCT),
        )
        logger.info(f"[job:{job_id}] Parameters: {params}")

        # 2. Fetch uploaded file records
        files_resp = db.table("uploaded_files")\
            .select("*")\
            .eq("run_id", run_id)\
            .execute()

        file_records = files_resp.data
        if not file_records:
            raise RuntimeError("No files found for this run.")

        _update_job(db, job_id, {"progress_pct": 15})

        # 3. Download and parse files
        all_rows = []
        for idx, file_record in enumerate(file_records):
            logger.info(f"[job:{job_id}] Fetching file {file_record['filename']}")
            try:
                raw_bytes = db.storage\
                    .from_(settings.RAW_INSPECTIONS_BUCKET)\
                    .download(file_record["storage_path"])

                rows, meta = parse_file(raw_bytes, file_record["original_name"])
                all_rows.extend(rows)
                logger.info(f"[job:{job_id}] Parsed {len(rows)} rows from {file_record['filename']}")

                # Update file metadata
                db.table("uploaded_files").update({
                    "processing_state": "processed",
                    "row_count": meta["row_count"],
                    "column_names": meta["column_names"],
                }).eq("id", file_record["id"]).execute()

            except Exception as e:
                logger.error(f"[job:{job_id}] Failed to parse {file_record['filename']}: {e}")
                db.table("uploaded_files").update({
                    "processing_state": "error",
                    "error_message": str(e),
                }).eq("id", file_record["id"]).execute()
                # Continue with other files if any

        if not all_rows:
            raise RuntimeError("No data rows could be parsed from uploaded files.")

        logger.info(f"[job:{job_id}] Total rows to analyze: {len(all_rows)}")
        _update_job(db, job_id, {"progress_pct": 40})

        # 4. Run analysis
        analyzer = MockAnalyzer(params=params)
        defects, segments = analyzer.analyze_rows(all_rows)

        _update_job(db, job_id, {"progress_pct": 70})
        logger.info(f"[job:{job_id}] Analysis done: {len(defects)} defects, {len(segments)} segments")

        # 5. Delete any previous results for this run (re-run scenario)
        db.table("defects").delete().eq("run_id", run_id).execute()
        db.table("segment_risk_scores").delete().eq("run_id", run_id).execute()

        # 6. Persist defects in batches
        _persist_defects(db, defects, job_id, run_id, organization_id, pipeline_id)
        _update_job(db, job_id, {"progress_pct": 85})

        # 7. Persist segment summaries
        _persist_segments(db, segments, job_id, run_id, organization_id, pipeline_id)
        _update_job(db, job_id, {"progress_pct": 95})

        # 8. Mark complete
        _update_job(db, job_id, {
            "status": "completed",
            "progress_pct": 100,
            "defects_found": len(defects),
            "segments_analyzed": len(segments),
            "completed_at": datetime.now(UTC).isoformat(),
        })
        _update_run_status(db, run_id, "completed")
        logger.info(f"[job:{job_id}] Job completed successfully.")

    except Exception as e:
        logger.error(f"[job:{job_id}] Job failed: {e}", exc_info=True)
        _update_job(db, job_id, {
            "status": "failed",
            "error_message": str(e),
            "completed_at": datetime.now(UTC).isoformat(),
        })
        _update_run_status(db, run_id, "failed")


def _update_job(db, job_id: str, data: dict) -> None:
    db.table("analysis_jobs").update(data).eq("id", job_id).execute()


def _update_run_status(db, run_id: str, status: str) -> None:
    db.table("inspection_runs").update({"status": status}).eq("id", run_id).execute()


def _persist_defects(
    db,
    defects: List[ComputedDefect],
    job_id: str,
    run_id: str,
    organization_id: str,
    pipeline_id: str,
    batch_size: int = 200,
) -> None:
    if not defects:
        return

    records = [
        {
            "organization_id": organization_id,
            "run_id": run_id,
            "job_id": job_id,
            "pipeline_id": pipeline_id,
            "distance_from_start_m": d.distance_from_start_m,
            "defect_type": d.defect_type.value,
            "length_mm": d.length_mm,
            "width_mm": d.width_mm,
            "depth_mm": d.depth_mm,
            "depth_percent": d.depth_percent,
            "corrosion_probability": d.corrosion_probability,
            "severity_level": d.severity_level.value,
            "confidence_score": d.confidence_score,
            "risk_score": d.risk_score,
            "signal_strength": d.signal_strength,
            "anomaly_index": d.anomaly_index,
            "wall_thickness_mm": d.wall_thickness_mm,
            "nominal_thickness_mm": d.nominal_thickness_mm,
            "segment_label": d.segment_label,
        }
        for d in defects
    ]

    # Insert in batches to avoid payload size limits
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        db.table("defects").insert(batch).execute()
        logger.debug(f"Inserted defect batch {i // batch_size + 1} ({len(batch)} records)")


def _persist_segments(
    db,
    segments: List[SegmentSummary],
    job_id: str,
    run_id: str,
    organization_id: str,
    pipeline_id: str,
) -> None:
    if not segments:
        return

    records = [
        {
            "organization_id": organization_id,
            "run_id": run_id,
            "job_id": job_id,
            "pipeline_id": pipeline_id,
            "segment_label": s.segment_label,
            "segment_start_m": s.segment_start_m,
            "segment_end_m": s.segment_end_m,
            "defect_count": s.defect_count,
            "dominant_severity": s.dominant_severity.value if s.dominant_severity else None,
            "max_depth_percent": s.max_depth_percent,
            "avg_depth_percent": s.avg_depth_percent,
            "avg_corrosion_probability": s.avg_corrosion_probability,
            "max_corrosion_probability": s.max_corrosion_probability,
            "aggregated_risk_score": s.aggregated_risk_score,
            "critical_defect_count": s.critical_defect_count,
            "high_defect_count": s.high_defect_count,
        }
        for s in segments
    ]

    db.table("segment_risk_scores").insert(records).execute()
    logger.debug(f"Inserted {len(records)} segment summaries")
