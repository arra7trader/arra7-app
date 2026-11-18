# Install ARRA AI 24/7 Autonomous Worker to Windows Startup
$startupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$sourceVbs = "e:\ARRA 7 WEB 1\arra-cronos-preview\scripts\start-worker-silent.vbs"
$targetVbs = Join-Path $startupFolder "ARRA_AI_Employee.vbs"

# 1. Copy silent VBS to Startup folder
Copy-Item -Path $sourceVbs -Destination $targetVbs -Force
Write-Output "✅ VBS Launcher installed to Windows Startup: $targetVbs"

# 2. Check and start the process now in background
$existing = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*autonomous-growth-worker*" }
if ($existing) {
    Write-Output "⚠️ Autonomous worker is already running (PID: $($existing.Id))"
} else {
    Start-Process -FilePath "wscript.exe" -ArgumentList "`"$targetVbs`""
    Write-Output "🚀 Autonomous AI Employee is now running silently in background!"
}

# 3. Verify log
Start-Sleep -Seconds 3
if (Test-Path "e:\ARRA 7 WEB 1\arra-cronos-preview\logs\growth-worker.log") {
    $tail = Get-Content "e:\ARRA 7 WEB 1\arra-cronos-preview\logs\growth-worker.log" -Tail 5
    Write-Output "Recent Log Output:"
    $tail | ForEach-Object { Write-Output "  $_" }
}
