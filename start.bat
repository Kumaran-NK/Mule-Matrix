@echo off
title Mule Matrix - Launcher
echo ===================================================
echo           MULE MATRIX - LAUNCHER
echo   CBDC-Inspired Fund Provenance MVP
echo ===================================================
echo.
echo Starting Backend (FastAPI on http://127.0.0.1:8000)...
start "Mule Matrix - Backend" cmd /k "cd /d ""%~dp0backend"" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Waiting for backend to initialize...
ping 127.0.0.1 -n 4 >nul

echo Starting Frontend (Vite on http://localhost:5173)...
start "Mule Matrix - Frontend" cmd /k "cd /d ""%~dp0frontend"" && pnpm run dev --host 0.0.0.0 --port 5173"

echo Waiting for frontend to start...
ping 127.0.0.1 -n 4 >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ===================================================
echo System is running!
echo   Dashboard:  http://localhost:5173
echo   API Docs:   http://127.0.0.1:8000/docs
echo ===================================================
echo Keep the opened terminal windows running.
pause
