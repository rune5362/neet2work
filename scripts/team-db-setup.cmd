@echo off
setlocal
cd /d "%~dp0\.."

echo [team-db-setup] Running personal DB setup from %CD%
corepack pnpm run team:db:setup
if errorlevel 1 (
  echo.
  echo [team-db-setup] Failed. Check the error above.
  pause
  exit /b 1
)

echo.
echo [team-db-setup] Done.
pause
