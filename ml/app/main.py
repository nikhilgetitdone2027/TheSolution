import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import DATASET_LABEL
from app.explain import answer_question, evidence_packet
from app.inference import derived_mass_flows, predict_record
from app.optimize import optimize
from app.pathways import build_pathways, elemental_report, heating_value
from app.quality import mark_duplicate_rows, parse_csv_text, validate_record
from app.registry import registry
from app.simulator import DEMO_SAMPLES

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("chem2energy.ml")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading model. Training runs once if no artifact is saved.")
    registry.load()
    logger.info("Model ready: %s", registry.meta["selected"]["model"])
    yield


app = FastAPI(title="CHEM2ENERGY ML", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ParseRequest(BaseModel):
    csv_text: str = Field(min_length=1)


class ValidateRequest(BaseModel):
    record: dict[str, Any]
    category: str = "mixed_plastic"
    source_label: str = "Uploaded dataset"


class PredictRequest(BaseModel):
    record: dict[str, Any]
    category: str = "mixed_plastic"
    source_label: str = "Uploaded dataset"


class OptimizeRequest(BaseModel):
    record: dict[str, Any]
    objective: str
    category: str = "mixed_plastic"
    source_label: str = "Uploaded dataset"
    weights: dict[str, float] | None = None


class SimulateRequest(BaseModel):
    baseline: dict[str, Any]
    modified: dict[str, Any]
    category: str = "mixed_plastic"
    source_label: str = "Uploaded dataset"


class ExplainRequest(BaseModel):
    record: dict[str, Any]
    question: str = Field(min_length=1)
    category: str = "mixed_plastic"
    source_label: str = "Uploaded dataset"


def _ready() -> None:
    if not registry.ready():
        registry.load()


def _with_category(record: dict[str, Any], category: str) -> dict[str, Any]:
    merged = dict(record)
    merged["category"] = category
    return merged


@app.get("/health")
def health() -> dict[str, Any]:
    _ready()
    return {
        "status": "ok",
        "model": registry.meta["selected"]["model"],
        "dataset": registry.meta["dataset"]["label"],
    }


@app.get("/model")
def model_card() -> dict[str, Any]:
    _ready()
    return registry.meta


@app.get("/demo-samples")
def demo_samples() -> dict[str, Any]:
    return {"label": DATASET_LABEL, "samples": DEMO_SAMPLES}


@app.post("/parse")
def parse_csv(body: ParseRequest) -> dict[str, Any]:
    _ready()
    try:
        records = parse_csv_text(body.csv_text)
    except Exception as exc:  # pragma: no cover - pandas error text is user facing
        raise HTTPException(status_code=400, detail=f"CSV could not be read. {exc}") from exc
    duplicates = mark_duplicate_rows(records, registry.meta["features"])
    return {"records": records, "row_count": len(records), "duplicate_rows": duplicates}


@app.post("/validate")
def validate(body: ValidateRequest) -> dict[str, Any]:
    _ready()
    return validate_record(
        _with_category(body.record, body.category),
        model_features=registry.meta["features"],
        feature_ranges=registry.meta["feature_ranges"],
        category=body.category,
        source_label=body.source_label,
    )


@app.post("/predict")
def predict(body: PredictRequest) -> dict[str, Any]:
    _ready()
    return predict_record(
        registry,
        _with_category(body.record, body.category),
        body.source_label,
    )


@app.post("/optimize")
def optimize_route(body: OptimizeRequest) -> dict[str, Any]:
    _ready()
    try:
        return optimize(
            registry,
            _with_category(body.record, body.category),
            body.objective,
            body.source_label,
            body.weights,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/simulate")
def simulate(body: SimulateRequest) -> dict[str, Any]:
    _ready()
    before = predict_record(registry, _with_category(body.baseline, body.category), body.source_label)
    after = predict_record(registry, _with_category(body.modified, body.category), body.source_label)
    return {
        "before": before,
        "after": after,
        "before_flows": derived_mass_flows(body.baseline, before),
        "after_flows": derived_mass_flows(body.modified, after),
    }


from app.scientific_engine import compute_scientific_intelligence


@app.post("/pathways")
def pathways(body: PredictRequest) -> dict[str, Any]:
    _ready()
    prediction = predict_record(registry, _with_category(body.record, body.category), body.source_label)
    parsed = prediction["validation"]["parsed"] if prediction.get("validation") else body.record

    oil_pct = 0.0
    gas_pct = 0.0
    char_pct = 0.0
    if prediction.get("available") and prediction.get("output_map"):
        oil_pct = float(prediction["output_map"].get("oil_pct", 0.0))
        gas_pct = float(prediction["output_map"].get("gas_pct", 0.0))
        char_pct = float(prediction["output_map"].get("char_pct", 0.0))

    intelligence = compute_scientific_intelligence(
        parsed=parsed,
        oil_pct=oil_pct,
        gas_pct=gas_pct,
        char_pct=char_pct,
        feed_mass_kg=1000.0,
    )

    return {
        "prediction": prediction,
        "comparison": build_pathways(parsed, prediction),
        "flows": derived_mass_flows(parsed, prediction),
        "intelligence": intelligence,
    }


@app.post("/profile")
def profile(body: ValidateRequest) -> dict[str, Any]:
    _ready()
    validation = validate_record(
        _with_category(body.record, body.category),
        model_features=registry.meta["features"],
        feature_ranges=registry.meta["feature_ranges"],
        category=body.category,
        source_label=body.source_label,
    )
    parsed = validation["parsed"]
    elemental = elemental_report(parsed)
    # Provide preliminary stoichiometric and thermodynamic screening on raw composition
    intelligence = compute_scientific_intelligence(
        parsed=parsed,
        oil_pct=60.0,
        gas_pct=25.0,
        char_pct=15.0,
        feed_mass_kg=1000.0,
    )
    return {
        "validation": validation,
        "elemental": elemental,
        "heating_value": heating_value(parsed, elemental),
        "intelligence": intelligence,
    }


@app.post("/intelligence")
def intelligence(body: PredictRequest) -> dict[str, Any]:
    _ready()
    prediction = predict_record(registry, _with_category(body.record, body.category), body.source_label)
    parsed = prediction["validation"]["parsed"] if prediction.get("validation") else body.record
    oil_pct = float(prediction.get("output_map", {}).get("oil_pct", 60.0)) if prediction.get("available") else 60.0
    gas_pct = float(prediction.get("output_map", {}).get("gas_pct", 25.0)) if prediction.get("available") else 25.0
    char_pct = float(prediction.get("output_map", {}).get("char_pct", 15.0)) if prediction.get("available") else 15.0

    scientific = compute_scientific_intelligence(
        parsed=parsed,
        oil_pct=oil_pct,
        gas_pct=gas_pct,
        char_pct=char_pct,
        feed_mass_kg=1000.0,
    )
    return {
        "prediction": prediction,
        "intelligence": scientific,
    }


@app.post("/explain")
def explain(body: ExplainRequest) -> dict[str, Any]:
    _ready()
    packet = evidence_packet(
        registry,
        _with_category(body.record, body.category),
        body.source_label,
        body.question,
    )
    answered = answer_question(packet)
    return {
        "answer": answered,
        "importance": packet["importance"],
        "local_effects": packet["local_effects"],
        "dataset_label": packet["dataset_label"],
        "model": packet["model"],
    }
