@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 start_nbl_analyzer.py
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python start_nbl_analyzer.py
  ) else (
    echo Python 3 is required for Windows Hello and Motive integration.
    echo You can still open index.html directly for core local features and the finance access code.
    pause
  )
)
