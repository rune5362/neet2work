@echo off
setlocal

cd /d "%~dp0"

set CODEX_BRIDGE_ENABLED=true
if "%AI_PROVIDER_ORDER%"=="" set AI_PROVIDER_ORDER=codex_bridge,gemini,local,fallback

echo Starting Neet2Work with Codex Bridge enabled...
echo Backend will connect through the local Codex app-server session.
echo.

corepack pnpm run dev
set EXIT_CODE=%ERRORLEVEL%

echo.
if not "%EXIT_CODE%"=="0" (
  echo Neet2Work stopped with exit code %EXIT_CODE%.
) else (
  echo Neet2Work stopped.
)
echo Press any key to close this window.
pause >nul

exit /b %EXIT_CODE%
