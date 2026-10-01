# Deployment

## Local

Requirements: Python 3.12+ (developed on 3.14) and Node.js 22.

```powershell
py -m venv .venv
.\.venv\Scripts\python -m pip install -r ml\requirements.txt
cd ml
..\.venv\Scripts\python -m app.train
..\.venv\Scripts\python -m uvicorn app.main:app --port 8000

cd ..\backend
npm install
npm run dev

cd ..\frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

The first training run writes `ml/data/demo_dataset.csv` and `ml/artifacts/`. Artifacts are local and are not required in git. Copy `.env.example` to `.env` only if you need to change the model URL or add an optional language-model key.

`scripts/dev.ps1` starts the three processes after dependencies are installed.

## Containers

`docker compose up --build` builds the model service, the API, and the static frontend. The model trains on container start if `ml/artifacts` is empty. That image set is the practical deployable unit.

## AWS target

This repository does not call AWS at runtime. The hackathon deployment shape, using only services that match the containers above:

```text
User
  ↓
CloudFront
  ↓
Frontend (S3 origin, or Amplify)
  ↓
API (App Runner or ECS, from backend/Dockerfile)
  ↓
ML service (App Runner or ECS, from ml/Dockerfile)
  ↓
Model artifact (container filesystem, or an S3 object mounted at start)
```

Supporting services, if the deployment grows past the hackathon:

- Sample store: replace `backend/data/store.json` with RDS PostgreSQL. The sample fields are already a single document per sample.
- Report files: S3, only if `REPORTS_BUCKET` is introduced later. Reports are HTML responses today.
- Logs: CloudWatch from the App Runner services.
- Optional language model: the key stays in the API environment, never in the frontend.

Do not add an AWS SDK dependency until a bucket or database is actually configured. A logo without a call is not an integration.
