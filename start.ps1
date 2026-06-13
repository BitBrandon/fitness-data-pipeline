# Monster Fit — arranca backend (FastAPI), frontend (Next.js) y tunel ngrok

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

# ngrok — expone el backend para que Hevy pueda llamar al webhook
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Write-Host 'Iniciando tunel ngrok para webhooks...' -ForegroundColor Cyan
  Start-Sleep -Seconds 3
  ngrok http 8001
"@

Write-Host ""
Write-Host "Monster Fit arrancando..." -ForegroundColor Magenta
Write-Host "  Backend  -> http://localhost:8001" -ForegroundColor DarkMagenta
Write-Host "  Frontend -> http://localhost:3000" -ForegroundColor Yellow
Write-Host "  ngrok    -> mira la ventana de ngrok para la URL publica" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuracion del webhook en Hevy:" -ForegroundColor White
Write-Host "  URL:  https://<ngrok-url>/webhooks/hevy" -ForegroundColor Gray
Write-Host "  Auth: Bearer monsterfit2026" -ForegroundColor Gray
Write-Host ""
