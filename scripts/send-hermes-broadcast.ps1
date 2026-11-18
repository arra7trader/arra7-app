# HERMES AI Mentor - Telegram Broadcast Script
# Run this script to send promotional message to @arrareborn7

$envFile = Join-Path $PSScriptRoot "..\.env.local"
$token = $env:TELEGRAM_BOT_TOKEN
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.+)") { $token = $matches[1].Trim() }
    }
}
$channelId = "@arrareborn7"

$launchMessage = @"
🧠⚡ <b>PRODUK BARU: HERMES AI Private Mentor</b>

━━━━━━━━━━━━━━━━━━━━

Halo Trader! 👋

PICA baru saja meluncurkan fitur BARU yang akan mengubah cara kamu belajar trading:

🧠 <b>HERMES — AI Private Mentor Trading</b>

Ini BUKAN chatbot biasa. Hermes adalah <b>mentor pribadi AI</b> yang:

✅ Memahami gaya trading, modal & tujuanmu
✅ Hitung position sizing & risk management otomatis
✅ Analisa SMC, Order Block, FVG mendalam
✅ Review trading journal & identifikasi kelemahan
✅ Bantu desain trading system dari nol
✅ Coach psikologi trading (anti FOMO, revenge trade)

━━━━━━━━━━━━━━━━━━━━

💰 <b>LAUNCH PROMO — 50 SLOT PERTAMA</b>

<s>Rp 299.000</s> → <b>Rp 49.000 SAJA</b>
✨ Sekali bayar, akses SELAMANYA
✨ Hemat 83% dari harga normal

━━━━━━━━━━━━━━━━━━━━

🔥 <b>KENAPA HERMES BERBEDA?</b>

❌ Bot biasa: Jawaban template, pendek, generik
✅ HERMES: Personal, mendalam, ingat konteks 20 pesan

❌ Bot biasa: Tidak bisa hitung lot & risk
✅ HERMES: Position sizing calculator built-in

❌ Bot biasa: Tidak review journal
✅ HERMES: Analisa pola kelemahan trading-mu

━━━━━━━━━━━━━━━━━━━━

🎯 <b>COCOK UNTUK:</b>
• Trader pemula yang butuh mentor
• Trader yang sering loss & bingung kenapa
• Yang ingin punya trading plan terstruktur
• Yang modal terbatas tapi ingin belajar serius

━━━━━━━━━━━━━━━━━━━━

📱 <b>CARA ORDER:</b>
1️⃣ Transfer Rp 49.000 ke BCA 1392698188 a.n. Arland Pratama Muldiawan
2️⃣ Konfirmasi ke @arra7trader
3️⃣ Aktivasi INSTAN!

🌐 <b>Lihat detail & coba demo:</b> https://pica.my.id/hermes-mentor

⏳ Promo ini TERBATAS untuk 50 slot pertama saja!

#HermesMentor #AITrading #PICA #TradingMentor
"@

$body = @{
    chat_id = $channelId
    text = $launchMessage
    parse_mode = "HTML"
    disable_web_page_preview = $false
    reply_markup = @{
        inline_keyboard = @(
            @(
                @{ text = "🧠 Lihat Detail & Demo HERMES"; url = "https://pica.my.id/hermes-mentor" }
            ),
            @(
                @{ text = "💬 Order Sekarang - Chat Admin"; url = "https://t.me/arra7trader" }
            )
        )
    }
} | ConvertTo-Json -Depth 5

try {
    $result = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body -TimeoutSec 30
    if ($result.ok) {
        Write-Host "✅ BROADCAST SENT SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "Message ID: $($result.result.message_id)"
        Write-Host "Channel: $channelId"
        Write-Host "Date: $($result.result.date)"
    } else {
        Write-Host "❌ BROADCAST FAILED" -ForegroundColor Red
        $result | ConvertTo-Json
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    try {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response: $errorBody" -ForegroundColor Yellow
    } catch {}
}
