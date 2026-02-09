@echo off
echo Starting DOM ML Prediction API Server...
echo.

REM Activate virtual environment
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo [WARN] Virtual environment not found. Run setup.bat first.
)

REM Set environment variables
set PYTHONPATH=%CD%

REM Start server
echo Server starting at http://localhost:8001
echo Press Ctrl+C to stop
echo.
uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
