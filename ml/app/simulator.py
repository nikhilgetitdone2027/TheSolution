"""Illustrative pyrolysis response surface.

This module generates a pedagogical dataset so the software can demonstrate a
real training and inference path when no experimental table is supplied.

The coefficients below are simulator parameters. They are not fitted
experimental constants and must not be quoted as laboratory yields.
Directionally, the surface gives polyolefins and polystyrene higher liquid
scores than PET, and gives PVC a higher non-oil score. Temperature shifts
mass from the oil score toward the gas score. Those directions are modeling
choices for the demo, not measurements.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.config import DATASET_LABEL, RANDOM_STATE

GENERATOR_BOUNDS = {
    "moisture_pct": (0.2, 5.0),
    "particle_size_mm": (1.0, 8.0),
    "feed_rate_kg_h": (6.0, 28.0),
    "temperature_c": (430.0, 530.0),
    "residence_time_min": (20.0, 80.0),
}

TARGETED_BLENDS = [
    {"pe_pct": 70, "pp_pct": 12, "pet_pct": 6, "ps_pct": 6, "pvc_pct": 2, "other_pct": 4},
    {"pe_pct": 8, "pp_pct": 68, "pet_pct": 8, "ps_pct": 8, "pvc_pct": 3, "other_pct": 5},
    {"pe_pct": 12, "pp_pct": 10, "pet_pct": 55, "ps_pct": 8, "pvc_pct": 5, "other_pct": 10},
    {"pe_pct": 15, "pp_pct": 12, "pet_pct": 8, "ps_pct": 52, "pvc_pct": 5, "other_pct": 8},
    {"pe_pct": 20, "pp_pct": 16, "pet_pct": 12, "ps_pct": 10, "pvc_pct": 32, "other_pct": 10},
    {"pe_pct": 18, "pp_pct": 16, "pet_pct": 14, "ps_pct": 12, "pvc_pct": 8, "other_pct": 32},
    {"pe_pct": 40, "pp_pct": 35, "pet_pct": 8, "ps_pct": 10, "pvc_pct": 2, "other_pct": 5},
    {"pe_pct": 10, "pp_pct": 8, "pet_pct": 42, "ps_pct": 6, "pvc_pct": 24, "other_pct": 10},
]


def illustrative_yields(row: dict, rng: np.random.Generator | None = None) -> dict[str, float]:
    pe = row["pe_pct"] / 100.0
    pp = row["pp_pct"] / 100.0
    pet = row["pet_pct"] / 100.0
    ps = row["ps_pct"] / 100.0
    pvc = row["pvc_pct"] / 100.0
    other = row["other_pct"] / 100.0
    moisture = row["moisture_pct"] / 100.0
    temperature_term = (row["temperature_c"] - 470.0) / 50.0
    residence_term = (row["residence_time_min"] - 50.0) / 30.0
    particle_term = (row["particle_size_mm"] - 4.0) / 4.0
    feed_term = (row["feed_rate_kg_h"] - 17.0) / 12.0

    oil = (
        62 * pe + 58 * pp + 18 * pet + 74 * ps + 12 * pvc + 28 * other
        - 9 * temperature_term
        - 3 * residence_term
        - 2 * particle_term
        - 1.5 * feed_term
        - 8 * moisture
    )
    gas = (
        22 * pe + 26 * pp + 48 * pet + 14 * ps + 30 * pvc + 32 * other
        + 10 * temperature_term
        + 4 * residence_term
        + feed_term
        + 2 * moisture
    )
    char = (
        8 * pe + 8 * pp + 26 * pet + 6 * ps + 14 * pvc + 22 * other
        - 2 * temperature_term
        + 3 * particle_term
    )
    other_product = (
        8 * pe + 8 * pp + 8 * pet + 6 * ps + 44 * pvc + 18 * other
        + 6 * moisture
        + residence_term
    )
    scores = {
        "oil_pct": oil,
        "gas_pct": gas,
        "char_pct": char,
        "other_product_pct": other_product,
    }
    if rng is not None:
        for key in scores:
            scores[key] += float(rng.normal(0.0, 3.0))
    clipped = {key: max(0.0, value) for key, value in scores.items()}
    total = sum(clipped.values())
    if total <= 0:
        share = 100.0 / len(clipped)
        return {key: share for key in clipped}
    return {key: 100.0 * value / total for key, value in clipped.items()}


def _process_row(rng: np.random.Generator) -> dict[str, float]:
    return {
        name: float(rng.uniform(low, high))
        for name, (low, high) in GENERATOR_BOUNDS.items()
    }


def generate_demo_frame(n_random: int = 280, seed: int = RANDOM_STATE) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows: list[dict] = []
    alphas = np.array([1.3, 1.2, 0.9, 0.8, 0.55, 0.6])
    for index in range(n_random):
        blend = rng.dirichlet(alphas) * 100.0
        row = {
            "sample_id": f"SIM-{index + 1:04d}",
            "waste_category": "mixed_plastic",
            "pe_pct": float(blend[0]),
            "pp_pct": float(blend[1]),
            "pet_pct": float(blend[2]),
            "ps_pct": float(blend[3]),
            "pvc_pct": float(blend[4]),
            "other_pct": float(blend[5]),
            **_process_row(rng),
            "source": DATASET_LABEL,
        }
        row.update(illustrative_yields(row, rng))
        rows.append(row)

    for blend_index, blend in enumerate(TARGETED_BLENDS):
        for repeat in range(6):
            row = {
                "sample_id": f"SIM-T{blend_index + 1}-{repeat + 1}",
                "waste_category": "mixed_plastic",
                **blend,
                **_process_row(rng),
                "source": DATASET_LABEL,
            }
            row.update(illustrative_yields(row, rng))
            rows.append(row)

    frame = pd.DataFrame(rows)
    return frame


DEMO_SAMPLES = [
    {
        "id": "A",
        "name": "Mixed Plastic Batch #001",
        "category": "mixed_plastic",
        "inputs": {
            "pe_pct": 32,
            "pp_pct": 24,
            "pet_pct": 18,
            "ps_pct": 14,
            "pvc_pct": 6,
            "other_pct": 6,
            "moisture_pct": 1.5,
            "particle_size_mm": 3.0,
            "feed_rate_kg_h": 12.0,
            "temperature_c": 460,
            "residence_time_min": 40,
        },
    },
    {
        "id": "B",
        "name": "High PE/PP Batch #002",
        "category": "mixed_plastic",
        "inputs": {
            "pe_pct": 58,
            "pp_pct": 30,
            "pet_pct": 4,
            "ps_pct": 5,
            "pvc_pct": 1,
            "other_pct": 2,
            "moisture_pct": 0.8,
            "particle_size_mm": 2.5,
            "feed_rate_kg_h": 10.0,
            "temperature_c": 460,
            "residence_time_min": 40,
        },
    },
    {
        "id": "C",
        "name": "Higher PET/PVC Batch #003",
        "category": "mixed_plastic",
        "inputs": {
            "pe_pct": 12,
            "pp_pct": 10,
            "pet_pct": 38,
            "ps_pct": 8,
            "pvc_pct": 22,
            "other_pct": 10,
            "moisture_pct": 2.2,
            "particle_size_mm": 5.0,
            "feed_rate_kg_h": 16.0,
            "temperature_c": 460,
            "residence_time_min": 40,
        },
    },
    {
        "id": "D",
        "name": "Identified Polymers Batch #004",
        "category": "mixed_plastic",
        "inputs": {
            "pe_pct": 34,
            "pp_pct": 28,
            "pet_pct": 16,
            "ps_pct": 18,
            "pvc_pct": 4,
            "other_pct": 0,
            "moisture_pct": 1.0,
            "particle_size_mm": 3.0,
            "feed_rate_kg_h": 12.0,
            "temperature_c": 460,
            "residence_time_min": 40,
        },
    },
]
