from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

from app.config import DATASET_LABEL, MATERIAL_COLUMNS, TARGET_COLUMNS, TARGET_META
from app.numbers import rounded
from app.quality import validate_record
from app.registry import Registry


def _vector(record: dict[str, Any], features: list[str]) -> pd.DataFrame:
    return pd.DataFrame([{feature: float(record[feature]) for feature in features}])


def _normalize_outputs(raw: list[float]) -> dict[str, float]:
    clipped = [max(0.0, value) for value in raw]
    total = sum(clipped)
    if total <= 0:
        share = 100.0 / len(TARGET_COLUMNS)
        return {target: share for target in TARGET_COLUMNS}
    return {
        target: float(rounded(100.0 * value / total, 2))
        for target, value in zip(TARGET_COLUMNS, clipped)
    }


def predict_record(registry: Registry, record: dict[str, Any], source_label: str) -> dict[str, Any]:
    meta = registry.meta
    features = list(meta["features"])
    validation = validate_record(
        record,
        model_features=features,
        feature_ranges=meta["feature_ranges"],
        category=str(record.get("category") or "mixed_plastic"),
        source_label=source_label,
    )
    if not validation["prediction_allowed"]:
        return {
            "available": False,
            "reason": " ".join(validation["blocking_reasons"]),
            "validation": validation,
        }

    parsed = dict(validation["parsed"])
    material_values = [parsed.get(column) for column in MATERIAL_COLUMNS]
    if all(value is not None for value in material_values):
        material_total = float(sum(value for value in material_values if value is not None))
        if material_total > 0 and abs(material_total - 100.0) <= 1.0:
            for column in MATERIAL_COLUMNS:
                parsed[column] = float(parsed[column]) * 100.0 / material_total
    model = registry.bundle["model"]
    frame = _vector(parsed, features)
    raw_values = [float(value) for value in model.predict(frame)[0]]
    outputs = _normalize_outputs(raw_values)

    spread = None
    if isinstance(model, RandomForestRegressor):
        tree_predictions = np.stack([estimator.predict(frame)[0] for estimator in model.estimators_], axis=0)
        spread = {
            target: {
                "label": TARGET_META[target]["label"],
                "std_percentage_points": rounded(float(tree_predictions[:, index].std()), 2),
                "kind": "Ensemble spread",
                "note": "Standard deviation across trees. Not a calibrated prediction interval.",
            }
            for index, target in enumerate(TARGET_COLUMNS)
        }

    extrapolation = validation["detected"]["extrapolation"]
    return {
        "available": True,
        "kind": "Model estimate",
        "dataset_label": DATASET_LABEL if "illustrative" in source_label.lower() or "demo" in source_label.lower() else source_label,
        "illustrative": "illustrative" in source_label.lower() or "demo" in source_label.lower(),
        "model": meta["selected"]["model"],
        "outputs": [
            {
                "key": target,
                "label": TARGET_META[target]["label"],
                "value": outputs[target],
                "unit": "%",
                "kind": "Model estimate",
            }
            for target in TARGET_COLUMNS
        ],
        "output_map": outputs,
        "ensemble_spread": spread,
        "extrapolation": [
            {
                "feature": feature,
                "label": meta["feature_meta"][feature]["label"],
                "message": "Outside the training range. This prediction is an extrapolation.",
            }
            for feature in extrapolation
        ],
        "postprocess": meta["postprocess"],
        "validation": validation,
        "disclaimer": (
            "Demo prediction — illustrative dataset."
            if "illustrative" in source_label.lower() or "demo" in source_label.lower()
            else "Model estimate. Not a laboratory measurement."
        ),
    }


def derived_mass_flows(record: dict[str, Any], prediction: dict[str, Any]) -> dict[str, Any]:
    if not prediction.get("available"):
        return {"available": False, "reason": "No prediction is available."}
    feed = prediction["validation"]["parsed"].get("feed_rate_kg_h")
    if record.get("feed_rate_kg_h") is not None:
        feed = float(record["feed_rate_kg_h"])
    if feed is None:
        return {"available": False, "reason": "Insufficient data. Feed rate is missing, so mass flow is not calculated."}
    flows = []
    for item in prediction["outputs"]:
        flows.append(
            {
                "key": item["key"],
                "label": item["label"],
                "kg_per_h": rounded(feed * item["value"] / 100.0, 3),
                "kind": "Derived estimate",
                "formula": "Feed rate × model product fraction",
            }
        )
    return {
        "available": True,
        "feed_rate_kg_h": rounded(feed, 3),
        "flows": flows,
        "disclaimer": "Derived from the entered feed rate and the model product fraction. Not a measured production rate.",
    }
