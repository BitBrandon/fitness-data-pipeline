# Monster Fit — reinicia solo el backend (mata uvicorn y lo vuelve a arrancar)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Mata cualquier proceso uvicorn corriendo en el puerto 8001
$procs = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue |
         Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $procs) {
    try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } catch {}
}

Write-Host "Backend detenido." -ForegroundColor DarkMagenta
Start-Sleep -Seconds 1

# Arranca backend de nuevo en nueva terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location '$root'
  Write-Host 'Reiniciando backend Monster Fit...' -ForegroundColor Magenta
  & '$root\venv\Scripts\Activate.ps1'
  uvicorn src.api_server.main:app --host 0.0.0.0 --port 8001 --reload
"@

Write-Host "Backend reiniciando en nueva ventana..." -ForegroundColor Magenta
Write-Host "  -> http://localhost:8001" -ForegroundColor DarkMagenta
