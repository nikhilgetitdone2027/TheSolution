# Architecture

```text
User
  ↓
Browser (React, TypeScript, Tailwind)
  ↓
Node.js / Express API          samples, reports, assistant routing
  ↓
Python / FastAPI               validation, models, optimization, explanation
  ↓
scikit-learn model             joblib artifact + model_meta.json
```

Local persistence is `backend/data/store.json`. It stores samples, validation, predictions, pathway comparisons, optimization results, scenarios, explanations, and report HTML. A PostgreSQL table with the same fields is the production replacement. No database server is required to run the demo.

## Request path for “Run analysis”

1. The browser opens a server-sent event stream: `POST /api/samples/:id/analyze`.
2. Express loads the stored sample.
3. FastAPI validates the row.
4. If required inputs are missing or invalid, the stream stops. Later stages are not fabricated.
5. FastAPI predicts with the selected model, builds pathway metrics, and derives mass flow from feed rate × product fraction.
6. The optimizer evaluates a grid inside the training-split range.
7. The explanation packet is built from that prediction and from permutation importance.
8. Express stores the payload and emits `done`.

## Model selection

Linear regression (scaled inside a pipeline), random forest, and multi-output gradient boosting are cross-validated on the training split. The lowest cross-validated MAE wins. Holdout metrics and permutation importance are computed after that choice.

## What is intentionally not numeric

Mechanical recycling yields, product energy in megajoules, prices, and emission impacts. Those screens say “Insufficient data” unless the sample actually contains the required inputs, or you type relative weights and the label says they are yours.

## AWS shape

See `DEPLOYMENT.md`. CloudFront serves the frontend. App Runner or ECS runs the API and the model service. The model file can stay in the image for the hackathon.
