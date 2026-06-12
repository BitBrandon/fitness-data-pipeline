# Monster Fit — arranca backend (FastAPI) y frontend (Next.js) en ventanas separadas

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location '$root'
  Write-Host 'Activando entorno virtual...' -ForegroundColor Magenta
  & '$root\venv\Scripts\Activate.ps1'
  Write-Host 'Iniciando backend Monster Fit...' -ForegroundColor Magenta
  uvicorn src.api_server.main:app --host 0.0.0.0 --port 8001 --reload
"@

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location '$root\frontend'
  Write-Host 'Iniciando frontend Monster Fit...' -ForegroundColor Yellow
  npm run dev -- -H 0.0.0.0
"@

Write-Host ""
Write-Host "Monster Fit arrancando..." -ForegroundColor Magenta
Write-Host "  Backend  -> http://localhost:8001" -ForegroundColor DarkMagenta
Write-Host "  Frontend -> http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
