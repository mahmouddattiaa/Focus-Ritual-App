@echo off
echo ===================================================
echo   Focus Ritual - Monorepo Dev Environment Setup
echo ===================================================

echo.
echo [1/4] Installing Root Dependencies...
call npm install

echo.
echo [2/4] Installing Backend Dependencies...
cd apps\backend
call npm install
cd ..\..

echo.
echo [3/4] Installing Frontend Dependencies...
cd apps\web
call npm install
cd ..\..

echo.
echo [4/4] Starting Development Servers...
echo       - Backend: http://localhost:5001
echo       - Frontend: http://localhost:5173
echo.

npm run dev
