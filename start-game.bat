@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Chua cai Node.js. Hay tai ban LTS tai https://nodejs.org roi chay lai.
  pause
  exit /b 1
)
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node server.js
pause
