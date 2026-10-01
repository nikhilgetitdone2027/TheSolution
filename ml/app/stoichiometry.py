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
        "value_mj_per_kg": hhv,
        "kind": "Derived estimate",
        "method": "Dulong formula",
        "equation": "HHV (MJ/kg) = 0.3383·C + 1.422·(H − O/8) + 0.0942·S",
        "sulfur_assumption": "Sulfur is 0 because the sample has no sulfur input.",
        "chlorine_note": "Chlorine is not a term in this form of the formula.",
        "basis": "Dry identified blend. Moisture is not folded into this value.",
    }
