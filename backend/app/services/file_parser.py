"""
File parsing service.
Handles CSV and JSON inspection data files with schema validation.
Designed to be swappable with parsers for proprietary ILI formats later.
"""

import io
import logging
from typing import List, Optional, Tuple
import pandas as pd

from app.schemas.analysis import RawDataRow

logger = logging.getLogger(__name__)

# Required columns (at minimum) for analysis
REQUIRED_COLUMNS = {"distance_m", "wall_thickness_mm", "nominal_thickness_mm"}

# Optional columns with defaults
OPTIONAL_COLUMNS = {
    "signal_strength": 0.0,
    "anomaly_index": 0.0,
    "temperature_c": None,
    "pressure_bar": None,
}

# Column aliases (common alternative names in real ILI datasets)
COLUMN_ALIASES: dict[str, list[str]] = {
    "distance_m": ["dist_m", "position_m", "chainage_m", "distance", "km_marker"],
    "wall_thickness_mm": ["wt_mm", "thickness_mm", "wt", "remaining_wt", "wall_thickness"],
    "nominal_thickness_mm": ["nom_thickness", "nominal_wt", "nom_wt", "design_thickness"],
    "signal_strength": ["signal", "sig", "mfl_signal", "amplitude"],
    "anomaly_index": ["anomaly", "ai", "defect_index", "anomaly_score"],
    "temperature_c": ["temp_c", "temperature", "temp"],
    "pressure_bar": ["pressure", "press_bar", "operating_pressure"],
}


def normalize_column_name(name: str) -> str:
    """Lowercase, strip, replace spaces/hyphens with underscores."""
    return name.lower().strip().replace(" ", "_").replace("-", "_")


def resolve_column_aliases(df: pd.DataFrame) -> pd.DataFrame:
    """Rename aliased columns to canonical names."""
    normalized = {normalize_column_name(c): c for c in df.columns}
    df.columns = [normalize_column_name(c) for c in df.columns]

    for canonical, aliases in COLUMN_ALIASES.items():
        if canonical not in df.columns:
            for alias in aliases:
                if normalize_column_name(alias) in df.columns:
                    df = df.rename(columns={normalize_column_name(alias): canonical})
                    logger.debug(f"Resolved column alias: {alias} → {canonical}")
                    break
    return df


def parse_file(
    content: bytes,
    filename: str,
) -> Tuple[List[RawDataRow], dict]:
    """
    Parse a CSV or JSON file into a list of RawDataRow objects.
    Returns (rows, metadata_dict).
    Raises ValueError on schema validation failure.
    """
    lower_name = filename.lower()

    if lower_name.endswith(".csv") or lower_name.endswith(".txt"):
        df = _parse_csv(content)
    elif lower_name.endswith(".json"):
        df = _parse_json(content)
    else:
        raise ValueError(f"Unsupported file format: {filename}. Expected .csv, .txt, or .json")

    df = resolve_column_aliases(df)
    _validate_schema(df, filename)
    df = _clean_dataframe(df)

    rows = _dataframe_to_rows(df)
    metadata = {
        "row_count": len(rows),
        "column_names": list(df.columns),
        "distance_range_m": [
            float(df["distance_m"].min()),
            float(df["distance_m"].max()),
        ],
        "filename": filename,
    }

    logger.info(f"Parsed {len(rows)} rows from {filename}")
    return rows, metadata


def _parse_csv(content: bytes) -> pd.DataFrame:
    try:
        return pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise ValueError(f"Failed to parse CSV: {e}")


def _parse_json(content: bytes) -> pd.DataFrame:
    try:
        return pd.read_json(io.BytesIO(content))
    except Exception as e:
        raise ValueError(f"Failed to parse JSON: {e}")


def _validate_schema(df: pd.DataFrame, filename: str) -> None:
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(
            f"Missing required columns in {filename}: {', '.join(sorted(missing))}. "
            f"Found: {', '.join(df.columns)}"
        )
    if len(df) == 0:
        raise ValueError(f"File {filename} contains no data rows.")


def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce types, fill defaults, drop unrecoverable rows."""
    # Fill optional columns with defaults
    for col, default in OPTIONAL_COLUMNS.items():
        if col not in df.columns:
            df[col] = default
        elif default is not None:
            df[col] = df[col].fillna(default)

    # Coerce numeric columns
    numeric_cols = [
        "distance_m", "wall_thickness_mm", "nominal_thickness_mm",
        "signal_strength", "anomaly_index",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Drop rows where required numerics are NaN
    before = len(df)
    df = df.dropna(subset=["distance_m", "wall_thickness_mm", "nominal_thickness_mm"])
    dropped = before - len(df)
    if dropped > 0:
        logger.warning(f"Dropped {dropped} rows with missing required values")

    # Sanity clamps
    df["signal_strength"] = df["signal_strength"].clip(0.0, 1.0).fillna(0.0)
    df["anomaly_index"] = df["anomaly_index"].clip(0.0, 1.0).fillna(0.0)
    df["wall_thickness_mm"] = df["wall_thickness_mm"].clip(0.01, 1000.0)
    df["nominal_thickness_mm"] = df["nominal_thickness_mm"].clip(0.01, 1000.0)

    # Sort by distance
    df = df.sort_values("distance_m").reset_index(drop=True)
    return df


def _dataframe_to_rows(df: pd.DataFrame) -> List[RawDataRow]:
    rows = []
    for _, row in df.iterrows():
        try:
            rows.append(RawDataRow(
                distance_m=float(row["distance_m"]),
                signal_strength=float(row.get("signal_strength", 0.0) or 0.0),
                wall_thickness_mm=float(row["wall_thickness_mm"]),
                nominal_thickness_mm=float(row["nominal_thickness_mm"]),
                anomaly_index=float(row.get("anomaly_index", 0.0) or 0.0),
                temperature_c=float(row["temperature_c"]) if pd.notna(row.get("temperature_c")) else None,
                pressure_bar=float(row["pressure_bar"]) if pd.notna(row.get("pressure_bar")) else None,
            ))
        except Exception as e:
            logger.debug(f"Skipping row due to parsing error: {e}")
    return rows
