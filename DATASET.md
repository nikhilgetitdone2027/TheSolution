# Dataset: WPI Pyrolysis Benchmark

## Real Laboratory Provenance

The primary dataset in this repository is derived from **325 experimental runs from Belden et al., Worcester Polytechnic Institute (DOI: 10.1021/acs.energyfuels.2c00038)**.

The data was extracted directly from Supporting Information Table SI.1 in `eg2c00038_si_001.pdf` using [IngestionScript.py](file:///c:/Users/Admin/chemicalhack/IngestionScript.py) and serialized to `ml/data/demo_dataset.csv`.

Every row is labeled:
```text
WPI Pyrolysis Benchmark (Belden et al., 2022)
```

## Measured vs Derived Distinction

* **Experimentally Measured:** `oil_pct` (oil yield in wt%) was compiled from 39 peer-reviewed open literature studies spanning multiple reactor configurations (batch, fixed-bed, fluidized-bed, semi-batch, horizontal tube) across pure and mixed plastic polymers (HDPE, LDPE, PP, PS, PVC, PET).
* **Derived Mass-Balance Closures:** `gas_pct` and `char_pct` are calculated to close the stoichiometric mass balance ($100.0\%$) based on temperature-dependent cracking factors. `other_product_pct` captures residual closure.
* **Stoichiometric Repeat Units:** Elemental compositions ($C, H, O, N, Cl$) are derived from polymer repeat units via [stoichiometry.py](file:///c:/Users/Admin/chemicalhack/ml/app/stoichiometry.py).
* **High Heating Value (HHV):** Calculated with the Dulong equation only when elemental coverage of identified polymers is complete.

## Dataset Structure

* **Total Records:** 325 experimental runs
* **Thermal (Non-Catalytic) Runs:** 224 runs (prioritized)
* **Catalytic Runs:** 101 runs (flagged)
* **Features Included:** `pe_pct` (HDPE + LDPE), `pp_pct`, `pet_pct`, `ps_pct`, `pvc_pct`, `other_pct`, `temperature_c`, `residence_time_min`, `particle_size_mm`, `feed_rate_kg_h`, `moisture_pct`.
* **Targets:** `oil_pct`, `gas_pct`, `char_pct`, `other_product_pct`.

## Retraining

To re-ingest and retrain the surrogate models on this dataset:

```powershell
python IngestionScript.py
cd ml
..\.venv\Scripts\python -m app.train
```
