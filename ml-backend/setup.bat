@echo off
echo ========================================
echo  DOM ML Prediction System Setup
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.9+
    pause
    exit /b 1
)

echo [1/4] Creating virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

echo [2/4] Installing dependencies...
pip install -r requirements.txt --quiet

echo [3/4] Creating directories...
mkdir models\saved 2>nul
mkdir data 2>nul
mkdir logs 2>nul

echo [4/4] Creating .env file...
if not exist .env (
    copy .env.example .env
    echo Created .env from template. Please edit with your settings.
) else (
    echo .env already exists, skipping...
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Edit .env with your database settings
echo   2. Run: python -m data.loaders.historical_loader BTCUSD 60
echo   3. Upload DOM_Training_Notebook.ipynb to Google Colab
echo   4. Train models and download to models/saved/
echo   5. Run: uvicorn api.main:app --host 0.0.0.0 --port 8001
echo.
pause
