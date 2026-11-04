Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          MULE MATRIX - MVP LAUNCHER" -ForegroundColor Cyan
Write-Host "   CBDC-Inspired Fund Provenance & Mule Matrix" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start Backend in separate window
Write-Host "Starting Backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\backend'; Write-Host '--- Mule Matrix Backend (FastAPI) ---' -ForegroundColor Green; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 3

# 2. Start Frontend in separate window
Write-Host "Starting Frontend on http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\frontend'; Write-Host '--- Mule Matrix Frontend (Vite) ---' -ForegroundColor Green; pnpm run dev --host 0.0.0.0 --port 5173"

Start-Sleep -Seconds 3

# 3. Open browser
Write-Host "Opening Dashboard in browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Mule Matrix is now running!" -ForegroundColor Cyan
Write-Host "  Dashboard:  http://localhost:5173" -ForegroundColor White
Write-Host "  API Docs:   http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Cyan
