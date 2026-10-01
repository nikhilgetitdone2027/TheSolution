from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
ARTIFACT_DIR = ROOT / "artifacts"
DATASET_PATH = DATA_DIR / "demo_dataset.csv"
MODEL_PATH = ARTIFACT_DIR / "model.joblib"
META_PATH = ARTIFACT_DIR / "model_meta.json"

DATASET_ID = "hackathon-demo-illustrative-v1"
DATASET_LABEL = "Hackathon Demo Dataset — Illustrative"
RANDOM_STATE = 20260330

MATERIAL_COLUMNS = [
    "pe_pct",
    "pp_pct",
    "pet_pct",
    "ps_pct",
    "pvc_pct",
    "other_pct",
]

ELEMENTAL_COLUMNS = [
    "carbon_pct",
    "hydrogen_pct",
    "oxygen_pct",
    "nitrogen_pct",
    "chlorine_pct",
]

PROCESS_COLUMNS = [
    "moisture_pct",
    "particle_size_mm",
    "feed_rate_kg_h",
    "temperature_c",
    "residence_time_min",
]

OPTIMIZABLE_COLUMNS = [
    "temperature_c",
    "residence_time_min",
    "particle_size_mm",
    "feed_rate_kg_h",
]

TARGET_COLUMNS = [
    "oil_pct",
    "gas_pct",
    "char_pct",
    "other_product_pct",
]

# Columns the trainer may use if they exist in a dataset.
FEATURE_POOL = MATERIAL_COLUMNS + ELEMENTAL_COLUMNS + PROCESS_COLUMNS

FEATURE_META = {
    "pe_pct": {"label": "PE", "unit": "%", "group": "material"},
    "pp_pct": {"label": "PP", "unit": "%", "group": "material"},
    "pet_pct": {"label": "PET", "unit": "%", "group": "material"},
    "ps_pct": {"label": "PS", "unit": "%", "group": "material"},
    "pvc_pct": {"label": "PVC", "unit": "%", "group": "material"},
    "other_pct": {"label": "Other materials", "unit": "%", "group": "material"},
    "carbon_pct": {"label": "Carbon", "unit": "%", "group": "elemental"},
    "hydrogen_pct": {"label": "Hydrogen", "unit": "%", "group": "elemental"},
    "oxygen_pct": {"label": "Oxygen", "unit": "%", "group": "elemental"},
    "nitrogen_pct": {"label": "Nitrogen", "unit": "%", "group": "elemental"},
    "chlorine_pct": {"label": "Chlorine", "unit": "%", "group": "elemental"},
    "moisture_pct": {"label": "Moisture", "unit": "%", "group": "process"},
    "particle_size_mm": {"label": "Particle size", "unit": "mm", "group": "process"},
    "feed_rate_kg_h": {"label": "Feed rate", "unit": "kg/h", "group": "process"},
    "temperature_c": {"label": "Temperature", "unit": "°C", "group": "process"},
    "residence_time_min": {"label": "Residence time", "unit": "min", "group": "process"},
}

TARGET_META = {
    "oil_pct": {"label": "Oil", "unit": "%"},
    "gas_pct": {"label": "Gas", "unit": "%"},
    "char_pct": {"label": "Char", "unit": "%"},
    "other_product_pct": {"label": "Other products", "unit": "%"},
}

HEADER_ALIASES = {
    "pe": "pe_pct",
    "pe_%": "pe_pct",
    "pe_pct": "pe_pct",
    "polyethylene": "pe_pct",
    "pp": "pp_pct",
    "pp_%": "pp_pct",
    "pp_pct": "pp_pct",
    "polypropylene": "pp_pct",
    "pet": "pet_pct",
    "pet_%": "pet_pct",
    "pet_pct": "pet_pct",
    "ps": "ps_pct",
    "ps_%": "ps_pct",
    "ps_pct": "ps_pct",
    "polystyrene": "ps_pct",
    "pvc": "pvc_pct",
    "pvc_%": "pvc_pct",
    "pvc_pct": "pvc_pct",
    "other": "other_pct",
    "other_%": "other_pct",
    "other_pct": "other_pct",
    "c": "carbon_pct",
    "carbon": "carbon_pct",
    "carbon_pct": "carbon_pct",
    "h": "hydrogen_pct",
    "hydrogen": "hydrogen_pct",
    "hydrogen_pct": "hydrogen_pct",
    "o": "oxygen_pct",
    "oxygen": "oxygen_pct",
    "oxygen_pct": "oxygen_pct",
    "n": "nitrogen_pct",
    "nitrogen": "nitrogen_pct",
    "nitrogen_pct": "nitrogen_pct",
    "cl": "chlorine_pct",
    "chlorine": "chlorine_pct",
    "chlorine_pct": "chlorine_pct",
    "moisture": "moisture_pct",
    "moisture_%": "moisture_pct",
    "moisture_pct": "moisture_pct",
    "particle_size": "particle_size_mm",
    "particle_size_mm": "particle_size_mm",
    "feed_rate": "feed_rate_kg_h",
    "feed_rate_kg_h": "feed_rate_kg_h",
    "temperature": "temperature_c",
    "temperature_c": "temperature_c",
    "temp_c": "temperature_c",
    "residence_time": "residence_time_min",
    "residence_time_min": "residence_time_min",
    "oil": "oil_pct",
    "oil_pct": "oil_pct",
    "gas": "gas_pct",
    "gas_pct": "gas_pct",
    "char": "char_pct",
    "char_pct": "char_pct",
    "other_product": "other_product_pct",
    "other_product_pct": "other_product_pct",
}
