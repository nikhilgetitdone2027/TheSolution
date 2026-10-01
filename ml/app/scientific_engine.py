"""Unified Scientific Architecture & Decision-Support Engine.

Integrates:
- Module 1: Contamination, Dechlorination, Lime Scrubber Sizing, PET Deposition, Radical Synergy
- Module 2: Aggregate Elemental, Dulong/Boie HHV, Reactor Parasitic Duty, Thermal Autarky & NER
- Module 3: Pyrolysis Oil Effective H/C Ratio, ASTM D5443 PONA Distribution, Refinery Routing
- Module 4: 3-Way Comparative LCA (Landfill vs Incineration vs Pyrolysis), Avoided Carbon
"""

from __future__ import annotations

from typing import Any

from app.lca import comparative_3way_lca
from app.oil_quality import oil_quality_intelligence_report
from app.stoichiometry import feedstock_contamination_report
from app.thermodynamics import thermodynamic_intelligence_report


def compute_scientific_intelligence(
    parsed: dict[str, Any],
    oil_pct: float,
    gas_pct: float,
    char_pct: float,
    feed_mass_kg: float = 1000.0,
) -> dict[str, Any]:
    """Compute deterministic scientific quantities across all 4 modules with strict mass/energy conservation."""
    feed_rate = float(parsed.get("feed_rate_kg_h") or 41.67)  # default 1 TPD basis if missing
    temperature = float(parsed.get("temperature_c") or 500.0)
    pvc = float(parsed.get("pvc_pct") or 0.0)
    pet = float(parsed.get("pet_pct") or 0.0)

    # 1. Module 1: Contamination & Acid Gas
    contamination = feedstock_contamination_report(parsed, feed_mass_kg=feed_mass_kg)

    # 2. Module 2: Thermodynamics & Autarky
    thermo = thermodynamic_intelligence_report(
        materials_pct=parsed,
        temperature_c=temperature,
        gas_yield_pct=gas_pct,
        oil_yield_pct=oil_pct,
        feed_mass_kg=feed_mass_kg,
    )

    # 3. Module 3: Downstream Oil Quality & PONA
    oil_qual = oil_quality_intelligence_report(
        materials_pct=parsed,
        pvc_pct=pvc,
        pet_pct=pet,
    )

    # 4. Module 4: 3-Way Comparative LCA
    carbon_wt = float(thermo["elemental_blend"]["C"])
    autarky_pct = float(thermo["autarky"]["thermal_autarky_pct"])
    lca_report = comparative_3way_lca(
        carbon_wt_pct=carbon_wt,
        oil_yield_pct=oil_pct,
        feed_mass_kg=feed_mass_kg,
        feed_rate_kg_h=feed_rate,
        syngas_autarky_pct=autarky_pct,
    )

    return {
        "contamination": contamination,
        "thermodynamics": thermo,
        "oil_quality": oil_qual,
        "lca": lca_report,
    }
