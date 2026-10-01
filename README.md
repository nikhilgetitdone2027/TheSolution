# CHEM2ENERGY AI

Turn waste composition into a recovery decision you can inspect.

The question the product answers is: given the composition and process inputs of a mixed-plastic stream, which pyrolysis configuration should be evaluated, and which comparison metrics does the data actually support?

This is a decision-support prototype. It is not a waste classifier, and it does not turn a photograph into an elemental analysis.

## Repository note

The workspace started empty. No experimental dataset was included. The training table is generated, labeled **Hackathon Demo Dataset — Illustrative**, and documented in `DATASET.md` and `dataset_schema.md`. Product numbers in the interface come from a scikit-learn model trained on that table. Where a price, an emission factor, or a recycling yield cannot be calculated, the screen says **Insufficient data**.

## Run it

Python 3.12+ and Node.js 22.

```powershell
py -m venv .venv
.\.venv\Scripts\python -m pip install -r ml\requirements.txt
cd ml
..\.venv\Scripts\python -m pytest
..\.venv\Scripts\python -m uvicorn app.main:app --port 8000
```

The model service trains on first launch if `ml/artifacts/model.joblib` is missing. In a second terminal:

```powershell
cd backend
npm install
npm run dev
```

In a third:

```powershell
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. **Explore Demo** starts the judge path. **Analyze a Waste Stream** opens sample intake.

`scripts/dev.ps1` starts all three after the installs above.

## What a judge should click

The script is in `DEMO_SCRIPT.md`. Short version: load sample A, run analysis, read the prediction, open pathways, optimize inside the printed training range, move temperature in the What-If Lab, read the explanation, generate the report.

## Layout

| Path | Role |
| --- | --- |
| `frontend/` | React, TypeScript, Tailwind, Recharts |
| `backend/` | Express API, sample store, reports, assistant routing |
| `ml/` | FastAPI, training, inference, optimization, explanation |
| `ml/data/demo_dataset.csv` | Illustrative training table, written on first train |
| `ml/artifacts/` | Fitted model and metrics, created locally |

## Documents

- `ARCHITECTURE.md`
- `API.md`
- `DATASET.md`
- `dataset_schema.md`
- `MODEL_CARD.md`
- `LIMITATIONS.md`
- `DEPLOYMENT.md`
- `DEMO_SCRIPT.md`

## Tests

```powershell
cd ml
..\.venv\Scripts\python -m pytest
```

The tests check stoichiometry, mass balance, rejected inputs, the refusal to invent a heating value, model selection on a small illustrative draw, and that the optimizer stays inside the training range.

## Replacing the demo data

Put a CSV with the columns in `dataset_schema.md` at `ml/data/demo_dataset.csv`, delete `ml/artifacts`, and start the model service again. Missing columns are dropped from the model and named in Model Trust. They are not filled in.
