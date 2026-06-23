"""
CorroSense Mock Analyzer
========================
Deterministic, explainable, reproducible analysis engine.
Designed as Layer A (MVP) with clear extension points for Layer B (ML models).

FORMULAS DOCUMENTED:
---------------------
1. metal_loss_mm     = nominal_thickness_mm - wall_thickness_mm
2. depth_percent     = (metal_loss_mm / nominal_thickness_mm) * 100
3. norm_depth        = min(depth_percent / 80, 1.0)          # normalize to 0-1
4. norm_signal       = min(signal_strength, 1.0)              # already 0-1
5. norm_anomaly      = min(anomaly_index, 1.0)                # already 0-1

6. corrosion_probability =
     0.45 * norm_depth      (depth contribution – heaviest weight)
   + 0.35 * norm_anomaly    (anomaly index)
   + 0.20 * norm_signal     (signal strength)
   clipped to [0, 1]

7. severity_level:
   depth_percent < 10%         → low
   depth_percent 10–20%        → medium
   depth_percent 20–40%        → high
   depth_percent > 40%         → critical
   Override to critical if corrosion_probability > 0.90

8. confidence_score:
   base = 0.70
   +0.10 if anomaly_index > 0.5 and signal_strength > 0.4
   +0.10 if depth_percent > 20
   -0.15 if anomaly_index < 0.1
   clipped to [0.40, 0.98]

9. risk_score (0–100):
   severity_weight: low=0.2, medium=0.4, high=0.7, critical=1.0
   risk_score = 100 * (
       0.50 * corrosion_probability
     + 0.30 * (depth_percent / 100)
     + 0.20 * severity_weight
   ) * confidence_score

10. defect_type:
    depth_percent > 15 and anomaly > 0.5   → metal_loss
    anomaly > 0.3                           → corrosion
    else                                    → anomaly

11. dimensions:
    length_mm ≈ 30 + 200 * norm_depth + 50 * norm_signal
    width_mm  ≈ 15 + 80  * norm_depth + 20 * norm_anomaly

SEGMENT AGGREGATION:
    segment_label = f"SEG-{int(distance_m // segment_length_m) + 1}"
    aggregated_risk_score = 0.5 * max_risk + 0.3 * mean_risk + 0.2 * log(count+1)/log(10)
"""

import logging
import math
from typing import List, Optional, Tuple

from app.schemas.analysis import (
    RawDataRow,
    ComputedDefect,
    SegmentSummary,
    SeverityLevel,
    DefectType,
    AnalysisParameters,
)

logger = logging.getLogger(__name__)


# ── Constants ────────────────────────────────────────────────

SEVERITY_WEIGHTS: dict[str, float] = {
    "low": 0.2,
    "medium": 0.4,
    "high": 0.7,
    "critical": 1.0,
}

DEPTH_THRESHOLDS = {
    "critical": 40.0,
    "high": 20.0,
    "medium": 10.0,
}


# ── Main analyzer class ──────────────────────────────────────

class MockAnalyzer:
    """
    Layer A: Deterministic mock analyzer.
    Replace `analyze_row()` internals with real ML calls to upgrade to Layer B.
    """

    def __init__(self, params: AnalysisParameters):
        self.params = params

    def analyze_rows(
        self, rows: List[RawDataRow]
    ) -> Tuple[List[ComputedDefect], List[SegmentSummary]]:
        """
        Main entry point.
        Returns: (defects, segments)
        Only rows exceeding the depth/anomaly threshold are treated as defects.
        """
        defects: List[ComputedDefect] = []

        for row in rows:
            defect = self._analyze_row(row)
            if defect is not None:
                defects.append(defect)

        segments = self._aggregate_segments(defects)
        logger.info(f"Analysis complete: {len(defects)} defects, {len(segments)} segments")
        return defects, segments

    def _analyze_row(self, row: RawDataRow) -> Optional[ComputedDefect]:
        """
        Analyze a single data row.
        Returns a ComputedDefect if the row exceeds the defect threshold, else None.
        """
        # Step 1: Derived geometry
        metal_loss_mm = max(0.0, row.nominal_thickness_mm - row.wall_thickness_mm)
        depth_percent = (
            (metal_loss_mm / row.nominal_thickness_mm) * 100.0
            if row.nominal_thickness_mm > 0 else 0.0
        )

        # Early exit: below threshold means no defect at this point
        if (
            depth_percent < self.params.depth_threshold_pct
            and row.anomaly_index < self.params.anomaly_threshold
        ):
            return None

        # Step 2: Normalized inputs
        norm_depth = min(depth_percent / 80.0, 1.0)
        norm_signal = min(max(row.signal_strength, 0.0), 1.0)
        norm_anomaly = min(max(row.anomaly_index, 0.0), 1.0)

        # Step 3: Corrosion probability (formula §6)
        corrosion_probability = (
            0.45 * norm_depth
            + 0.35 * norm_anomaly
            + 0.20 * norm_signal
        )
        corrosion_probability = max(0.0, min(1.0, corrosion_probability))

        # Step 4: Severity (formula §7)
        severity = self._assign_severity(depth_percent, corrosion_probability)

        # Step 5: Confidence (formula §8)
        confidence = self._compute_confidence(row, depth_percent)

        # Step 6: Risk score (formula §9)
        risk_score = self._compute_risk_score(
            corrosion_probability, depth_percent, severity, confidence
        )

        # Step 7: Defect type (formula §10)
        defect_type = self._classify_defect_type(depth_percent, row.anomaly_index)

        # Step 8: Approximate physical dimensions (formula §11)
        length_mm = 30.0 + 200.0 * norm_depth + 50.0 * norm_signal
        width_mm = 15.0 + 80.0 * norm_depth + 20.0 * norm_anomaly

        # Step 9: Segment label
        segment_idx = int(row.distance_m // self.params.segment_length_m) + 1
        segment_label = f"SEG-{segment_idx}"

        return ComputedDefect(
            distance_from_start_m=row.distance_m,
            defect_type=defect_type,
            length_mm=round(length_mm, 2),
            width_mm=round(width_mm, 2),
            depth_mm=round(metal_loss_mm, 4),
            depth_percent=round(depth_percent, 3),
            corrosion_probability=round(corrosion_probability, 4),
            severity_level=severity,
            confidence_score=round(confidence, 4),
            risk_score=round(risk_score, 2),
            signal_strength=row.signal_strength,
            anomaly_index=row.anomaly_index,
            wall_thickness_mm=row.wall_thickness_mm,
            nominal_thickness_mm=row.nominal_thickness_mm,
            segment_label=segment_label,
        )

    def _assign_severity(
        self, depth_percent: float, corrosion_probability: float
    ) -> SeverityLevel:
        """Rule-based severity assignment (formula §7)."""
        if depth_percent > DEPTH_THRESHOLDS["critical"] or corrosion_probability > 0.90:
            return SeverityLevel.critical
        if depth_percent > DEPTH_THRESHOLDS["high"]:
            return SeverityLevel.high
        if depth_percent > DEPTH_THRESHOLDS["medium"]:
            return SeverityLevel.medium
        return SeverityLevel.low

    def _compute_confidence(self, row: RawDataRow, depth_percent: float) -> float:
        """Confidence score formula §8."""
        base = 0.70
        # High-quality signal: correlated anomaly and signal → more confident
        if row.anomaly_index > 0.5 and row.signal_strength > 0.4:
            base += 0.10
        # Significant wall loss → more clearly a real defect
        if depth_percent > 20.0:
            base += 0.10
        # Very weak anomaly → uncertain
        if row.anomaly_index < 0.1:
            base -= 0.15
        return max(0.40, min(0.98, base))

    def _compute_risk_score(
        self,
        corrosion_probability: float,
        depth_percent: float,
        severity: SeverityLevel,
        confidence: float,
    ) -> float:
        """Risk score 0–100 formula §9."""
        sev_w = SEVERITY_WEIGHTS[severity.value]
        raw = (
            0.50 * corrosion_probability
            + 0.30 * (depth_percent / 100.0)
            + 0.20 * sev_w
        ) * confidence
        return max(0.0, min(100.0, raw * 100.0))

    def _classify_defect_type(
        self, depth_percent: float, anomaly_index: float
    ) -> DefectType:
        """Defect type classification formula §10."""
        if depth_percent > 15.0 and anomaly_index > 0.5:
            return DefectType.metal_loss
        if anomaly_index > 0.3:
            return DefectType.corrosion
        return DefectType.anomaly

    def _aggregate_segments(
        self, defects: List[ComputedDefect]
    ) -> List[SegmentSummary]:
        """
        Group defects by segment and compute aggregated risk metrics.
        Aggregation formula §11:
            aggregated_risk = 0.5 * max_risk + 0.3 * mean_risk + 0.2 * log(count+1)/log(10)
        """
        if not defects:
            return []

        # Group by segment_label
        from collections import defaultdict
        seg_map: dict[str, List[ComputedDefect]] = defaultdict(list)
        for d in defects:
            seg_map[d.segment_label].append(d)

        summaries: List[SegmentSummary] = []

        for label, seg_defects in seg_map.items():
            # Extract segment index from label to compute bounds
            try:
                seg_idx = int(label.split("-")[1]) - 1
            except (IndexError, ValueError):
                seg_idx = 0

            seg_start = seg_idx * self.params.segment_length_m
            seg_end = seg_start + self.params.segment_length_m

            risks = [d.risk_score for d in seg_defects]
            depths = [d.depth_percent for d in seg_defects]
            probs = [d.corrosion_probability for d in seg_defects]

            max_risk = max(risks)
            mean_risk = sum(risks) / len(risks)
            count = len(seg_defects)
            log_count_term = math.log(count + 1, 10)

            aggregated_risk = (
                0.50 * max_risk
                + 0.30 * mean_risk
                + 0.20 * log_count_term * 100.0 / math.log(10 + 1, 10)
            )
            aggregated_risk = max(0.0, min(100.0, aggregated_risk))

            # Dominant severity = most severe found in segment
            severity_order = ["low", "medium", "high", "critical"]
            dominant = max(
                seg_defects,
                key=lambda d: severity_order.index(d.severity_level.value)
            ).severity_level

            critical_count = sum(1 for d in seg_defects if d.severity_level == SeverityLevel.critical)
            high_count = sum(1 for d in seg_defects if d.severity_level == SeverityLevel.high)

            summaries.append(SegmentSummary(
                segment_label=label,
                segment_start_m=seg_start,
                segment_end_m=seg_end,
                defect_count=count,
                dominant_severity=dominant,
                max_depth_percent=max(depths),
                avg_depth_percent=sum(depths) / len(depths),
                avg_corrosion_probability=sum(probs) / len(probs),
                max_corrosion_probability=max(probs),
                aggregated_risk_score=round(aggregated_risk, 2),
                critical_defect_count=critical_count,
                high_defect_count=high_count,
            ))

        summaries.sort(key=lambda s: s.segment_start_m)
        return summaries
