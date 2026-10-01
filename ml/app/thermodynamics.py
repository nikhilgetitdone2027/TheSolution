"""Thermodynamics, Feedstock Higher Heating Value (HHV), and Thermal Autarky Module.

Deterministic physical balances based on empirical polymer heat capacities,
endothermic cracking enthalpy, and syngas calorific values.
"""

from __future__ import annotations

from typing import Any

# Standard polymer elemental mass fractions (weight %)
POLYMER_ELEMENTS_WT = {
    "pe": {"C": 85.71, "H": 14.29, "O": 0.0, "Cl": 0.0},
    "pp": {"C": 85.71, "H": 14.29, "O": 0.0, "Cl": 0.0},
    "ps": {"C": 92.26, "H": 7.74, "O": 0.0, "Cl": 0.0},
    "pvc": {"C": 38.43, "H": 4.84, "O": 0.0, "Cl": 56.73},
    "pet": {"C": 62.50, "H": 4.17, "O": 33.33, "Cl": 0.0},
}

STANDARD_CP_KJ_KG_K = 2.10          # Mean specific heat capacity of mixed polymers (kJ/kg-K)
DELTA_H_RXN_KJ_KG = 1050.0          # Endothermic cracking enthalpy for polyolefins (kJ/kg)
CASING_LOSS_FACTOR = 0.15           # 15% convective and radiative reactor thermal losses
LHV_GAS_MJ_KG = 32.0                # Lower heating value of non-condensable hydrocarbon cracked syngas (MJ/kg)
LHV_OIL_MJ_KG = 43.0                # Typical synthetic crude / pyrolysis oil heating value (MJ/kg)
PARASITIC_ELEC_MJ_KG = 0.180        # Parasitic electricity demand (50 kWh/ton = 0.18 MJ/kg)


def aggregate_elemental_composition(materials_pct: dict[str, float]) -> dict[str, float]:
    """Calculate aggregate elemental fractions (C, H, O, Cl wt%) from polymer composition."""
    total_identified = sum(
        float(materials_pct.get(p) or materials_pct.get(f"{p}_pct") or 0.0)
        for p in ("pe", "pp", "ps", "pvc", "pet")
    )
    if total_identified <= 0.0:
        return {"C": 85.71, "H": 14.29, "O": 0.0, "Cl": 0.0}

    c_sum = 0.0
    h_sum = 0.0
    o_sum = 0.0
    cl_sum = 0.0

    for p, elements in POLYMER_ELEMENTS_WT.items():
        frac = float(materials_pct.get(p) or materials_pct.get(f"{p}_pct") or 0.0) / total_identified
        c_sum += frac * elements["C"]
        h_sum += frac * elements["H"]
        o_sum += frac * elements["O"]
        cl_sum += frac * elements["Cl"]

    return {
        "C": round(c_sum, 2),
        "H": round(h_sum, 2),
        "O": round(o_sum, 2),
        "Cl": round(cl_sum, 2),
    }


def dulong_boie_hhv(elements: dict[str, float]) -> dict[str, Any]:
    """Modified Dulong/Boie correlation for Higher Heating Value (HHV):
    HHV (MJ/kg) = 0.3491·C + 1.1783·H − 0.1034·O − 0.0151·Cl
    Where C, H, O, Cl are in weight percent.
    """
    c = float(elements.get("C", 0.0))
    h = float(elements.get("H", 0.0))
    o = float(elements.get("O", 0.0))
    cl = float(elements.get("Cl", 0.0))

    hhv = 0.3491 * c + 1.1783 * h - 0.1034 * o - 0.0151 * cl
    hhv_val = round(max(0.0, hhv), 3)

    return {
        "hhv_mj_kg": hhv_val,
        "formula": "HHV (MJ/kg) = 0.3491·C + 1.1783·H − 0.1034·O − 0.0151·Cl",
        "elements_basis": {"C_pct": c, "H_pct": h, "O_pct": o, "Cl_pct": cl},
        "method": "Modified Dulong/Boie Correlation",
    }


def reactor_thermal_demand(
    feed_mass_kg: float,
    temperature_c: float,
    ambient_t_c: float = 25.0,
    cp_kj_kg_k: float = STANDARD_CP_KJ_KG_K,
    delta_h_rxn_kj_kg: float = DELTA_H_RXN_KJ_KG,
    loss_factor: float = CASING_LOSS_FACTOR,
) -> dict[str, Any]:
    """Calculate reactor parasitic sensible and endothermic cracking heat demand.
    Q_sensible = m_feed · cp · (T_reactor - 25)
    Q_rxn = m_feed · delta_h_rxn
    Q_total = (Q_sensible + Q_rxn) · (1 + loss_factor)
    """
    m_feed = max(0.1, float(feed_mass_kg))
    temp = max(ambient_t_c, float(temperature_c))
    delta_t = temp - ambient_t_c

    q_sensible_kj = m_feed * cp_kj_kg_k * delta_t
    q_rxn_kj = m_feed * delta_h_rxn_kj_kg
    q_subtotal_kj = q_sensible_kj + q_rxn_kj
    q_casing_loss_kj = q_subtotal_kj * loss_factor
    q_total_kj = q_subtotal_kj + q_casing_loss_kj

    return {
        "feed_mass_kg": round(m_feed, 2),
        "temperature_c": round(temp, 1),
        "delta_t_k": round(delta_t, 1),
        "cp_kj_kg_k": cp_kj_kg_k,
        "delta_h_rxn_kj_kg": delta_h_rxn_kj_kg,
        "loss_factor_pct": round(loss_factor * 100.0, 1),
        "q_sensible_mj": round(q_sensible_kj / 1000.0, 2),
        "q_reaction_mj": round(q_rxn_kj / 1000.0, 2),
        "q_casing_loss_mj": round(q_casing_loss_kj / 1000.0, 2),
        "q_total_thermal_mj": round(q_total_kj / 1000.0, 2),
    }


def compute_thermal_autarky(
    feed_mass_kg: float,
    temperature_c: float,
    gas_yield_pct: float,
    oil_yield_pct: float,
    lhv_gas_mj_kg: float = LHV_GAS_MJ_KG,
    lhv_oil_mj_kg: float = LHV_OIL_MJ_KG,
) -> dict[str, Any]:
    """Calculate Net Energy Ratio (NER) and Syngas Thermal Autarky Ratio:
    Autarky (%) = min(100.0, (E_gas / Q_total_thermal) * 100)
    NER = (E_oil + E_gas) / (Q_total_thermal + E_parasitic_elec)
    """
    m_feed = max(0.1, float(feed_mass_kg))
    thermal = reactor_thermal_demand(m_feed, temperature_c)
    q_total_mj = thermal["q_total_thermal_mj"]

    m_gas_kg = m_feed * (float(gas_yield_pct) / 100.0)
    m_oil_kg = m_feed * (float(oil_yield_pct) / 100.0)

    e_gas_mj = m_gas_kg * lhv_gas_mj_kg
    e_oil_mj = m_oil_kg * lhv_oil_mj_kg
    e_elec_mj = m_feed * PARASITIC_ELEC_MJ_KG

    total_useful_energy_mj = e_oil_mj + e_gas_mj
    total_energy_input_mj = q_total_mj + e_elec_mj

    autarky_pct = round(min(100.0, (e_gas_mj / q_total_mj) * 100.0) if q_total_mj > 0 else 100.0, 1)
    actual_ratio = round((e_gas_mj / q_total_mj), 3) if q_total_mj > 0 else 1.0
    ner = round(total_useful_energy_mj / total_energy_input_mj, 2) if total_energy_input_mj > 0 else 0.0

    is_self_sustained = e_gas_mj >= q_total_mj

    return {
        "feed_mass_kg": round(m_feed, 2),
        "temperature_c": round(temperature_c, 1),
        "gas_mass_kg": round(m_gas_kg, 2),
        "oil_mass_kg": round(m_oil_kg, 2),
        "e_gas_recovered_mj": round(e_gas_mj, 2),
        "e_oil_recovered_mj": round(e_oil_mj, 2),
        "q_total_thermal_demand_mj": q_total_mj,
        "parasitic_elec_mj": round(e_elec_mj, 2),
        "thermal_autarky_pct": autarky_pct,
        "autarky_ratio": actual_ratio,
        "net_energy_ratio_ner": ner,
        "self_sustained": is_self_sustained,
        "assessment": (
            "100% Thermally Autarkic: Non-condensable syngas fully satisfies all reactor sensible heat and cracking duty without auxiliary natural gas."
            if is_self_sustained
            else f"Partially Autarkic ({autarky_pct}%): Supplemental external gas combustion required for remaining {round(q_total_mj - e_gas_mj, 1)} MJ duty."
        ),
        "thermal_breakdown": thermal,
    }


def thermodynamic_intelligence_report(
    materials_pct: dict[str, float],
    temperature_c: float,
    gas_yield_pct: float,
    oil_yield_pct: float,
    feed_mass_kg: float = 1000.0,
) -> dict[str, Any]:
    """Consolidated Module 2 Thermodynamics & Thermal Autarky Report."""
    elements = aggregate_elemental_composition(materials_pct)
    boie = dulong_boie_hhv(elements)
    autarky = compute_thermal_autarky(
        feed_mass_kg=feed_mass_kg,
        temperature_c=temperature_c,
        gas_yield_pct=gas_yield_pct,
        oil_yield_pct=oil_yield_pct,
    )
    return {
        "elemental_blend": elements,
        "feedstock_hhv": boie,
        "autarky": autarky,
    }
