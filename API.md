# API

The browser talks only to the Node API. The Node API talks to the Python model service. Secrets stay in the environment of those processes.

## Node API, port 4000

| Method | Path | Role |
| --- | --- | --- |
| GET | `/api/health` | API and model-service status |
| GET | `/api/models` | Model card payload: metrics, features, importance, ranges |
| GET | `/api/template.csv` | Header-only CSV template |
| GET | `/api/samples` | Stored samples |
| POST | `/api/samples` | Manual sample |
| POST | `/api/samples/csv` | Parse a CSV and store one sample per row |
| POST | `/api/demo/:demoId` | Store illustrative sample A, B, C, or D |
| GET | `/api/samples/:id` | One sample |
| DELETE | `/api/samples/:id` | Remove a sample |
| POST | `/api/samples/:id/inputs` | Update inputs and clear stale results |
| POST | `/api/samples/:id/validate` | Data-quality check |
| POST | `/api/samples/:id/analyze` | Server-sent events for validate, predict, pathways, optimize, explain |
| GET | `/api/samples/:id/profile` | Stoichiometry and heating-value gate |
| POST | `/api/predict` | `{ sampleId }` |
| POST | `/api/optimize` | `{ sampleId, objective, weights? }` |
| POST | `/api/simulate` | `{ sampleId, modified, saveAs? }` |
| POST | `/api/reports` | `{ sampleId }` returns HTML |
| POST | `/api/assistant` | `{ sampleId, question }` |

Objectives: `energy_recovery`, `material_recovery`, `carbon_impact`, `economic_value`. The last two return “Insufficient data” unless oil, gas, char, and other weights are supplied.

Failed calls return `{ "error": "..." }` with an HTTP error status. The analyze stream emits `stage`, `halted`, `done`, or `error`.

## Model service, port 8000

| Method | Path |
| --- | --- |
| GET | `/health` |
| GET | `/model` |
| GET | `/demo-samples` |
| POST | `/parse` |
| POST | `/validate` |
| POST | `/predict` |
| POST | `/optimize` |
| POST | `/simulate` |
| POST | `/pathways` |
| POST | `/profile` |
| POST | `/explain` |

The model service has no database and no API key.
