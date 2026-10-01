"""Downstream Pyrolysis Oil Upgrading, Effective H/C Ratio, and PONA Estimator.

Evaluates the chemical quality of condensed pyrolysis oil against standard
petrochemical refinery feed specifications (ASTM D5443 PONA, EN 590 diesel).
"""

from __future__ import annotations

from typing import Any

# Stoichiometric molar weights
M_CARBON = 12.011
M_HYDROGEN = 1.008


def estimate_oil_elemental(materials_pct: dict[str, float]) -> dict[str, float]:
    """Estimate C and H weight percent in the condensed pyrolysis oil cut
    based on feed polymer precursors and thermal cracking partition.
    """
    pe = float(materials_pct.get("pe") or materials_pct.get("pe_pct") or 0.0)
    pp = float(materials_pct.get("pp") or materials_pct.get("pp_pct") or 0.0)
    ps = float(materials_pct.get("ps") or materials_pct.get("ps_pct") or 0.0)
    pvc = float(materials_pct.get("pvc") or materials_pct.get("pvc_pct") or 0.0)
    pet = float(materials_pct.get("pet") or materials_pct.get("pet_pct") or 0.0)

    total = pe + pp + ps + pvc + pet
    if total <= 0.0:
        return {"C_oil_wt": 85.71, "H_oil_wt": 14.29, "O_oil_wt": 0.0, "Cl_oil_wt": 0.0}

    # Polymer precursor oil-phase contribution factors
    c_wt = (
        (pe + pp) * 85.71
        + ps * 92.26
        + pvc * 85.00  # post-dechlorination aromatic backbone
        + pet * 65.00
    ) / total

    h_wt = (
        (pe + pp) * 14.29
        + ps * 7.74
        + pvc * 7.00
        + pet * 4.50
    ) / total

    o_wt = (pet * 30.50) / total
    cl_wt = (pvc * 8.00) / total

    return {
        "C_oil_wt": round(c_wt, 2),
        "H_oil_wt": round(h_wt, 2),
        "O_oil_wt": round(o_wt, 2),
        "Cl_oil_wt": round(cl_wt, 2),
    }


def compute_effective_hc_ratio(c_oil_wt: float, h_oil_wt: float) -> dict[str, Any]:
    """Calculate effective H/C atomic ratio:
    H/C = (H_oil_wt% / 1.008) / (C_oil_wt% / 12.011)
    """
    c = max(1.0, float(c_oil_wt))
    h = max(0.1, float(h_oil_wt))

    moles_h = h / M_HYDROGEN
    moles_c = c / M_CARBON
    hc_ratio = round(moles_h / moles_c, 3)

    if hc_ratio >= 1.85:
        category = "High Paraffinic/Olefinic Aliphatic Cut"
        color_badge = "emerald"
    elif hc_ratio >= 1.60:
        category = "Mixed Synthetic Crude"
        color_badge = "amber"
    else:
        category = "Heavy Aromatic Cut (Styrene/Polyaromatic Oligomers)"
        color_badge = "rose"

    return {
        "hc_atomic_ratio": hc_ratio,
        "classification": category,
        "color_badge": color_badge,
        "moles_h_per_kg": round(moles_h * 10.0, 2),
        "moles_c_per_kg": round(moles_c * 10.0, 2),
        "c_oil_wt": c,
        "h_oil_wt": h,
    }


def estimate_pona_distribution(materials_pct: dict[str, float]) -> dict[str, Any]:
    """Estimate PONA (Paraffins, Olefins, Naphthenes, Aromatics) distribution.
    PE & PP yield linear aliphatics (paraffins & 1-alkenes).
    PS thermally depolymerizes primarily into monomeric, dimeric, and trimeric styrene aromatics.
    PVC & PET yield polar naphthenes, terephthalates, and condensed cyclics.
    All percentages strictly sum to 100.0%.
    """
    pe = float(materials_pct.get("pe") or materials_pct.get("pe_pct") or 0.0)
    pp = float(materials_pct.get("pp") or materials_pct.get("pp_pct") or 0.0)
    ps = float(materials_pct.get("ps") or materials_pct.get("ps_pct") or 0.0)
    pvc = float(materials_pct.get("pvc") or materials_pct.get("pvc_pct") or 0.0)
    pet = float(materials_pct.get("pet") or materials_pct.get("pet_pct") or 0.0)
    other = float(materials_pct.get("other") or materials_pct.get("other_pct") or 0.0)

    total = pe + pp + ps + pvc + pet + other
    if total <= 0.0:
        total = 100.0
        pe = 100.0

    # Normalized polymer fractions
    f_pe = pe / total
    f_pp = pp / total
    f_ps = ps / total
    f_pvc = pvc / total
    f_pet = pet / total
    f_oth = other / total

    # Polyolefins partition into ~52% paraffins, ~40% alpha-olefins, ~6% cyclics/naphthenes, ~2% monoaromatics
    # PS partitions into ~92% aromatics (styrene, toluene, ethylbenzene), ~8% naphthenes/other
    paraffins = (f_pe * 0.54 + f_pp * 0.48) * 100.0
    olefins = (f_pe * 0.40 + f_pp * 0.44) * 100.0
    aromatics = (f_ps * 0.92 + f_pvc * 0.35 + (f_pe + f_pp) * 0.03) * 100.0
    naphthenes_oxygenates = (
        (f_pe + f_pp) * 0.04
        + f_ps * 0.08
        + f_pet * 0.90
        + f_pvc * 0.65
        + f_oth * 0.90
    ) * 100.0

    # Re-normalize to ensure strictly 100.0% sum
    subtotal = paraffins + olefins + aromatics + naphthenes_oxygenates
    if subtotal > 0:
        p_pct = round(100.0 * paraffins / subtotal, 1)
        o_pct = round(100.0 * olefins / subtotal, 1)
        a_pct = round(100.0 * aromatics / subtotal, 1)
        n_pct = round(100.0 - (p_pct + o_pct + a_pct), 1)
    else:
        p_pct, o_pct, a_pct, n_pct = 50.0, 40.0, 5.0, 5.0

    return {
        "paraffins_pct": p_pct,
        "olefins_pct": o_pct,
        "aromatics_pct": a_pct,
        "naphthenes_oxygenates_pct": n_pct,
        "pona_sum_pct": round(p_pct + o_pct + a_pct + n_pct, 1),
        "dominant_fraction": (
            "Paraffins & Olefins (Aliphatic)"
            if (p_pct + o_pct) >= 60.0
            else "Aromatics (Styrenic)"
            if a_pct >= 40.0
            else "Mixed Hydrocarbons"
        ),
    }


def refinery_routing_verdict(
    hc_ratio: float,
    pvc_pct: float,
    pet_pct: float,
) -> dict[str, Any]:
    """Emit an industrial refinery routing classification based on H/C ratio and contaminant thresholds."""
    if hc_ratio >= 1.85 and pvc_pct <= 0.5 and pet_pct <= 2.0:
        route_id = "steam_cracker"
        verdict = "Direct Petrochemical Feedstock: Suitable for steam cracker blending up to 10% without hydrotreatment."
        tier = "Tier 1: High-Value Chemical Feedstock"
    elif hc_ratio >= 1.60 and pvc_pct <= 1.5:
        route_id = "hydroprocessing"
        verdict = "Hydroprocessing Required: Saturated dewaxing & de-aromatization needed for EN 590 diesel compliance."
        tier = "Tier 2: Transportation Fuel Blendstock"
    else:
        route_id = "industrial_fuel_oil"
        verdict = "Heavy Industrial Fuel Oil: Sub-spec for transportation; suitable for industrial boilers/furnaces."
        tier = "Tier 3: Low-Specification Industrial Fuel"

    return {
        "route_id": route_id,
        "verdict": verdict,
        "tier": tier,
        "hydrotreatment_mandatory": route_id != "steam_cracker",
    }


def oil_quality_intelligence_report(
    materials_pct: dict[str, float],
    pvc_pct: float,
    pet_pct: float,
) -> dict[str, Any]:
    """Consolidated Module 3 Downstream Oil Quality Report."""
    elements = estimate_oil_elemental(materials_pct)
    hc = compute_effective_hc_ratio(elements["C_oil_wt"], elements["H_oil_wt"])
    pona = estimate_pona_distribution(materials_pct)
    verdict = refinery_routing_verdict(hc["hc_atomic_ratio"], pvc_pct, pet_pct)

    return {
        "oil_elemental": elements,
        "hc_ratio": hc,
        "pona": pona,
        "refinery_verdict": verdict,
    }
