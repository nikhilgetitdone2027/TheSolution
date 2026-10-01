"""Grid search inside the training-data range.

The prediction model is the objective function. Carbon and economic objectives
stay unavailable unless the caller supplies explicit weights. No default prices
or emission factors are assumed.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from app.config import OPTIMIZABLE_COLUMNS
from app.inference import predict_record
from app.registry import Registry

OBJECTIVES = {
    "energy_recovery": {
        "label": "Maximize energy recovery",
        "proxy": "Predicted oil % + predicted gas %",
        "proxy_note": "This is a mass-fraction proxy, not a measured energy yield in MJ.",
        "requires_weights": False,
    },
    "material_recovery": {
        "label": "Maximize material recovery",
        "proxy": "Predicted oil %",
        "proxy_note": "This is a liquid-yield proxy, not a measured recycling rate.",
        "requires_weights": False,
    },
    "carbon_impact": {
        "label": "Minimize estimated carbon impact",
        "proxy": "User-supplied relative weights × product fractions",
        "proxy_note": "No emission factors ship with this model. Without weights, this objective is unavailable.",
        "requires_weights": True,
        "direction": "min",
    },
    "economic_value": {
        "label": "Maximize economic value",
        "proxy": "User-supplied relative weights × product fractions",
        "proxy_note": "No prices ship with this model. Without weights, this objective is unavailable.",
        "requires_weights": True,
        "direction": "max",
    },
}


def _score(objective: str, outputs: dict[str, float], weights: dict[str, float] | None) -> float:
    if objective == "energy_recovery":
        return outputs["oil_pct"] + outputs["gas_pct"]
    if objective == "material_recovery":
        return outputs["oil_pct"]
    assert weights is not None
    total = (
        weights["oil"] * outputs["oil_pct"]
        + weights["gas"] * outputs["gas_pct"]
        + weights["char"] * outputs["char_pct"]
        + weights["other"] * outputs["other_product_pct"]
    )
    return total / 100.0


def _normalize_weights(weights: dict[str, Any] | None) -> dict[str, float] | None:
    if not weights:
        return None
    keys = ("oil", "gas", "char", "other")
    if any(weights.get(key) is None for key in keys):
        return None
    parsed = {key: float(weights[key]) for key in keys}
    if any(value < 0 for value in parsed.values()):
        raise ValueError("Weights cannot be negative.")
    return parsed


def optimize(
    registry: Registry,
    record: dict[str, Any],
    objective: str,
    source_label: str,
    weights: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if objective not in OBJECTIVES:
        raise ValueError(f"Unknown objective '{objective}'.")
    spec = OBJECTIVES[objective]
    parsed_weights = _normalize_weights(weights)
    if spec["requires_weights"] and parsed_weights is None:
        return {
            "available": False,
            "objective": spec["label"],
            "reason": (
                "Insufficient data. "
                + spec["proxy_note"]
            ),
        }

    boundary = registry.meta["optimization_boundary"]["ranges"]
    missing_boundary = [column for column in OPTIMIZABLE_COLUMNS if column not in boundary]
    if missing_boundary:
        return {
            "available": False,
            "objective": spec["label"],
            "reason": "Optimization boundary is unavailable for: " + ", ".join(missing_boundary) + ".",
        }

    current = predict_record(registry, record, source_label)
    if not current["available"]:
        return {
            "available": False,
            "objective": spec["label"],
            "reason": current["reason"],
        }

    direction = spec.get("direction", "max")
    grids = {}
    for column, count in (
        ("temperature_c", 9),
        ("residence_time_min", 7),
        ("particle_size_mm", 5),
        ("feed_rate_kg_h", 5),
    ):
        low = float(boundary[column]["min"])
        high = float(boundary[column]["max"])
        grids[column] = np.linspace(low, high, count)
    ranked: list[dict[str, Any]] = []
    base_record = dict(record)
    for temperature in grids["temperature_c"]:
        for residence in grids["residence_time_min"]:
            for particle in grids["particle_size_mm"]:
                for feed in grids["feed_rate_kg_h"]:
                    candidate = dict(base_record)
                    candidate["temperature_c"] = float(temperature)
                    candidate["residence_time_min"] = float(residence)
                    candidate["particle_size_mm"] = float(particle)
                    candidate["feed_rate_kg_h"] = float(feed)
                    prediction = predict_record(registry, candidate, source_label)
                    if not prediction["available"] or prediction["extrapolation"]:
                        continue
                    value = _score(objective, prediction["output_map"], parsed_weights)
                    ranked.append(
                        {
                            "score": value,
                            "configuration": {
                                column: round(float(candidate[column]), 3) for column in OPTIMIZABLE_COLUMNS
                            },
                            "outputs": prediction["output_map"],
                        }
                    )

    if not ranked:
        return {
            "available": False,
            "objective": spec["label"],
            "reason": "No feasible configuration was found inside the training range.",
        }

    ranked.sort(key=lambda item: item["score"], reverse=direction == "max")
    best = ranked[0]
    current_inside = not current["extrapolation"]
    current_score = None
    if current_inside:
        current_score = _score(objective, current["output_map"], parsed_weights)

    best_prediction = predict_record(
        registry,
        {**record, **best["configuration"]},
        source_label,
    )
    return {
        "available": True,
        "objective_id": objective,
        "objective": spec["label"],
        "proxy": spec["proxy"],
        "proxy_note": spec["proxy_note"],
        "direction": direction,
        "weights": parsed_weights,
        "weights_kind": "User-supplied relative weights" if parsed_weights else None,
        "boundary": registry.meta["optimization_boundary"],
        "evaluated": len(ranked),
        "best": {
            "configuration": best["configuration"],
            "score": round(best["score"], 3),
            "score_unit": "index" if parsed_weights else "%",
            "prediction": best_prediction,
        },
        "current": {
            "inside_boundary": current_inside,
            "score": None if current_score is None else round(current_score, 3),
            "prediction": current,
            "configuration": {
                column: current["validation"]["parsed"].get(column) for column in OPTIMIZABLE_COLUMNS
            },
        },
        "top": [
            {
                "configuration": item["configuration"],
                "score": round(item["score"], 3),
                "outputs": item["outputs"],
            }
            for item in ranked[:5]
        ],
        "decision": {
            "available": True,
            "pathway_under_study": "Pyrolysis",
            "statement": (
                "This is a pyrolysis configuration to evaluate for the selected proxy. "
                "It is not a claim that pyrolysis is preferable to mechanical recycling or energy recovery."
            ),
            "configuration": best["configuration"],
            "objective": spec["label"],
            "proxy": spec["proxy"],
            "score": round(best["score"], 3),
            "model": registry.meta["selected"]["model"],
            "evidence": [
                f"Model selected: {registry.meta['selected']['model']}. {registry.meta['selected']['reason']}",
                f"The search evaluated {len(ranked)} configurations inside the training-data range.",
                spec["proxy_note"],
            ],
            "limitations": [
                "Predictions are model estimates, not laboratory measurements.",
                "Training data for this build is an illustrative simulator, not a plant dataset.",
                "Configurations outside the training range are not recommended.",
            ],
        },
    }
