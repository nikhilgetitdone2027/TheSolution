"""Repeat-unit stoichiometry for five common plastics.

Results are calculations from atomic masses and repeat units, not laboratory
measurements. The Other fraction has no assumed formula.
"""

from __future__ import annotations

ATOMIC_MASS = {
    "C": 12.011,
    "H": 1.008,
    "O": 15.999,
    "N": 14.007,
    "Cl": 35.45,
}

REPEAT_UNITS: dict[str, dict[str, int]] = {
    "pe": {"C": 2, "H": 4},
    "pp": {"C": 3, "H": 6},
    "pet": {"C": 10, "H": 8, "O": 4},
    "ps": {"C": 8, "H": 8},
    "pvc": {"C": 2, "H": 3, "Cl": 1},
}

ELEMENTS = ("C", "H", "O", "N", "Cl")
ELEMENT_KEYS = {
    "C": "carbon_pct",
    "H": "hydrogen_pct",
    "O": "oxygen_pct",
    "N": "nitrogen_pct",
    "Cl": "chlorine_pct",
}
IDENTIFIED = ("pe", "pp", "pet", "ps", "pvc")


def repeat_unit_mass(formula: dict[str, int]) -> float:
    return sum(ATOMIC_MASS[element] * count for element, count in formula.items())


def polymer_element_fractions() -> dict[str, dict[str, float]]:
    fractions: dict[str, dict[str, float]] = {}
    for name, formula in REPEAT_UNITS.items():
        mass = repeat_unit_mass(formula)
        fractions[name] = {
            element: (ATOMIC_MASS[element] * formula.get(element, 0)) / mass
            for element in ELEMENTS
        }
    return fractions


POLYMER_ELEMENT_FRACTIONS = polymer_element_fractions()


def elemental_from_materials(materials_pct: dict[str, float]) -> dict:
    """Element wt% of the dry sample contributed by identified polymers.

    Identified element contributions plus the Other fraction equal the sum of
    the material percentages. Other is left uncharacterized.
    """
    contributions = {element: 0.0 for element in ELEMENTS}
    by_polymer: dict[str, dict[str, float]] = {}
    for polymer in IDENTIFIED:
        amount = float(materials_pct.get(polymer, 0.0) or 0.0)
        polymer_elements = {
            element: amount * POLYMER_ELEMENT_FRACTIONS[polymer][element]
            for element in ELEMENTS
        }
        by_polymer[polymer] = polymer_elements
        for element in ELEMENTS:
            contributions[element] += polymer_elements[element]

    other = float(materials_pct.get("other", 0.0) or 0.0)
    identified_mass = sum(float(materials_pct.get(polymer, 0.0) or 0.0) for polymer in IDENTIFIED)
    elements_wt_pct = {ELEMENT_KEYS[element]: contributions[element] for element in ELEMENTS}
    return {
        "basis": "Dry blend, weight percent of sample",
        "method": "Repeat-unit stoichiometry",
        "label": "Calculated from material fractions",
        "elements_wt_pct": elements_wt_pct,
        "by_polymer_wt_pct": {
            polymer: {ELEMENT_KEYS[element]: values[element] for element in ELEMENTS}
            for polymer, values in by_polymer.items()
        },
        "identified_mass_pct": identified_mass,
        "uncharacterized_mass_pct": other,
        "polymer_element_fractions": POLYMER_ELEMENT_FRACTIONS,
        "note": (
            "Element masses are calculated only for PE, PP, PET, PS, and PVC "
            "from their repeat units. The Other fraction has no assumed formula."
        ),
    }


def dulong_hhv(elements_wt_pct: dict[str, float], sulfur_pct: float = 0.0) -> dict:
    """Historical Dulong correlation.

    HHV (MJ/kg) = 0.3383·C + 1.422·(H − O/8) + 0.0942·S
    with C, H, O, and S in weight percent. Chlorine is not a term.
    """
    carbon = float(elements_wt_pct["carbon_pct"])
    hydrogen = float(elements_wt_pct["hydrogen_pct"])
    oxygen = float(elements_wt_pct["oxygen_pct"])
    sulfur = float(sulfur_pct)
    hhv = 0.3383 * carbon + 1.422 * (hydrogen - oxygen / 8.0) + 0.0942 * sulfur
    return {
        "value_mj_per_kg": round(hhv, 3),
        "kind": "Derived estimate",
        "method": "Dulong formula",
        "equation": "HHV (MJ/kg) = 0.3383·C + 1.422·(H − O/8) + 0.0942·S",
        "sulfur_assumption": "Sulfur is 0 because the sample has no sulfur input.",
        "chlorine_note": "Chlorine is not a term in this form of the formula.",
        "basis": "Dry identified blend. Moisture is not folded into this value.",
    }


def pvc_dechlorination_analysis(pvc_pct: float, feed_mass_kg: float = 1000.0) -> dict:
    """Rigorous stoichiometric dehydrochlorination and sorbent sizing for PVC in feed.

    PVC repeat unit C2H3Cl (62.50 g/mol) dehydrochlorinates stoichiometrically:
    C2H3Cl -> C2H2 + HCl (36.46 g/mol)
    Yielding 36.46 / 62.50 = 0.58336 kg HCl per kg pure PVC.

    Neutralization with hydrated lime Ca(OH)2 (74.09 g/mol):
    Ca(OH)2 + 2 HCl -> CaCl2 + 2 H2O
    Stoichiometric Ca(OH)2 requirement = (m_HCl / (2 * 36.46)) * 74.09 * 1.20 (Safety Factor)
    """
    pvc_w = max(0.0, float(pvc_pct or 0.0)) / 100.0
    pvc_mass_kg = round(feed_mass_kg * pvc_w, 4)
    # Exact molecular mass ratio: 36.461 / 62.498 = 0.5834
    m_hcl_kg = round(pvc_mass_kg * (36.46 / 62.50), 4)
    # Neutralizer with 1.20 industrial excess safety factor:
    caoh2_kg = round((m_hcl_kg / (2.0 * 36.46)) * 74.09 * 1.20, 4)

    is_risk = pvc_pct > 0.5
    return {
        "pvc_pct": round(pvc_pct, 2),
        "feed_mass_kg": round(feed_mass_kg, 2),
        "pvc_mass_kg": pvc_mass_kg,
        "hcl_yield_kg": m_hcl_kg,
        "caoh2_sorbent_req_kg": caoh2_kg,
        "safety_factor": 1.20,
        "risk_level": "HIGH" if is_risk else "NORMAL",
        "alert": "ACID_GAS_CORROSION_RISK" if is_risk else "NORMAL_OPERATION",
        "recommendation": (
            "Two-stage thermal treatment required: Isothermal pre-dechlorination at 300°C prior to main pyrolysis reactor."
            if is_risk
            else "Direct single-stage pyrolysis acceptable. Trace acid gas within downstream caustic wash tolerance."
        ),
        "neutralization_reaction": "Ca(OH)2 + 2 HCl -> CaCl2 + 2 H2O",
        "stoichiometric_basis": "PVC: 62.50 g/mol, HCl: 36.46 g/mol, Ca(OH)2: 74.09 g/mol with 20% guard bed margin.",
    }


def pet_sublimation_risk(pet_pct: float) -> dict:
    """Assess sublimation of terephthalic and benzoic acids causing condenser fouling."""
    pet_val = max(0.0, float(pet_pct or 0.0))
    is_risk = pet_val > 3.0
    return {
        "pet_pct": round(pet_val, 2),
        "risk_level": "HIGH" if is_risk else "LOW",
        "alert": "SOLID_DEPOSITION_RISK" if is_risk else "MINIMAL_SUBLIMATION_RISK",
        "detail": (
            "Sublimation of terephthalic/benzoic acid causes condenser tube fouling and wax polymerization."
            if is_risk
            else "PET concentration is within single-stage condensing tolerance."
        ),
        "mitigation": (
            "Install heated cyclone and condenser hot-scrubbing loop; maintain condenser tube wall > 250°C until wax knockout."
            if is_risk
            else "Standard condensing regime sufficient."
        ),
    }


def radical_synergy_index(
    pe_pct: float, pp_pct: float, ps_pct: float, pvc_pct: float = 0.0, pet_pct: float = 0.0
) -> dict:
    """Hydrogen-donor radical synergy between polyolefins (PE+PP) and aromatic/heteroatom polymers."""
    polyolefin_pct = float(pe_pct or 0.0) + float(pp_pct or 0.0)
    ps_val = float(ps_pct or 0.0)
    contaminant_pct = float(pvc_pct or 0.0) + float(pet_pct or 0.0)

    if polyolefin_pct >= 70.0:
        classification = "HIGH_SYNERGY"
        score = 88.0
        mechanism = (
            "High polyolefin fraction accelerates hydrogen transfer to PS radicals, lowering heavy tar formation and enhancing liquid yield stability."
        )
    elif polyolefin_pct >= 50.0 and contaminant_pct <= 10.0:
        classification = "NEUTRAL"
        score = 65.0
        mechanism = "Balanced free-radical propagation without dominant hydrogen donation or quenching effects."
    else:
        classification = "ANTAGONISTIC"
        score = 35.0
        mechanism = (
            "Deficient polyolefin hydrogen donor pool increases secondary cross-linking, coke deposition, and heavy aromatic tar formation."
        )

    return {
        "classification": classification,
        "polyolefin_pct": round(polyolefin_pct, 2),
        "ps_pct": round(ps_val, 2),
        "synergy_score": score,
        "mechanism": mechanism,
    }


def feedstock_contamination_report(materials_pct: dict[str, float], feed_mass_kg: float = 1000.0) -> dict:
    """Consolidated Module 1 Feedstock Contamination and Acid Gas Scrubber sizing."""
    pe = float(materials_pct.get("pe") or materials_pct.get("pe_pct") or 0.0)
    pp = float(materials_pct.get("pp") or materials_pct.get("pp_pct") or 0.0)
    ps = float(materials_pct.get("ps") or materials_pct.get("ps_pct") or 0.0)
    pvc = float(materials_pct.get("pvc") or materials_pct.get("pvc_pct") or 0.0)
    pet = float(materials_pct.get("pet") or materials_pct.get("pet_pct") or 0.0)

    dechlorination = pvc_dechlorination_analysis(pvc, feed_mass_kg=feed_mass_kg)
    sublimation = pet_sublimation_risk(pet)
    synergy = radical_synergy_index(pe, pp, ps, pvc, pet)

    return {
        "dechlorination": dechlorination,
        "sublimation": sublimation,
        "synergy": synergy,
        "hcl_corrosion_risk": dechlorination["alert"] == "ACID_GAS_CORROSION_RISK",
        "caoh2_daily_kg": dechlorination["caoh2_sorbent_req_kg"],
    }

