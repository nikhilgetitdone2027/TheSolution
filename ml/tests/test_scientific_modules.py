"""Unit tests for Advanced Scientific Architecture & Thermodynamics Engine.

Validates:
1. Conservation of mass in PVC dehydrochlorination and carbon combustion balances.
2. Standard polymer cp constants and thermal autarky physical boundaries.
3. PONA hydrocarbon distributions strictly summing to 100%.
4. End-to-end smoke test for standard benchmark mixed plastic batch.
"""

from __future__ import annotations

import pytest

from app.lca import CARBON_TO_CO2_FACTOR, comparative_3way_lca
from app.oil_quality import (
    compute_effective_hc_ratio,
    estimate_oil_elemental,
    estimate_pona_distribution,
    refinery_routing_verdict,
)
from app.scientific_engine import compute_scientific_intelligence
from app.stoichiometry import (
    feedstock_contamination_report,
    pet_sublimation_risk,
    pvc_dechlorination_analysis,
    radical_synergy_index,
)
from app.thermodynamics import (
    CASING_LOSS_FACTOR,
    STANDARD_CP_KJ_KG_K,
    compute_thermal_autarky,
    dulong_boie_hhv,
    reactor_thermal_demand,
)


def test_pvc_dechlorination_conservation():
    """Verify exact stoichiometric mass balance for PVC dehydrochlorination and lime bed sizing."""
    feed_mass = 1000.0  # 1 ton
    pvc_pct = 2.0       # 2% PVC = 20 kg
    result = pvc_dechlorination_analysis(pvc_pct, feed_mass_kg=feed_mass)

    assert result["pvc_mass_kg"] == 20.0
    # HCl stoichiometry: 20 * (36.46 / 62.50) = 11.6672 kg
    expected_hcl = round(20.0 * (36.46 / 62.50), 4)
    assert abs(result["hcl_yield_kg"] - expected_hcl) < 1e-4

    # Lime neutralization: (11.6672 / (2 * 36.46)) * 74.09 * 1.20
    expected_caoh2 = round((expected_hcl / (2.0 * 36.46)) * 74.09 * 1.20, 4)
    assert abs(result["caoh2_sorbent_req_kg"] - expected_caoh2) < 1e-4

    # Risk threshold at > 0.5%
    assert result["alert"] == "ACID_GAS_CORROSION_RISK"
    assert "Two-stage" in result["recommendation"]

    # Low PVC test
    low_pvc = pvc_dechlorination_analysis(0.3, feed_mass_kg=feed_mass)
    assert low_pvc["alert"] == "NORMAL_OPERATION"


def test_pet_sublimation_and_radical_synergy():
    """Verify PET tube fouling trigger and free radical synergy index."""
    # PET sublimation trigger at > 3.0%
    pet_high = pet_sublimation_risk(8.0)
    assert pet_high["alert"] == "SOLID_DEPOSITION_RISK"
    assert pet_high["risk_level"] == "HIGH"

    pet_low = pet_sublimation_risk(1.5)
    assert pet_low["alert"] == "MINIMAL_SUBLIMATION_RISK"

    # High synergy: PE + PP >= 70%
    synergy_high = radical_synergy_index(pe_pct=45.0, pp_pct=30.0, ps_pct=15.0)
    assert synergy_high["classification"] == "HIGH_SYNERGY"

    # Antagonistic: low polyolefin (< 50%)
    synergy_low = radical_synergy_index(pe_pct=20.0, pp_pct=15.0, ps_pct=40.0, pvc_pct=10.0, pet_pct=15.0)
    assert synergy_low["classification"] == "ANTAGONISTIC"


def test_thermodynamic_demand_and_autarky_bounds():
    """Verify physical thermodynamic demand, cp constancy, and autarky clamping."""
    feed_mass = 1000.0
    temp_c = 520.0
    demand = reactor_thermal_demand(feed_mass, temp_c)

    # Sensible: 1000 * 2.1 * (520 - 25) = 1,039,500 kJ = 1039.5 MJ
    expected_sensible_mj = (1000.0 * STANDARD_CP_KJ_KG_K * (520.0 - 25.0)) / 1000.0
    assert abs(demand["q_sensible_mj"] - expected_sensible_mj) < 0.1

    # Endothermic reaction: 1000 * 1050 kJ = 1050.0 MJ
    assert demand["q_reaction_mj"] == 1050.0

    # Total with 15% casing loss
    subtotal = expected_sensible_mj + 1050.0
    expected_total = subtotal * (1.0 + CASING_LOSS_FACTOR)
    assert abs(demand["q_total_thermal_mj"] - round(expected_total, 2)) < 0.2

    # Autarky with high gas yield (30%)
    autarky = compute_thermal_autarky(feed_mass, temp_c, gas_yield_pct=30.0, oil_yield_pct=60.0)
    assert autarky["thermal_autarky_pct"] <= 100.0
    assert autarky["net_energy_ratio_ner"] > 1.0


def test_oil_quality_pona_and_refinery_verdict():
    """Verify PONA sum strictly equals 100% and H/C categorization behaves as specified."""
    materials = {"pe": 45.0, "pp": 30.0, "ps": 15.0, "pvc": 2.0, "pet": 8.0}
    pona = estimate_pona_distribution(materials)

    # Strictly sum to 100.0%
    assert abs(pona["pona_sum_pct"] - 100.0) < 1e-2
    assert pona["paraffins_pct"] + pona["olefins_pct"] + pona["aromatics_pct"] + pona["naphthenes_oxygenates_pct"] == pytest.approx(100.0, 0.1)

    # Pure polyolefin H/C
    pure_poly = {"pe": 50.0, "pp": 50.0}
    elem_poly = estimate_oil_elemental(pure_poly)
    hc_poly = compute_effective_hc_ratio(elem_poly["C_oil_wt"], elem_poly["H_oil_wt"])
    assert hc_poly["hc_atomic_ratio"] >= 1.85
    verdict_poly = refinery_routing_verdict(hc_poly["hc_atomic_ratio"], pvc_pct=0.0, pet_pct=0.0)
    assert verdict_poly["route_id"] == "steam_cracker"

    # High PS H/C
    high_ps = {"ps": 80.0, "pe": 20.0}
    elem_ps = estimate_oil_elemental(high_ps)
    hc_ps = compute_effective_hc_ratio(elem_ps["C_oil_wt"], elem_ps["H_oil_wt"])
    assert hc_ps["hc_atomic_ratio"] < 1.60
    verdict_ps = refinery_routing_verdict(hc_ps["hc_atomic_ratio"], pvc_pct=0.0, pet_pct=0.0)
    assert verdict_ps["route_id"] == "industrial_fuel_oil"


def test_lca_carbon_conservation():
    """Verify stoichiometric conversion of carbon to CO2 in incineration and net carbon avoided."""
    carbon_wt_pct = 85.0
    oil_yield_pct = 65.0
    lca = comparative_3way_lca(carbon_wt_pct=carbon_wt_pct, oil_yield_pct=oil_yield_pct)

    # Incineration gross emissions: 1.0 ton * 0.85 * (44.01 / 12.011) = 3.1145 Tonnes CO2
    expected_incineration_gross = round(1.0 * 0.85 * CARBON_TO_CO2_FACTOR, 3)
    incin = next(p for p in lca["pathways"] if p["id"] == "incineration")
    assert abs(incin["gross_carbon_emissions_ton_co2e"] - expected_incineration_gross) < 1e-3

    # Pyrolysis net CO2 must be significantly lower than incineration
    pyro = next(p for p in lca["pathways"] if p["id"] == "pyrolysis")
    assert pyro["net_carbon_emissions_ton_co2e"] < incin["net_carbon_emissions_ton_co2e"]
    assert lca["net_carbon_avoided_vs_incineration_ton_per_ton"] > 2.0


def test_benchmark_smoke_test_output():
    """Smoke test for the requested benchmark batch:
    PE: 45%, PP: 30%, PS: 15%, PVC: 2%, PET: 8%, Temp: 520°C.
    """
    batch = {
        "pe_pct": 45.0,
        "pp_pct": 30.0,
        "ps_pct": 15.0,
        "pvc_pct": 2.0,
        "pet_pct": 8.0,
        "temperature_c": 520.0,
        "feed_rate_kg_h": 50.0,
    }
    # Representative model surrogate yields for this benchmark
    oil_pct = 58.5
    gas_pct = 28.2
    char_pct = 13.3

    result = compute_scientific_intelligence(
        parsed=batch,
        oil_pct=oil_pct,
        gas_pct=gas_pct,
        char_pct=char_pct,
        feed_mass_kg=1000.0,
    )

    # Module 1 assertions
    assert result["contamination"]["hcl_corrosion_risk"] is True
    assert result["contamination"]["dechlorination"]["alert"] == "ACID_GAS_CORROSION_RISK"
    assert result["contamination"]["dechlorination"]["caoh2_sorbent_req_kg"] > 0
    assert result["contamination"]["sublimation"]["alert"] == "SOLID_DEPOSITION_RISK"
    assert result["contamination"]["synergy"]["classification"] == "HIGH_SYNERGY"

    # Module 2 assertions
    assert result["thermodynamics"]["feedstock_hhv"]["hhv_mj_kg"] > 35.0
    assert result["thermodynamics"]["autarky"]["thermal_autarky_pct"] > 0.0
    assert result["thermodynamics"]["autarky"]["net_energy_ratio_ner"] > 1.0

    # Module 3 assertions
    assert result["oil_quality"]["pona"]["pona_sum_pct"] == pytest.approx(100.0, 0.1)
    assert 1.0 < result["oil_quality"]["hc_ratio"]["hc_atomic_ratio"] < 2.5

    # Module 4 assertions
    assert result["lca"]["net_carbon_avoided_vs_incineration_ton_per_ton"] > 1.5
    assert result["lca"]["net_carbon_avoided_daily_ton_co2e"] > 0.0
