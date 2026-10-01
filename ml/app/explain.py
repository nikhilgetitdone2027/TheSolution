"""Grounded explanations.

Answers are assembled from the sample, the model output, permutation
importance, and local one-at-a-time model responses. The text does not add
yields, citations, or mechanisms that are not in that evidence.
"""

from __future__ import annotations

from typing import Any

from app.inference import predict_record
from app.registry import Registry


def _local_effects(registry: Registry, record: dict[str, Any], source_label: str) -> list[dict[str, Any]]:
    meta = registry.meta
    ranges = meta["feature_ranges"]
    baseline = predict_record(registry, record, source_label)
    if not baseline["available"]:
        return []
    effects = []
    for feature, bounds in ranges.items():
        span = float(bounds["max"]) - float(bounds["min"])
        if span <= 0:
            continue
        step = span * 0.1
        current = float(record[feature])
        raised = min(float(bounds["max"]), current + step)
        if abs(raised - current) < 1e-9:
            continue
        changed = dict(record)
        changed[feature] = raised
        prediction = predict_record(registry, changed, source_label)
        if not prediction["available"]:
            continue
        delta = {
            key: round(prediction["output_map"][key] - baseline["output_map"][key], 2)
            for key in baseline["output_map"]
        }
        effects.append(
            {
                "feature": feature,
                "label": meta["feature_meta"][feature]["label"],
                "unit": meta["feature_meta"][feature]["unit"],
                "from": round(current, 3),
                "to": round(raised, 3),
                "output_delta_percentage_points": delta,
                "kind": "Local model response",
            }
        )
    return effects


def evidence_packet(
    registry: Registry,
    record: dict[str, Any],
    source_label: str,
    question: str,
) -> dict[str, Any]:
    prediction = predict_record(registry, record, source_label)
    importance = registry.meta["feature_importance"]["rows"]
    model_record = record
    if prediction.get("available"):
        model_record = {
            key: value
            for key, value in prediction["validation"]["parsed"].items()
            if value is not None
        }
    return {
        "question": question,
        "dataset_label": registry.meta["dataset"]["label"],
        "dataset_nature": registry.meta["dataset"]["nature"],
        "model": registry.meta["selected"]["model"],
        "selection_reason": registry.meta["selected"]["reason"],
        "inputs": prediction["validation"]["parsed"] if prediction.get("validation") else record,
        "prediction": prediction,
        "importance_method": registry.meta["feature_importance"]["label"],
        "importance": importance[:8],
        "local_effects": _local_effects(registry, model_record, source_label) if prediction.get("available") else [],
        "limitations": [
            "The explainer does not create a second scientific prediction.",
            registry.meta["dataset"]["disclaimer"],
        ],
    }


def _fmt_outputs(prediction: dict[str, Any]) -> str:
    parts = [f"{item['label']} {item['value']:.1f}%" for item in prediction["outputs"]]
    return ", ".join(parts)


def _top_features(evidence: dict[str, Any], limit: int = 4) -> str:
    rows = evidence["importance"][:limit]
    return "; ".join(
        f"{row['label']} (mean MAE increase {row['mean_mae_increase']})" for row in rows
    )


def answer_question(evidence: dict[str, Any]) -> dict[str, Any]:
    question = evidence["question"].lower()
    prediction = evidence["prediction"]
    if not prediction.get("available"):
        text = prediction.get("reason") or "Prediction unavailable because required model inputs are missing."
        return {"answer": text, "grounded": True, "used_features": []}

    outputs = _fmt_outputs(prediction)
    features = _top_features(evidence)
    illustrative = prediction.get("illustrative", False)
    prefix = "Demo prediction — illustrative dataset. " if illustrative else ""

    if any(token in question for token in ("missing", "data quality", "what data")):
        validation = prediction["validation"]
        missing = validation["detected"]["optional_missing"]
        blocked = validation["blocking_reasons"]
        if blocked:
            text = " ".join(blocked)
        elif missing:
            text = (
                "The required model inputs are present. Optional elemental columns are not on this sample: "
                + ", ".join(missing)
                + ". They are not features of the current model, so prediction was still run. "
                "Elemental values shown elsewhere are calculated from identified polymers when that calculation is valid."
            )
        else:
            text = "No missing required inputs were found for the current model."
    elif any(token in question for token in ("contain", "composition", "what is in")):
        parsed = evidence["inputs"]
        text = (
            f"The sample inputs are PE {parsed.get('pe_pct')}%, PP {parsed.get('pp_pct')}%, "
            f"PET {parsed.get('pet_pct')}%, PS {parsed.get('ps_pct')}%, PVC {parsed.get('pvc_pct')}%, "
            f"Other {parsed.get('other_pct')}%. "
            f"Process inputs include temperature {parsed.get('temperature_c')} °C and "
            f"residence time {parsed.get('residence_time_min')} min. "
            "These are entered values, not measurements made by this software."
        )
    elif "non-technical" in question or "operator" in question or "explain this model" in question:
        text = (
            f"{prefix}The model estimates how this mixed-plastic input might split into oil, gas, char, "
            f"and other products. The current estimate is {outputs}. "
            f"The model in use is {evidence['model']}, chosen because it had the lowest cross-validated error "
            "on the training split. It does not measure the products, and it should not be used as a plant design."
        )
    elif "pyrolysis" in question and any(token in question for token in ("why", "consider")):
        text = (
            "Pyrolysis is the pathway this version can model for mixed plastic. "
            "Mechanical recycling and energy recovery are shown beside it, but this build does not predict their yields. "
            "Pyrolysis is on screen because that is the implemented model, not because the software proved it is the best route."
        )
    elif any(token in question for token in ("temperature", "changed", "increase", "what-if", "what if")):
        effects = evidence["local_effects"]
        temperature = next((item for item in effects if item["feature"] == "temperature_c"), None)
        if temperature is None:
            text = "A local temperature response is not available for this sample."
        else:
            oil_delta = temperature["output_delta_percentage_points"]["oil_pct"]
            gas_delta = temperature["output_delta_percentage_points"]["gas_pct"]
            text = (
                f"Holding the other model inputs fixed, moving temperature from {temperature['from']} °C "
                f"to {temperature['to']} °C changes the predicted oil yield by {oil_delta} percentage points "
                f"and the predicted gas yield by {gas_delta} percentage points. "
                "This is a local model response inside the training range, not a laboratory result. "
                f"Across the holdout set, the features with the largest permutation importance were: {features}."
            )
    else:
        text = (
            f"{prefix}The prediction is {outputs}. "
            f"It is associated with the entered composition and process inputs. "
            f"The holdout permutation test ranked these features highest: {features}. "
            "Permutation importance is a global diagnostic on the holdout split, not a laboratory mechanism."
        )

    return {
        "answer": text,
        "grounded": True,
        "model": evidence["model"],
        "importance_method": evidence["importance_method"],
        "used_features": [row["feature"] for row in evidence["importance"][:4]],
        "local_effects": evidence["local_effects"],
    }
