"""Pathway comparison.

Numeric metrics are included only when they are model outputs or a documented
calculation from the sample. Everything else is marked insufficient.
"""

from __future__ import annotations

from typing import Any

from app.inference import derived_mass_flows
from app.stoichiometry import dulong_hhv, elemental_from_materials


def _material_inputs(parsed: dict[str, Any]) -> dict[str, float]:
    return {
        "pe": float(parsed.get("pe_pct") or 0.0),
        "pp": float(parsed.get("pp_pct") or 0.0),
        "pet": float(parsed.get("pet_pct") or 0.0),
        "ps": float(parsed.get("ps_pct") or 0.0),
        "pvc": float(parsed.get("pvc_pct") or 0.0),
        "other": float(parsed.get("other_pct") or 0.0),
    }


def elemental_report(parsed: dict[str, Any]) -> dict[str, Any]:
    calculated = elemental_from_materials(_material_inputs(parsed))
    uploaded = {}
    for key in ("carbon_pct", "hydrogen_pct", "oxygen_pct", "nitrogen_pct", "chlorine_pct"):
        if parsed.get(key) is not None:
            uploaded[key] = {
                "value": float(parsed[key]),
                "kind": "Uploaded value",
            }
    carbon_fractions = {}
    for key, label in (
        ("biogenic_carbon_pct", "Biogenic carbon"),
        ("fossil_carbon_pct", "Fossil carbon"),
        ("inert_carbon_pct", "Inert carbon"),
    ):
        if parsed.get(key) is not None:
            carbon_fractions[key] = {
                "label": label,
                "value": float(parsed[key]),
                "kind": "Uploaded value",
            }
    return {
        "calculated": calculated,
        "uploaded_elements": uploaded,
        "carbon_fractions": carbon_fractions,
        "carbon_fraction_status": (
            "Uploaded values"
            if carbon_fractions
            else "Carbon fraction unavailable for this sample."
        ),
    }


def heating_value(parsed: dict[str, Any], elemental: dict[str, Any]) -> dict[str, Any]:
    uploaded = elemental["uploaded_elements"]
    required = ("carbon_pct", "hydrogen_pct", "oxygen_pct")
    if all(key in uploaded for key in required):
        elements = {key: uploaded[key]["value"] for key in required}
        result = dulong_hhv(elements, sulfur_pct=float(parsed.get("sulfur_pct") or 0.0))
        result["source"] = "Uploaded elemental composition"
        return {"available": True, **result}
    uncharacterized = elemental["calculated"]["uncharacterized_mass_pct"]
    if uncharacterized > 0.5:
        return {
            "available": False,
            "reason": (
                "Insufficient data. The Other fraction has no elemental formula, "
                "and this sample has no uploaded elemental analysis, so a heating value is not calculated."
            ),
        }
    elements = elemental["calculated"]["elements_wt_pct"]
    result = dulong_hhv(elements, sulfur_pct=0.0)
    result["source"] = "Calculated elemental composition"
    return {"available": True, **result}


def _metric(name: str, available: bool, **extra: Any) -> dict[str, Any]:
    if available:
        return {"name": name, "available": True, **extra}
    return {
        "name": name,
        "available": False,
        "reason": extra.get("reason", "Insufficient data."),
    }


def build_pathways(parsed: dict[str, Any], prediction: dict[str, Any]) -> dict[str, Any]:
    elemental = elemental_report(parsed)
    hhv = heating_value(parsed, elemental)
    flows = derived_mass_flows(parsed, prediction) if prediction.get("available") else {
        "available": False,
        "reason": "Insufficient data.",
    }
    pvc = parsed.get("pvc_pct")
    context = []
    if pvc is not None and pvc > 0:
        context.append(
            {
                "topic": "PVC",
                "detail": (
                    f"PVC is {pvc:.1f}% of the dry blend. PVC is a chlorine-bearing polymer. "
                    "This is composition context from the entered fractions, not a yield prediction."
                ),
            }
        )
    if (parsed.get("other_pct") or 0) > 0:
        context.append(
            {
                "topic": "Other materials",
                "detail": (
                    f"Other materials are {float(parsed['other_pct']):.1f}% of the blend. "
                    "Their elemental composition is not assumed."
                ),
            }
        )

    pyrolysis_metrics = [
        _metric(
            "Product distribution",
            prediction.get("available", False),
            kind="Model estimate",
            values=prediction.get("outputs"),
            reason=prediction.get("reason"),
        ),
        _metric(
            "Product mass flow",
            flows.get("available", False),
            kind="Derived estimate",
            values=flows.get("flows"),
            formula="Feed rate × model product fraction",
            reason=flows.get("reason"),
        ),
        _metric("Recovered energy", False, reason="Insufficient data. Product heating values are not in the dataset."),
        _metric("Economic value", False, reason="Insufficient data. No product prices are included."),
        _metric("Carbon impact", False, reason="Insufficient data. No emission factors are included."),
    ]

    energy_metrics = [
        _metric(
            "Feedstock heating value",
            hhv.get("available", False),
            kind="Derived estimate",
            value=hhv.get("value_mj_per_kg"),
            unit="MJ/kg",
            equation=hhv.get("equation"),
            source=hhv.get("source"),
            notes=[hhv.get("sulfur_assumption"), hhv.get("chlorine_note"), hhv.get("basis")],
            reason=hhv.get("reason"),
        ),
        _metric("Material recovery", False, reason="Insufficient data. Combustion does not produce a material-recovery yield in this model."),
        _metric("Economic value", False, reason="Insufficient data. No energy prices are included."),
        _metric("Carbon impact", False, reason="Insufficient data. No combustion emission factors are included."),
    ]

    mechanical_metrics = [
        _metric("Material recovery", False, reason="Insufficient data. No mechanical-recycling yield model is trained."),
        _metric("Energy potential", False, reason="Insufficient data. Mechanical recycling is not an energy-yield model in this build."),
        _metric("Economic value", False, reason="Insufficient data. No recovered-material prices are included."),
        _metric("Carbon impact", False, reason="Insufficient data. No recycling emission factors are included."),
    ]

    return {
        "elemental": elemental,
        "heating_value": hhv,
        "context": context,
        "pathways": [
            {
                "id": "mechanical",
                "name": "Mechanical recycling",
                "summary": "Shown for comparison. This build does not predict a recycling yield.",
                "metrics": mechanical_metrics,
                "assumptions": ["No recycling-yield equation is applied."],
                "model_source": "None. Composition is displayed from the sample input.",
                "data_requirements": [
                    "A recycling-yield dataset or a stated recovery process would be required for a numeric material-recovery estimate."
                ],
                "limitations": [
                    "Suitability is not converted into a fabricated score.",
                    "PVC and mixed composition are shown as context, not as a penalty coefficient.",
                ],
            },
            {
                "id": "pyrolysis",
                "name": "Pyrolysis",
                "summary": "Product distribution comes from the trained regression model.",
                "metrics": pyrolysis_metrics,
                "assumptions": [
                    "Operating inputs are the values on the sample.",
                    "Outputs are renormalized to a 100% product mass balance.",
                ],
                "model_source": prediction.get("model") if prediction.get("available") else "Prediction unavailable",
                "data_requirements": [
                    "Material fractions and the process variables used by the trained model."
                ],
                "limitations": [
                    prediction.get("disclaimer", "Model estimate. Not a laboratory measurement."),
                    "Oil yield is not reported as material recovery or as energy in MJ.",
                ],
            },
            {
                "id": "energy",
                "name": "Energy recovery",
                "summary": "Only a feedstock heating value is calculated, and only when elemental data cover the sample.",
                "metrics": energy_metrics,
                "assumptions": [
                    "When a heating value is shown, it uses the Dulong formula printed on the metric.",
                ],
                "model_source": "Dulong formula when elemental coverage is sufficient. Otherwise none.",
                "data_requirements": [
                    "Uploaded carbon, hydrogen, and oxygen, or a fully identified polymer blend with no Other fraction."
                ],
                "limitations": [
                    "A feedstock heating value is not recovered energy and is not a combustion emission estimate.",
                ],
            },
        ],
    }
