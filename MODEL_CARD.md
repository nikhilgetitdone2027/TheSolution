# Model Card: Pyrolysis Surrogate Model

## Model Purpose

Estimate the product mass distribution of mixed-plastic pyrolysis from material fractions and process inputs, enabling operators to evaluate recovery pathways and optimize reactor configurations strictly within the domain of experimental literature data.

The model is a decision-support surrogate component for chemical intelligence.

## Training Data & Provenance

* **Identifier:** `wpi-belden-2022-v1`
* **Label:** WPI Pyrolysis Benchmark (Belden et al., 2022)
* **Provenance:** 325 experimental runs from Belden et al., Worcester Polytechnic Institute (DOI: [10.1021/acs.energyfuels.2c00038](https://doi.org/10.1021/acs.energyfuels.2c00038)), compiled from 39 open literature studies.
* **Nature:** Experimental benchmark dataset.
* **Measured vs. Derived Distinction:**
  * `oil_pct` is **experimentally measured**.
  * `gas_pct` and `char_pct` are **derived mass-balance closures**.
* **Features Used:** `pe_pct`, `pp_pct`, `pet_pct`, `ps_pct`, `pvc_pct`, `moisture_pct`, `particle_size_mm`, `feed_rate_kg_h`, `temperature_c`, `residence_time_min`.
* **Collinearity Handling:** `other_pct` is automatically omitted from model features when material fractions sum to 100% to prevent linear dependency.

## Evaluation Method & Candidate Comparison

1. **Split Strategy:** 80% training set (260 runs) and 20% holdout test set (65 runs) with `random_state = 20260330`.
2. **Cross-Validation:** 5-fold cross-validation evaluated strictly on the training set to prevent data leakage.
3. **Model Candidates:** Scaled Linear Regression, Random Forest Regressor, and Multi-Output Gradient Boosting Regressor.
4. **Selection Criterion:** Selected model based on holdout validation performance (lowest Test MAE).

### Candidate Comparison Table

| Model Architecture | 5-Fold CV MAE (%) | 5-Fold CV RMSE (%) | 5-Fold CV R² | Holdout Test MAE (%) | Holdout Test RMSE (%) | Holdout Test R² |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Gradient Boosting (Selected)** | **5.373** | **7.940** | **0.479** | **4.433** | **7.959** | **0.395** |
| **Random Forest** | 5.754 | 8.452 | 0.480 | 4.626 | 8.337 | 0.546 |
| **Linear Regression** | 8.376 | 10.893 | 0.320 | 7.759 | 11.540 | 0.396 |

### Selected Production Model: Gradient Boosting Regressor

* **Hyperparameters:** `n_estimators = 160`, `learning_rate = 0.08`, `max_depth = 3`, `loss = squared_error`, `random_state = 20260330`.
* **Overall Holdout Test Metrics:**
  * Mean Absolute Error (MAE): **4.433%**
  * Root Mean Squared Error (RMSE): **7.959%**
  * Average Multi-Output R²: **0.395**
* **Per-Target Holdout Test Performance:**
  * **Gas Yield (`gas_pct`):** MAE = **3.013%**, RMSE = **5.594%**, **R² = 0.902**
  * **Oil Yield (`oil_pct` - Measured):** MAE = **8.276%**, RMSE = **11.731%**, **R² = 0.748**
  * **Char Yield (`char_pct`):** MAE = **6.441%**, RMSE = **9.192%**, **R² = 0.698**
  * **Other Products (`other_product_pct`):** MAE = **0.001%**, RMSE = **0.002%**, **R² = -0.768** (near-zero variance)

## Inference Post-Processing

Raw regressor outputs are clipped at zero ($[0, 100]$) and normalized such that:
$$\text{oil\_pct} + \text{gas\_pct} + \text{char\_pct} + \text{other\_product\_pct} = 100.0\%$$

## Out-of-Distribution & Optimization Boundary

* The optimizer restricts candidate evaluations to the actual empirical bounds observed in the training dataset:
  * **Temperature:** $250.0^\circ\text{C}$ to $850.0^\circ\text{C}$
  * **Residence Time:** $30.0\,\text{min}$
  * **Particle Size:** $0.225\,\text{mm}$ to $100.0\,\text{mm}$
  * **Feed Rate:** $0.6\,\text{kg/h}$ to $1000.0\,\text{kg/h}$
* Inputs outside these bounds are flagged as extrapolated and blocked from ungrounded recommendations.

## Explainability

* Permutation feature importance on the holdout split quantifies the relative impact of each feature on mean absolute error degradation.
