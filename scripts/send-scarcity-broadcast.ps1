$envFile = Join-Path $PSScriptRoot "..\.env.local"
$token = $env:TELEGRAM_BOT_TOKEN
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.+)") { $token = $matches[1].Trim() }
    }
}
$chatId = "@arrareborn7"

$text = @"
⚠️ *PERINGATAN: Slot HERMES AI Mentor Hampir Habis!*

Sejak launch tadi, sudah banyak yang ambil slot promo.

Ini TERAKHIR KALINYA saya ingatkan:

💰 *Rp 49.000 = LIFETIME ACCESS*
🤖 AI Mentor pribadi 24/7
🧠 Ingat 20 percakapan terakhir kamu
📊 Position sizing calculator
📝 Trading journal reviewer
🧘 Trading psychology coach

Setelah promo habis, harga naik *Rp 149.000*

⏰ *Kesempatan tidak datang 2x.*

👉 [AMBIL SEKARANG](https://pica.my.id/hermes-mentor)

💳 BCA 1392698188 (Arland Pratama M.)
📩 Konfirmasi: @arra7trader
"@

$body = @{
    chat_id = $chatId
    text = $text
    parse_mode = "Markdown"
    disable_web_page_preview = $false
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method Post -Body $body -ContentType "application/json; charset=utf-8" -TimeoutSec 15
    if ($response.ok) {
        Write-Output "SCARCITY BROADCAST SENT! Message ID: $($response.result.message_id)"
    } else {
        Write-Output "FAILED: $($response | ConvertTo-Json -Depth 3)"
    }
} catch {
    Write-Output "ERROR: $_"
}
