@echo off
REM Multiverse Smash - MAX PERFORMANCE launcher (Windows). Double-click me.
title Multiverse Smash - MAX
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed on this PC.
  echo.
  echo   1. Go to  https://nodejs.org  and click the big "LTS" download button.
  echo   2. Run the installer - just keep clicking Next.
  echo   3. Double-click PLAY_MAX.bat again.
  echo.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)
node PLAY_MAX.mjs %*
if errorlevel 1 pause
