$root = Split-Path -Parent $PSScriptRoot
$node = Join-Path $root ".tools\node-v22.20.0-win-x64"
if (Test-Path $node) {
  $env:PATH = "$node;" + $env:PATH
}
$python = Join-Path $root ".venv\Scripts\python.exe"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\ml'; & '$python' -m uvicorn app.main:app --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"
Write-Host "Starting model service on 8000, API on 4000, and the app on 5173."
