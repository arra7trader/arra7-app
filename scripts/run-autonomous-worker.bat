@echo off
cd /d "e:\ARRA 7 WEB 1\arra-cronos-preview"
:loop
node scripts/autonomous-growth-worker.mjs >> logs\growth-worker.log 2>&1
timeout /t 10 /nobreak >nul
goto loop
