@echo off
title ARRA Kronos - PyTorch Inference Service
color 0b

echo ========================================================
echo        ARRA CRONOS - PYTORCH INFERENCE SERVICE
echo   Model: NeoQuasar/Kronos-base (102.3M parameters)
echo   Tokenizer: NeoQuasar/Kronos-Tokenizer-base
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Memeriksa Python environment...
python --version
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python tidak ditemukan di PATH. Silakan install Python 3.10+ terlebih dahulu.
    pause
    exit /b 1
)

echo.
echo [2/3] Memverifikasi dependensi (torch, transformers, fastapi, uvicorn)...
python -c "import torch, transformers, fastapi, uvicorn; print('   Dependencies OK! PyTorch:', torch.__version__, '| CUDA:', torch.cuda.is_available())" 2>nul
if %ERRORLEVEL% neq 0 (
    echo    Menginstall dependensi yang diperlukan...
    pip install -r requirements.txt
)

echo.
echo [3/3] Menjalankan server Kronos di http://localhost:8010 ...
echo    (Tekan Ctrl+C untuk menghentikan server)
echo.

set KRONOS_MODEL_ID=NeoQuasar/Kronos-base
set KRONOS_TOKENIZER_ID=NeoQuasar/Kronos-Tokenizer-base
set KRONOS_MAX_CONTEXT=512
set KRONOS_SERVICE_TOKEN=arra-cronos-secret-token

uvicorn app:app --host 0.0.0.0 --port 8010 --reload
pause
