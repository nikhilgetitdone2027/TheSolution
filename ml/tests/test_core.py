import math

import pytest

from app.inference import predict_record
from app.optimize import optimize
from app.pathways import build_pathways, elemental_report, heating_value
from app.quality import validate_record
from app.registry import Registry
from app.simulator import DEMO_SAMPLES, illustrative_yields
from app.stoichiometry import POLYMER_ELEMENT_FRACTIONS, elemental_from_materials
from app.train import train_and_save


def test_polyethylene_carbon_fraction():
    carbon = POLYMER_ELEMENT_FRACTIONS["pe"]["C"]
    assert 0.85 < carbon < 0.86
    hydrogen = POLYMER_ELEMENT_FRACTIONS["pe"]["H"]
    assert math.isclose(carbon + hydrogen, 1.0, abs_tol=1e-9)


def test_elemental_closure_with_other_fraction():
    report = elemental_from_materials(
        {"pe": 32, "pp": 24, "pet": 18, "ps": 14, "pvc": 6, "other": 6}
    )
    elements = sum(report["elements_wt_pct"].values())
    assert math.isclose(elements + report["uncharacterized_mass_pct"], 100.0, abs_tol=1e-6)
    assert report["elements_wt_pct"]["nitrogen_pct"] == 0.0
    assert report["elements_wt_pct"]["chlorine_pct"] > 0


def test_illustrative_yields_sum_to_100():
    sample = DEMO_SAMPLES[0]["inputs"]
    yields = illustrative_yields(sample, rng=None)
    assert math.isclose(sum(yields.values()), 100.0, abs_tol=1e-6)
    assert all(value >= 0 for value in yields.values())


def test_missing_temperature_blocks_prediction():
    record = dict(DEMO_SAMPLES[0]["inputs"])
    record["temperature_c"] = None
    result = validate_record(
        record,
        model_features=["pe_pct", "temperature_c"],
        feature_ranges={"pe_pct": {"min": 0, "max": 100, "unit": "%"}, "temperature_c": {"min": 430, "max": 530, "unit": "°C"}},
    )
    assert result["prediction_allowed"] is False
    assert any("temperature_c" in reason for reason in result["blocking_reasons"])


def test_negative_percentage_is_invalid():
    record = dict(DEMO_SAMPLES[0]["inputs"])
    record["pe_pct"] = -5
    result = validate_record(
        record,
        model_features=["pe_pct"],
        feature_ranges={"pe_pct": {"min": 0, "max": 80, "unit": "%"}},
    )
    assert result["prediction_allowed"] is False
    assert result["errors"]


def test_heating_value_requires_elemental_coverage():
    mixed = elemental_report(DEMO_SAMPLES[0]["inputs"])
    refused = heating_value(DEMO_SAMPLES[0]["inputs"], mixed)
    assert refused["available"] is False

    identified = elemental_report(DEMO_SAMPLES[3]["inputs"])
    allowed = heating_value(DEMO_SAMPLES[3]["inputs"], identified)
    assert allowed["available"] is True
    assert allowed["kind"] == "Derived estimate"
    assert math.isfinite(allowed["value_mj_per_kg"])


@pytest.fixture(scope="module")
def trained(tmp_path_factory: pytest.TempPathFactory) -> Registry:
    from app.simulator import generate_demo_frame

    folder = tmp_path_factory.mktemp("model")
    frame = generate_demo_frame(n_random=90)
    meta = train_and_save(
        frame,
        cv_folds=3,
        fast=True,
        model_path=folder / "model.joblib",
        meta_path=folder / "meta.json",
    )
    holder = Registry()
    holder.meta = meta
    import joblib

    holder.bundle = joblib.load(folder / "model.joblib")
    return holder


def test_prediction_is_a_mass_balance(trained: Registry):
    prediction = predict_record(trained, DEMO_SAMPLES[0]["inputs"], "Hackathon Demo Dataset — Illustrative")
    assert prediction["available"] is True
    total = sum(item["value"] for item in prediction["outputs"])
    assert math.isclose(total, 100.0, abs_tol=0.2)
    assert prediction["illustrative"] is True
    assert all(math.isfinite(item["value"]) for item in prediction["outputs"])


def test_optimizer_stays_inside_training_range(trained: Registry):
    result = optimize(
        trained,
        DEMO_SAMPLES[1]["inputs"],
        "energy_recovery",
        "Hackathon Demo Dataset — Illustrative",
    )
    assert result["available"] is True
    bounds = result["boundary"]["ranges"]
    for feature, value in result["best"]["configuration"].items():
        assert bounds[feature]["min"] - 1e-6 <= value <= bounds[feature]["max"] + 1e-6


def test_carbon_objective_is_refused_without_weights(trained: Registry):
    result = optimize(
        trained,
        DEMO_SAMPLES[0]["inputs"],
        "carbon_impact",
        "Hackathon Demo Dataset — Illustrative",
    )
    assert result["available"] is False
    assert "Insufficient data" in result["reason"]


def test_samples_do_not_share_hardcoded_outputs(trained: Registry):
    first = predict_record(trained, DEMO_SAMPLES[0]["inputs"], "Hackathon Demo Dataset — Illustrative")
    second = predict_record(trained, DEMO_SAMPLES[2]["inputs"], "Hackathon Demo Dataset — Illustrative")
    assert first["output_map"] != second["output_map"]
    comparison = build_pathways(first["validation"]["parsed"], first)
    pyrolysis = next(item for item in comparison["pathways"] if item["id"] == "pyrolysis")
    economic = next(metric for metric in pyrolysis["metrics"] if metric["name"] == "Economic value")
    assert economic["available"] is False
