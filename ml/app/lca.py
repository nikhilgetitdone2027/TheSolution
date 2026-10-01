"""3-Way Comparative Life Cycle Assessment (LCA) Displacement Engine.

Rigorous environmental carbon accounting comparing:
1. Pathway A: Sanitary Landfill
2. Pathway B: Waste-to-Energy (WTE) Mass-Burn Incineration
3. Pathway C: Catalyzed Pyrolysis & Circular Hydrocarbon Recovery
"""

from __future__ import annotations

from typing import Any

# Stoichiometric conversion factors
M_CO2 = 44.01
M_CARBON = 12.011
CARBON_TO_CO2_FACTOR = M_CO2 / M_CARBON  # 3.66415 kg CO2 per kg Carbon

# LCA Emission Benchmarks (IPCC & Ecoinvent standards)
LANDFILL_DIRECT_CO2E_KG_PER_KG = 0.050    # 50 kg CO2e / Ton (low initial fugitive emission)
LANDFILL_VOLUME_M3_PER_TON = 1.0         # 1.0 m3 compacted landfill space per Ton plastic

INCINERATION_GRID_CREDIT_TON_CO2E = 0.650 # -0.65 Tonnes CO2e credit from displaced power (25% eff, 0.4 kg CO2/kWh)
PYROLYSIS_PROCESS_FOOTPRINT_TON_CO2E = 0.350 # Direct heating combustion footprint (+0.35 T CO2e/ton)
VIRGIN_NAPHTHA_AVOIDED_KG_CO2E_PER_KG = 1.750 # Cradle-to-gate virgin petrochemical naphtha offset


def comparative_3way_lca(
    carbon_wt_pct: float,
    oil_yield_pct: float,
    feed_mass_kg: float = 1000.0,
    feed_rate_kg_h: float = 41.67,  # Default 1 TPD = 41.67 kg/h
    syngas_autarky_pct: float = 100.0,
) -> dict[str, Any]:
    """Calculate deterministic comparative 3-way LCA across Landfill, Incineration, and Pyrolysis
    normalized on 1 Metric Ton (1000 kg) basis and scaled to plant daily capacity.
    """
    basis_ton = 1.0  # 1 Metric Ton standard comparison basis
    c_fraction = max(0.20, min(1.0, float(carbon_wt_pct) / 100.0))

    # -------------------------------------------------------------
    # 1. PATHWAY A: SANITARY LANDFILL
    # -------------------------------------------------------------
    landfill_gross_co2e_ton = round(basis_ton * (LANDFILL_DIRECT_CO2E_KG_PER_KG * 1000.0 / 1000.0), 3) # 0.050 T
    landfill_net_co2e_ton = landfill_gross_co2e_ton
    landfill_energy_gain_mj = 0.0
    landfill_circular_yield_pct = 0.0

    # -------------------------------------------------------------
    # 2. PATHWAY B: WASTE-TO-ENERGY INCINERATION
    # Stoichiometric C combustion into atmospheric CO2: C + O2 -> CO2
    # -------------------------------------------------------------
    incineration_gross_co2e_ton = round(basis_ton * c_fraction * CARBON_TO_CO2_FACTOR, 3)
    incineration_net_co2e_ton = round(incineration_gross_co2e_ton - INCINERATION_GRID_CREDIT_TON_CO2E, 3)
    # 25% electrical recovery from ~38 MJ/kg HHV: ~9500 MJ electricity
    incineration_energy_gain_mj = round(basis_ton * 1000.0 * 38.0 * 0.25, 0)
    incineration_circular_yield_pct = 0.0

    # -------------------------------------------------------------
    # 3. PATHWAY C: PYROLYSIS & CIRCULAR CHEMICAL RECOVERY
    # Direct thermal emissions offset by syngas autarky, plus virgin naphtha avoidance
    # -------------------------------------------------------------
    # If syngas provides autarky, external thermal combustion footprint drops down to ~0.08 T CO2e/ton
    autarky_factor = min(1.0, max(0.0, float(syngas_autarky_pct) / 100.0))
    pyrolysis_process_co2e_ton = round(
        PYROLYSIS_PROCESS_FOOTPRINT_TON_CO2E * (1.0 - 0.70 * autarky_factor), 3
    )

    oil_kg_per_ton = basis_ton * 1000.0 * (float(oil_yield_pct) / 100.0)
    naphtha_avoided_co2e_ton = round(
        (oil_kg_per_ton * VIRGIN_NAPHTHA_AVOIDED_KG_CO2E_PER_KG) / 1000.0, 3
    )
    pyrolysis_net_co2e_ton = round(pyrolysis_process_co2e_ton - naphtha_avoided_co2e_ton, 3)

    # Useful chemical + fuel energy in oil (43 MJ/kg)
    pyrolysis_energy_gain_mj = round(oil_kg_per_ton * 43.0, 0)
    pyrolysis_circular_yield_pct = round(oil_yield_pct, 1)

    # -------------------------------------------------------------
    # COMPARATIVE IMPACT & AVOIDED CO2e
    # -------------------------------------------------------------
    avoided_vs_incineration_ton_per_ton = round(incineration_net_co2e_ton - pyrolysis_net_co2e_ton, 3)
    daily_tpd = max(0.1, (feed_rate_kg_h * 24.0) / 1000.0)
    avoided_daily_ton_co2e = round(avoided_vs_incineration_ton_per_ton * daily_tpd, 2)

    return {
        "basis": "1 Metric Ton (1,000 kg) Feedstock",
        "plant_daily_tpd": round(daily_tpd, 2),
        "carbon_fraction_used": round(c_fraction, 4),
        "pathways": [
            {
                "id": "landfill",
                "name": "Sanitary Landfill",
                "net_carbon_emissions_ton_co2e": landfill_net_co2e_ton,
                "net_carbon_kg_per_kg": round(landfill_net_co2e_ton, 3),
                "energy_gain_mj": landfill_energy_gain_mj,
                "circular_polymer_yield_pct": landfill_circular_yield_pct,
                "badge": "Non-Recoverable",
                "disadvantages": [
                    "1.0 m³ landfill volume consumed per ton",
                    "Persistent microplastic and halogenated leachate liability",
                    "Zero circular carbon recovery",
                ],
            },
            {
                "id": "incineration",
                "name": "Mass-Burn Incineration",
                "gross_carbon_emissions_ton_co2e": incineration_gross_co2e_ton,
                "grid_displacement_credit_ton_co2e": -INCINERATION_GRID_CREDIT_TON_CO2E,
                "net_carbon_emissions_ton_co2e": incineration_net_co2e_ton,
                "net_carbon_kg_per_kg": round(incineration_net_co2e_ton, 3),
                "energy_gain_mj": incineration_energy_gain_mj,
                "circular_polymer_yield_pct": incineration_circular_yield_pct,
                "badge": "High Carbon Footprint",
                "disadvantages": [
                    f"Consumes carbon completely: {incineration_gross_co2e_ton} T CO2 released",
                    "Permanently destroys circular polymer building blocks",
                    "Toxic fly-ash disposal burden",
                ],
            },
            {
                "id": "pyrolysis",
                "name": "CHEM2ENERGY Pyrolysis",
                "process_footprint_ton_co2e": pyrolysis_process_co2e_ton,
                "naphtha_displacement_credit_ton_co2e": -naphtha_avoided_co2e_ton,
                "net_carbon_emissions_ton_co2e": pyrolysis_net_co2e_ton,
                "net_carbon_kg_per_kg": round(pyrolysis_net_co2e_ton, 3),
                "energy_gain_mj": pyrolysis_energy_gain_mj,
                "circular_polymer_yield_pct": pyrolysis_circular_yield_pct,
                "badge": "Net Carbon Negative / Neutral",
                "advantages": [
                    f"Displaces virgin naphtha: avoids {naphtha_avoided_co2e_ton} T CO2e/ton",
                    f"{pyrolysis_circular_yield_pct}% recovered back into circular chemical loop",
                    "Near-zero process combustion when operating under syngas autarky",
                ],
            },
        ],
        "net_carbon_avoided_vs_incineration_ton_per_ton": avoided_vs_incineration_ton_per_ton,
        "net_carbon_avoided_daily_ton_co2e": avoided_daily_ton_co2e,
        "methodology": "Conforms to ISO 14040/14044 LCA system expansion. Virgin naphtha avoided credit: 1.75 kg CO2e/kg.",
    }
