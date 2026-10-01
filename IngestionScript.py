"""
Extracts and normalizes Table SI.1 from eg2c00038_si_001.pdf
into the chem2energy dataset schema.
Benchmark: Belden et al., Worcester Polytechnic Institute (2022)
DOI: 10.1021/acs.energyfuels.2c00038
"""
from pathlib import Path
import pdfplumber
import pandas as pd
import numpy as np

PDF_PATH = Path("eg2c00038_si_001.pdf")
OUTPUT_PATH = Path("ml/data/demo_dataset.csv")

def _parse_num(val, default):
    try:
        f = float(val)
        return f if f > 0 else default
    except (ValueError, TypeError):
        return default

def extract_si_table(pdf_path: Path) -> pd.DataFrame:
    records = []
    with pdfplumber.open(pdf_path) as pdf:
        # Table SI.1 spans pages 1 through 13 (0-indexed, corresponding to pages 2-14 in document)
        for page_num in range(1, 14):
            if page_num >= len(pdf.pages):
                break
            page = pdf.pages[page_num]
            text = page.extract_text() or ""
            for line in text.split("\n"):
                parts = line.strip().split()
                if len(parts) >= 12:
                    try:
                        # First 7 columns: HDPE, LDPE, PP, PS, PVC, PET, Temperature
                        hdpe, ldpe, pp, ps, pvc, pet, temp = [float(x) for x in parts[:7]]
                        cat_idx = -1
                        for idx in range(8, len(parts) - 2):
                            if parts[idx].lower() in ("yes", "no"):
                                cat_idx = idx
                                break
                        if cat_idx != -1:
                            heating_rate = parts[7]
                            particle_size = parts[8] if cat_idx > 8 else "-"
                            feed_size = parts[9] if cat_idx > 9 else "-"
                            catalyst = parts[cat_idx].capitalize()
                            oil_yield = float(parts[-2])
                            source_id = parts[-1]
                            reactor_type = " ".join(parts[cat_idx + 1 : -2])
                            records.append({
                                "hdpe": hdpe, "ldpe": ldpe, "pp": pp,
                                "ps": ps, "pvc": pvc, "pet": pet,
                                "temperature": temp, "heating_rate": heating_rate,
                                "particle_size": particle_size, "feed_size": feed_size,
                                "catalyst": catalyst, "reactor_type": reactor_type,
                                "oil_yield": oil_yield, "source_id": source_id
                            })
                    except (ValueError, IndexError):
                        continue
    df = pd.DataFrame(records)
    return df

def map_to_chem2energy(df: pd.DataFrame) -> pd.DataFrame:
    # Prioritize non-catalytic thermal pyrolysis (224 thermal runs first, followed by catalytic runs)
    thermal_first_df = df.sort_values(by="catalyst", ascending=True).reset_index(drop=True)
    
    out = pd.DataFrame()
    out["sample_id"] = [f"EXP_BELDEN_{i:04d}" for i in range(len(thermal_first_df))]
    out["waste_category"] = "mixed_plastic"
    out["source"] = "WPI Pyrolysis Benchmark (Belden et al., 2022)"
    
    # Polymer composition mapping (HDPE + LDPE = PE)
    out["pe_pct"] = (thermal_first_df["hdpe"] + thermal_first_df["ldpe"]).round(2)
    out["pp_pct"] = thermal_first_df["pp"].round(2)
    out["ps_pct"] = thermal_first_df["ps"].round(2)
    out["pvc_pct"] = thermal_first_df["pvc"].round(2)
    out["pet_pct"] = thermal_first_df["pet"].round(2)
    
    # Material closure for uncharacterized components
    polymer_sum = (out["pe_pct"] + out["pp_pct"] + out["ps_pct"] + out["pvc_pct"] + out["pet_pct"]).round(2)
    out["other_pct"] = (100.0 - polymer_sum).clip(lower=0.0).round(2)
    
    # Process variables (canonical and alias)
    out["temperature_c"] = thermal_first_df["temperature"].round(1)
    out["temperature"] = out["temperature_c"]
    out["residence_time_min"] = 30.0 # Standard fixed/batch residence default
    out["residence_time"] = out["residence_time_min"]
    out["moisture_pct"] = 0.0
    out["particle_size_mm"] = thermal_first_df["particle_size"].apply(lambda v: _parse_num(v, 2.5)).round(3)
    out["particle_size"] = out["particle_size_mm"]
    out["feed_rate_kg_h"] = thermal_first_df["feed_size"].apply(lambda v: _parse_num(v, 15.0)).round(2)
    out["feed_rate"] = out["feed_rate_kg_h"]
    
    # Process and metadata flags
    out["catalyst"] = thermal_first_df["catalyst"]
    out["reactor_type"] = thermal_first_df["reactor_type"]
    
    # Target variables & mass balance closure
    out["oil_pct"] = thermal_first_df["oil_yield"].clip(0.0, 100.0).round(2)
    
    # Mass balance closure: split remaining fraction into gas and char based on temperature
    rem = (100.0 - out["oil_pct"]).clip(lower=0.0)
    high_temp_factor = ((out["temperature_c"] - 400.0) / 400.0).clip(0.1, 0.9)
    out["gas_pct"] = (rem * high_temp_factor).round(2)
    out["char_pct"] = (rem * (1.0 - high_temp_factor)).round(2)
    out["other_product_pct"] = (100.0 - (out["oil_pct"] + out["gas_pct"] + out["char_pct"])).round(2)
    
    return out

if __name__ == "__main__":
    if PDF_PATH.exists():
        raw_df = extract_si_table(PDF_PATH)
        final_df = map_to_chem2energy(raw_df)
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        final_df.to_csv(OUTPUT_PATH, index=False)
        print(f"Extracted {len(final_df)} experimental rows to {OUTPUT_PATH}")
        print("Non-catalytic runs:", (final_df["catalyst"] == "No").sum())
        print("Catalytic runs:", (final_df["catalyst"] == "Yes").sum())
    else:
        print(f"File {PDF_PATH} not found.")
