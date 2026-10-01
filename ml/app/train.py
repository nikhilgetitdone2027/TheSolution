"""Train, evaluate, and save the pyrolysis product model.

Preprocessing is fit only inside each training fold. Model choice uses
cross-validation on the training split. The holdout split is used once, for
the reported metrics and permutation importance.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_validate, train_test_split
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.config import (
    ARTIFACT_DIR,
    DATASET_ID,
    DATASET_LABEL,
    DATASET_PATH,
    FEATURE_META,
    FEATURE_POOL,
    MATERIAL_COLUMNS,
    META_PATH,
    MODEL_PATH,
    OPTIMIZABLE_COLUMNS,
    RANDOM_STATE,
    TARGET_COLUMNS,
    TARGET_META,
)
from app.numbers import jsonable, rounded
from app.simulator import generate_demo_frame

IDENTIFIED_MATERIALS = ["pe_pct", "pp_pct", "pet_pct", "ps_pct", "pvc_pct"]


def ensure_dataset() -> pd.DataFrame:
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DATASET_PATH.exists():
        return pd.read_csv(DATASET_PATH)
    frame = generate_demo_frame()
    frame.to_csv(DATASET_PATH, index=False)
    return frame


def resolve_features(frame: pd.DataFrame) -> tuple[list[str], list[dict[str, str]]]:
    present = [column for column in FEATURE_POOL if column in frame.columns]
    omitted: list[dict[str, str]] = []
    if set(MATERIAL_COLUMNS).issubset(frame.columns):
        closure = frame[MATERIAL_COLUMNS].sum(axis=1)
        if float((closure - 100).abs().max()) <= 1.0 and "other_pct" in present:
            present.remove("other_pct")
            omitted.append(
                {
                    "feature": "other_pct",
                    "reason": (
                        "Omitted from the model because the six material fractions "
                        "sum to 100% and would be perfectly collinear."
                    ),
                }
            )
    elemental = [
        column
        for column in ("carbon_pct", "hydrogen_pct", "oxygen_pct", "nitrogen_pct", "chlorine_pct")
        if column in frame.columns
    ]
    if elemental and set(IDENTIFIED_MATERIALS).issubset(frame.columns):
        # The demo generator does not store elemental columns. If a future
        # dataset adds elemental columns that are not independent measurements,
        # the caller can still drop them by leaving them out of the file.
        pass
    missing_from_pool = [column for column in FEATURE_POOL if column not in frame.columns]
    for column in missing_from_pool:
        if column == "other_pct":
            continue
        omitted.append(
            {
                "feature": column,
                "reason": "Column is not in this dataset, so this part of the model is disabled.",
            }
        )
    return present, omitted


def _candidates(fast: bool = False) -> list[tuple[str, Any]]:
    forest_trees = 40 if fast else 200
    boosting_trees = 40 if fast else 160
    return [
        (
            "Linear Regression",
            Pipeline(
                [
                    ("scaler", StandardScaler()),
                    ("model", LinearRegression()),
                ]
            ),
        ),
        (
            "Random Forest",
            RandomForestRegressor(
                n_estimators=forest_trees,
                max_depth=8,
                min_samples_leaf=2,
                random_state=RANDOM_STATE,
                n_jobs=1,
            ),
        ),
        (
            "Gradient Boosting",
            MultiOutputRegressor(
                GradientBoostingRegressor(
                    n_estimators=boosting_trees,
                    max_depth=3,
                    learning_rate=0.08,
                    random_state=RANDOM_STATE,
                )
            ),
        ),
    ]


def _metric_block(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, Any]:
    per_target = {}
    for index, target in enumerate(TARGET_COLUMNS):
        per_target[target] = {
            "label": TARGET_META[target]["label"],
            "mae": rounded(mean_absolute_error(y_true[:, index], y_pred[:, index]), 3),
            "rmse": rounded(float(np.sqrt(mean_squared_error(y_true[:, index], y_pred[:, index]))), 3),
            "r2": rounded(r2_score(y_true[:, index], y_pred[:, index]), 3),
        }
    return {
        "per_target": per_target,
        "mae": rounded(mean_absolute_error(y_true, y_pred), 3),
        "rmse": rounded(float(np.sqrt(mean_squared_error(y_true, y_pred))), 3),
        "r2": rounded(r2_score(y_true, y_pred, multioutput="uniform_average"), 3),
    }


def train_and_save(
    frame: pd.DataFrame | None = None,
    cv_folds: int = 5,
    fast: bool = False,
    model_path: Path | None = None,
    meta_path: Path | None = None,
) -> dict[str, Any]:
    if frame is None:
        frame = ensure_dataset()
    features, omitted = resolve_features(frame)
    missing_targets = [column for column in TARGET_COLUMNS if column not in frame.columns]
    if missing_targets:
        raise ValueError(f"Dataset is missing target columns: {', '.join(missing_targets)}")
    if len(features) < 2:
        raise ValueError("Dataset does not contain enough feature columns to train.")

    feature_frame = frame[features].apply(pd.to_numeric, errors="coerce")
    target_frame = frame[TARGET_COLUMNS].apply(pd.to_numeric, errors="coerce")
    valid = feature_frame.notna().all(axis=1) & target_frame.notna().all(axis=1)
    feature_frame = feature_frame.loc[valid]
    target_frame = target_frame.loc[valid]
    if len(feature_frame) < 40:
        raise ValueError("Need at least 40 complete rows to train and validate.")

    x_train, x_test, y_train, y_test = train_test_split(
        feature_frame,
        target_frame,
        test_size=0.2,
        random_state=RANDOM_STATE,
    )
    folds = 5 if len(x_train) >= 80 else 3
    folds = min(folds, cv_folds)
    cv = KFold(n_splits=folds, shuffle=True, random_state=RANDOM_STATE)
    scoring = {
        "mae": "neg_mean_absolute_error",
        "rmse": "neg_root_mean_squared_error",
        "r2": "r2",
    }

    candidate_rows = []
    fitted: dict[str, Any] = {}
    for name, estimator in _candidates(fast=fast):
        scores = cross_validate(
            estimator,
            x_train,
            y_train,
            cv=cv,
            scoring=scoring,
            n_jobs=1,
        )
        candidate_rows.append(
            {
                "model": name,
                "mae": rounded(-float(scores["test_mae"].mean()), 3),
                "rmse": rounded(-float(scores["test_rmse"].mean()), 3),
                "r2": rounded(float(scores["test_r2"].mean()), 3),
            }
        )
        estimator.fit(x_train, y_train)
        fitted[name] = estimator

    selected_name = min(candidate_rows, key=lambda row: row["mae"])["model"]
    selected = fitted[selected_name]
    holdout_pred = selected.predict(x_test)
    holdout = _metric_block(y_test.to_numpy(), np.asarray(holdout_pred))

    importance = permutation_importance(
        selected,
        x_test,
        y_test,
        n_repeats=8,
        random_state=RANDOM_STATE,
        scoring="neg_mean_absolute_error",
        n_jobs=1,
    )
    importance_rows = []
    for index, feature in enumerate(features):
        importance_rows.append(
            {
                "feature": feature,
                "label": FEATURE_META[feature]["label"],
                "unit": FEATURE_META[feature]["unit"],
                "group": FEATURE_META[feature]["group"],
                "mean_mae_increase": rounded(float(importance.importances_mean[index]), 4),
                "std_mae_increase": rounded(float(importance.importances_std[index]), 4),
            }
        )
    importance_rows.sort(key=lambda row: row["mean_mae_increase"], reverse=True)

    ranges = {}
    for column in OPTIMIZABLE_COLUMNS:
        if column in x_train.columns:
            ranges[column] = {
                "min": rounded(float(x_train[column].min()), 3),
                "max": rounded(float(x_train[column].max()), 3),
                "unit": FEATURE_META[column]["unit"],
                "label": FEATURE_META[column]["label"],
            }
    feature_ranges = {}
    for column in features:
        feature_ranges[column] = {
            "min": rounded(float(x_train[column].min()), 3),
            "max": rounded(float(x_train[column].max()), 3),
            "unit": FEATURE_META[column]["unit"],
            "label": FEATURE_META[column]["label"],
        }

    meta = {
        "dataset": {
            "id": DATASET_ID,
            "label": DATASET_LABEL,
            "nature": "synthetic",
            "rows": int(len(frame)),
            "complete_rows": int(len(feature_frame)),
            "disclaimer": (
                "Metrics describe how well the model recovers an illustrative "
                "simulator. They are not laboratory accuracy."
            ),
        },
        "features": features,
        "feature_meta": {feature: FEATURE_META[feature] for feature in features},
        "omitted_features": omitted,
        "targets": TARGET_COLUMNS,
        "target_meta": TARGET_META,
        "split": {
            "strategy": "Holdout plus k-fold cross-validation on the training split only",
            "test_size": 0.2,
            "random_state": RANDOM_STATE,
            "n_train": int(len(x_train)),
            "n_validation_holdout": int(len(x_test)),
            "cv_folds": folds,
        },
        "candidates": candidate_rows,
        "selected": {
            "model": selected_name,
            "reason": "Lowest mean absolute error under cross-validation on the training split.",
        },
        "holdout_metrics": holdout,
        "feature_importance": {
            "method": "Permutation importance",
            "label": "Permutation importance on the holdout split. Not SHAP.",
            "scoring": "Increase in mean absolute error after shuffling the feature",
            "rows": importance_rows,
        },
        "optimization_boundary": {
            "source": "Minimum and maximum of the training split",
            "note": "The optimizer searches only inside this range.",
            "ranges": ranges,
        },
        "feature_ranges": feature_ranges,
        "supports_ensemble_spread": selected_name == "Random Forest",
        "postprocess": "Inference clips negative outputs at zero and renormalizes the four products to 100%.",
        "intended_use": "Decision-support demonstration for mixed-plastic pyrolysis configurations.",
        "non_intended_use": "Plant design, regulatory reporting, or a substitute for laboratory yields.",
    }

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    destination_model = model_path or MODEL_PATH
    destination_meta = meta_path or META_PATH
    destination_model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": selected, "features": features, "targets": TARGET_COLUMNS}, destination_model)
    destination_meta.write_text(json.dumps(jsonable(meta), indent=2), encoding="utf-8")
    return meta


if __name__ == "__main__":
    saved = train_and_save()
    print(json.dumps(saved["selected"], indent=2))
    print(json.dumps(saved["candidates"], indent=2))
    print(json.dumps(saved["holdout_metrics"], indent=2))
