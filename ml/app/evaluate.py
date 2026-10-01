"""Print the saved evaluation report. Train first with `python -m app.train`."""

import json
from app.config import META_PATH


def main() -> None:
    if not META_PATH.exists():
        raise SystemExit("No model metadata yet. Run python -m app.train")
    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    print(meta["dataset"]["label"])
    print(meta["dataset"]["disclaimer"])
    print("Selected:", meta["selected"]["model"])
    print("Reason:", meta["selected"]["reason"])
    print("Candidates:")
    for row in meta["candidates"]:
        print(f"  {row['model']}: MAE {row['mae']}  RMSE {row['rmse']}  R2 {row['r2']}")
    holdout = meta["holdout_metrics"]
    print(f"Holdout: MAE {holdout['mae']}  RMSE {holdout['rmse']}  R2 {holdout['r2']}")
    print("Permutation importance:")
    for row in meta["feature_importance"]["rows"]:
        print(f"  {row['label']}: {row['mean_mae_increase']}")


if __name__ == "__main__":
    main()
