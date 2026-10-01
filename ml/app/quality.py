"""Sample validation. Invalid states block prediction instead of inventing inputs."""

from __future__ import annotations

import io
from typing import Any

import pandas as pd

from app.config import (
    ELEMENTAL_COLUMNS,
    HEADER_ALIASES,
    MATERIAL_COLUMNS,
    PROCESS_COLUMNS,
    TARGET_COLUMNS,
)
from app.numbers import finite_float

PERCENT_COLUMNS = set(MATERIAL_COLUMNS + ["moisture_pct"] + ELEMENTAL_COLUMNS + TARGET_COLUMNS)
IDENTIFIED = ["pe_pct", "pp_pct", "pet_pct", "ps_pct", "pvc_pct"]


def normalize_header(header: str) -> str:
    text = str(header).strip().lower().replace("%", "pct")
    for separator in (" ", "-", "/", "."):
        text = text.replace(separator, "_")
    while "__" in text:
        text = text.replace("__", "_")
    text = text.strip("_")
    return HEADER_ALIASES.get(text, text)


def _none_if_blank(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        if stripped == "" or stripped.lower() in {"nan", "none", "null", "undefined"}:
            return None
        return stripped
    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass
    return value


def parse_csv_text(csv_text: str) -> list[dict[str, Any]]:
    frame = pd.read_csv(io.StringIO(csv_text))
    if frame.empty:
        return []
    frame.columns = [normalize_header(column) for column in frame.columns]
    records = []
    for raw in frame.to_dict(orient="records"):
        cleaned = {}
        for key, value in raw.items():
            blank = _none_if_blank(value)
            if blank is None:
                cleaned[key] = None
                continue
            number = finite_float(blank)
            cleaned[key] = number if number is not None else blank
        records.append(cleaned)
    return records


def prepare_record(record: dict[str, Any]) -> tuple[dict[str, float | None], list[dict[str, str]]]:
    """Parse numbers and infer Other only as the closure of a complete polymer row."""
    notes: list[dict[str, str]] = []
    parsed: dict[str, float | None] = {}
    incoming = {normalize_header(key): value for key, value in record.items()}
    known = MATERIAL_COLUMNS + PROCESS_COLUMNS + ELEMENTAL_COLUMNS + TARGET_COLUMNS
    for key in known:
        if key not in incoming:
            parsed[key] = None
            continue
        value = _none_if_blank(incoming.get(key))
        if value is None:
            parsed[key] = None
            continue
        number = finite_float(value)
        if number is None:
            notes.append({"level": "error", "field": key, "message": f"{key} is not a number."})
            parsed[key] = None
        else:
            parsed[key] = number

    if parsed.get("other_pct") is None and all(parsed.get(key) is not None for key in IDENTIFIED):
        closure = 100.0 - sum(float(parsed[key]) for key in IDENTIFIED)
        if closure >= -0.5:
            parsed["other_pct"] = round(max(0.0, closure), 4)
            notes.append(
                {
                    "level": "warning",
                    "field": "other_pct",
                    "message": "Other % was inferred as the closure of the material balance.",
                }
            )
    return parsed, notes


def validate_record(
    record: dict[str, Any],
    *,
    model_features: list[str],
    feature_ranges: dict[str, dict[str, float]],
    category: str = "mixed_plastic",
    source_label: str = "Uploaded dataset",
) -> dict[str, Any]:
    parsed, notes = prepare_record(record)
    errors = [note for note in notes if note["level"] == "error"]
    warnings = [note for note in notes if note["level"] == "warning"]
    detected_required = 0
    invalid_count = len(errors)

    for key, value in parsed.items():
        if value is None or key not in PERCENT_COLUMNS:
            continue
        if value < 0:
            errors.append({"level": "error", "field": key, "message": f"{key} cannot be negative."})
            invalid_count += 1
        elif value > 100:
            errors.append({"level": "error", "field": key, "message": f"{key} cannot be greater than 100."})
            invalid_count += 1

    material_values = [parsed.get(key) for key in MATERIAL_COLUMNS]
    if all(value is not None for value in material_values):
        material_sum = float(sum(value for value in material_values if value is not None))
        if abs(material_sum - 100.0) > 1.0:
            errors.append(
                {
                    "level": "error",
                    "field": "material_balance",
                    "message": f"Material fractions sum to {material_sum:.1f}%, not 100%.",
                }
            )
        elif abs(material_sum - 100.0) > 0.2:
            warnings.append(
                {
                    "level": "warning",
                    "field": "material_balance",
                    "message": f"Material fractions sum to {material_sum:.2f}% and will be normalized for the model.",
                }
            )

    missing_required = []
    for feature in model_features:
        if parsed.get(feature) is None:
            missing_required.append(feature)
        else:
            detected_required += 1

    missing_optional = []
    for column in ELEMENTAL_COLUMNS:
        if parsed.get(column) is None:
            missing_optional.append(column)

    extrapolation = []
    for feature in model_features:
        value = parsed.get(feature)
        bounds = feature_ranges.get(feature)
        if value is None or not bounds:
            continue
        if value < float(bounds["min"]) - 1e-6 or value > float(bounds["max"]) + 1e-6:
            extrapolation.append(feature)
            warnings.append(
                {
                    "level": "warning",
                    "field": feature,
                    "message": (
                        f"{feature} is outside the training range "
                        f"({bounds['min']}–{bounds['max']} {bounds['unit']}). "
                        "A prediction here would be an extrapolation."
                    ),
                }
            )

    category_blocked = category not in {"", "mixed_plastic"}
    prediction_allowed = not errors and not missing_required and not category_blocked
    reasons = []
    if category_blocked:
        reasons.append(
            "Prediction unavailable. This build models mixed-plastic pyrolysis only. "
            f"The category '{category}' is reserved for a future pathway."
        )
    if missing_required:
        reasons.append(
            "Prediction unavailable because the current sample is missing required model inputs: "
            + ", ".join(missing_required)
            + "."
        )
    if errors:
        reasons.append("Prediction unavailable because the sample has invalid values.")

    score = 100
    score -= min(60, 15 * len(missing_required))
    score -= min(40, 12 * len(errors))
    score -= min(15, 4 * len(extrapolation))
    score -= min(10, 2 * len(missing_optional))
    if category_blocked:
        score = min(score, 40)
    score = max(0, min(100, score))

    return {
        "prediction_allowed": prediction_allowed,
        "blocking_reasons": reasons,
        "quality_score": score,
        "source_label": source_label,
        "category": category or "mixed_plastic",
        "parsed": parsed,
        "detected": {
            "required_present": detected_required,
            "required_total": len(model_features),
            "invalid_values": len(errors),
            "optional_missing": missing_optional,
            "extrapolation": extrapolation,
        },
        "errors": errors,
        "warnings": warnings,
        "model_features": model_features,
    }


def mark_duplicate_rows(records: list[dict[str, Any]], keys: list[str]) -> list[dict[str, Any]]:
    seen: dict[tuple, int] = {}
    issues = []
    for index, record in enumerate(records):
        signature = tuple(record.get(key) for key in keys)
        if signature in seen:
            issues.append(
                {
                    "row": index + 1,
                    "message": f"Row {index + 1} repeats the inputs of row {seen[signature] + 1}.",
                }
            )
        else:
            seen[signature] = index
    return issues
