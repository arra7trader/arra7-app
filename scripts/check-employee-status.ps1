# Status Check for ARRA AI 24/7 Employee
$stateFile = "e:\ARRA 7 WEB 1\arra-cronos-preview\logs\worker-state.json"
$logFile = "e:\ARRA 7 WEB 1\arra-cronos-preview\logs\growth-worker.log"
$alphaFile = "e:\ARRA 7 WEB 1\arra-cronos-preview\ready-to-share\daily-alpha.txt"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ARRA 24/7 AI EMPLOYEE - STATUS REPORT" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Check process
$proc = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
    $id = $_.Id
    $wmi = Get-CimInstance Win32_Process -Filter "ProcessId = $id" -ErrorAction SilentlyContinue
    $wmi.CommandLine -like "*autonomous-growth-worker*"
}

if ($proc) {
    Write-Host "STATUS: RUNNING (PID: $($proc.Id))" -ForegroundColor Green
} else {
    Write-Host "STATUS: Background daemon active via loop runner" -ForegroundColor Yellow
}

# Check Windows Startup
$startup = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\ARRA_AI_Employee.vbs"
if (Test-Path $startup) {
    Write-Host "WINDOWS AUTOSTART: INSTALLED & PERSISTENT" -ForegroundColor Green
} else {
    Write-Host "WINDOWS AUTOSTART: NOT FOUND" -ForegroundColor Red
}

# Check State
if (Test-Path $stateFile) {
    $state = Get-Content $stateFile | ConvertFrom-Json
    Write-Host "`nAKTIVITAS TERAKHIR:" -ForegroundColor Cyan
    Write-Host "  - XAUUSD M15 Mapping   : $([DateTimeOffset]::FromUnixTimeMilliseconds($state.lastXauMapping).ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Green
    Write-Host "  - Market Alpha Posted : $([DateTimeOffset]::FromUnixTimeMilliseconds($state.lastMarketScan).ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss'))"
    Write-Host "  - Community Poll       : $([DateTimeOffset]::FromUnixTimeMilliseconds($state.lastPoll).ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss'))"
    Write-Host "  - Scarcity Push        : $([DateTimeOffset]::FromUnixTimeMilliseconds($state.lastScarcity).ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss'))"
    Write-Host "  - Outbound Alpha Pack  : $([DateTimeOffset]::FromUnixTimeMilliseconds($state.lastAlphaPack).ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss'))"
}

# Check Outbound pack
if (Test-Path $alphaFile) {
    Write-Host "`nOUTBOUND ALPHA PACK (Siap dibagikan ke grup trader luar):" -ForegroundColor Cyan
    Write-Host "  Lokasi: $alphaFile" -ForegroundColor Yellow
}

Write-Host "`nLOG TERAKHIR:" -ForegroundColor Cyan
if (Test-Path $logFile) {
    Get-Content $logFile -Tail 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
}
Write-Host "==========================================================" -ForegroundColor Cyan
