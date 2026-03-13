// Telegram Bot API utility for sending marketing messages
// Uses environment variables for security

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

function getTelegramConfig() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken) {
        console.warn('[TELEGRAM] Bot token not configured');
        return null;
    }

    return { botToken, channelId };
}

// Updated signature to support direct DMs
export async function sendTelegramMessage(
    message: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML',
    destChatId?: string
): Promise<{
    success: boolean;
    error?: string;
    messageId?: number;
}> {
    const config = getTelegramConfig();

    if (!config) {
        return { success: false, error: 'Telegram not configured' };
    }

    // Use provided destChatId or fall back to env channelId
    const targetChatId = destChatId || config.channelId;
    if (!targetChatId) {
        return { success: false, error: 'Telegram destination chat_id not configured' };
    }

    try {
        const response = await fetch(`${TELEGRAM_API_BASE}${config.botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: targetChatId,
                text: message,
                parse_mode: parseMode,
                disable_web_page_preview: true,
            }),
        });

        const data = await response.json();

        if (data.ok) {
            console.log(`[TELEGRAM] Message sent to ${targetChatId}, ID:`, data.result.message_id);
            return { success: true, messageId: data.result.message_id };
        } else {
            console.error('[TELEGRAM] Failed to send message:', data.description);
            return { success: false, error: data.description };
        }
    } catch (error) {
        console.error('[TELEGRAM] Error sending message:', error);
        return { success: false, error: 'Network error' };
    }
}

// ============================================
// COPYTRADE ARRA77 - DAILY ROTATING TEMPLATE
// ============================================
// Template berubah otomatis setiap 24 jam (7 hari cycle)
// Konten: Panduan mudah Copytrade ARRA77

export const COPYTRADE_TEMPLATES: Record<string, string> = {
    // HARI 1: Pengenalan & Cara Daftar
    day1_register: `🎯 <b>COPYTRADE ARRA77 - Trading Otomatis Dimulai!</b>

<b>Apa itu Copytrade ARRA77?</b>
Sistem yang memungkinkan Anda <b>copy trading otomatis</b> dari provider profesional langsung ke akun MT5 Anda!

✅ <b>Keuntungan:</b>
• Trading otomatis 24/7 via EA Bridge
• Pilih provider sesuai profil risiko
• Kontrol penuh atas lot size & risk
• Saldo sistem credit (1 credit = Rp 1.000)

📝 <b>Cara Daftar (3 Langkah):</b>
1️⃣ Login di https://arra7-app.vercel.app
2️⃣ Menu "Copytrade" → Buat Profile
3️⃣ Generate License Key untuk EA

💡 <b>Biaya:</b>
• 1 signal = 3 credits (Rp 3.000)
• Provider dapat 2 credits
• Admin dapat 1 credit

🔗 <b>Mulai Sekarang:</b>
https://arra7-app.vercel.app/copytrade

#CopytradeARRA77 #TradingOtomatis #MT5`,

    // HARI 2: Cara Top Up Saldo
    day2_topup: `💰 <b>CARA TOP UP SALDO COPYTRADE</b>

Saldo credit diperlukan untuk eksekusi signal trading.

💵 <b>Konversi Credit:</b>
• 1 Credit = Rp 1.000
• 1 Signal = 3 Credits (Rp 3.000)
• Minimal topup: 10 credits (Rp 10.000)

📲 <b>Cara Top Up (QRIS):</b>
1️⃣ Menu "Copytrade" → Top Up
2️⃣ Pilih jumlah credit
3️⃣ Scan QRIS yang muncul
4️⃣ Upload bukti pembayaran
5️⃣ Admin approve (max 1x24 jam)

⚡ <b>Saldo Masuk!</b>
Setelah approve, credit langsung tersedia untuk trading.

🔍 <b>Cek Saldo:</b>
Dashboard Copytrade menampilkan:
• Balance Credits
• Total Spent
• Total Earned (untuk provider)

❓ <b>Butuh Bantuan?</b>
Admin siap membantu via Telegram!

🔗 <b>Top Up Sekarang:</b>
https://arra7-app.vercel.app/copytrade

#TopUpCopytrade #QRIS #TradingMudah`,

    // HARI 3: Cara Pilih Provider & Follow
    day3_follow: `👥 <b>PILIH PROVIDER & MULAI COPY!</b>

<b>Langkah Penting Setelah Top Up:</b>

1️⃣ <b>Browse Provider:</b>
• Lihat track record trading
• Cek win rate & total trades
• Pilih risk level (LOW/MEDIUM/HIGH)

2️⃣ <b>Klik "Follow":</b>
• Set risk mode:
  - FIXED LOT (lot konstan)
  - MULTIPLIER (kali dari provider)
  - RISK PERCENT (% dari balance)

3️⃣ <b>Konfigurasi Lanjutan:</b>
• Max concurrent positions
• One trade at a time (ON/OFF)
• Fixed lot size (misal: 0.01 lot)

⚠️ <b>Perhatian:</b>
• Pastikan saldo cukup untuk signal
• Provider harus APPROVED oleh admin
• EA Bridge harus ONLINE di PC/VPS

📊 <b>Monitor Posisi:</b>
• Lihat posisi aktif di dashboard
• Track profit/loss real-time
• Riwayat trading lengkap

🔗 <b>Pilih Provider:</b>
https://arra7-app.vercel.app/copytrade/providers

#FollowProvider #CopyTrading #PassiveIncome`,

    // HARI 4: Cara Kerja EA Bridge
    day4_ea_bridge: `🔧 <b>EA BRIDGE - Jantung Copytrade!</b>

<b>Apa itu EA Bridge?</b>
Software yang menghubungkan sinyal dari server ke MT5 Anda!

🖥️ <b>Instalasi EA Bridge:</b>
1️⃣ Download file .ex5 dari dashboard
2️⃣ Copy ke folder MQL5/Experts/MT5
3️⃣ Buka MT5 → Navigator → Experts
4️⃣ Drag "Arra-Copytrade-Bridge" ke chart
5️⃣ Input License Key dari dashboard

⚙️ <b>Konfigurasi EA:</b>
• License Key (wajib!)
• MT5 Login
• Broker Name
• Server Name
• Symbol & Timeframe

✅ <b>Status Monitoring:</b>
Dashboard menampilkan:
• Terminal Status (ONLINE/OFFLINE)
• Last Heartbeat (max 30 detik)
• Last Error (jika ada)

🔴 <b>Troubleshooting:</b>
• Offline > 180s? Nyalakan EA!
• Error lock? Reset dari dashboard
• No signal? Cek koneksi internet

💡 <b>Tips:</b>
• Gunakan VPS untuk uptime 24/7
• Restart EA jika ada error
• Update ke versi terbaru

🔗 <b>Download EA:</b>
https://arra7-app.vercel.app/copytrade/bridge

#EABridge #MT5 #TradingBot #Automation`,

    // HARI 5: Contoh Hasil Trading
    day5_results: `📈 <b>HASIL TRADING COPYTRADE</b>

<b>Statistik Real-Time:</b>

🏆 <b>Provider Performance:</b>
• Total Trades: 50+ trades
• Win Rate: 60%+ (minimal challenge)
• Profit Factor: > 1.5
• Max Drawdown: < 20%

💰 <b>Contoh Perhitungan:</b>
Modal: 100 credits (Rp 100.000)
Signal/hari: ~5 signals
Biaya/hari: 15 credits (Rp 15.000)

Jika win rate 60%:
• 3 win x Rp 50.000 = +150.000
• 2 loss x Rp 30.000 = -60.000
• Profit bersih: +90.000/hari*

⚠️ <b>Disclaimer:</b>
*Hasil tidak garantised, tergantung market & provider

📊 <b>Dashboard Analytics:</b>
• Total Profit/Loss
• Win/Loss Ratio
• Average Pips per Trade
• Revenue Share (untuk provider)

🎯 <b>Target Challenge Provider:</b>
• 50 trades minimum
• Win rate > 60%
• Lolos = Approved & Revenue Share!

🔗 <b>Lihat Statistik:</b>
https://arra7-app.vercel.app/copytrade/stats

#HasilTrading #WinRate #ProfitableTrading`,

    // HARI 6: FAQ & Troubleshooting
    day6_faq: `❓ <b>FAQ COPYTRADE ARRA77</b>

<b>Q: Berapa minimal deposit?</b>
A: 10 credits (Rp 10.000) via QRIS

<b>Q: Berapa biaya per signal?</b>
A: 3 credits (Rp 3.000) per eksekusi

<b>Q: Bisa trade manual sambil copytrade?</b>
A: Bisa! Tapi aktifkan "One Trade at a Time"

<b>Q: EA offline, apa yang terjadi?</b>
A: Signal tidak masuk. Nyalakan EA untuk resume!

<b>Q: Bagaimana cara jadi Provider?</b>
A:
1. Buat profile provider
2. Trade minimal 50x
3. Maintain win rate > 60%
4. Admin approve = Revenue share!

<b>Q: Saldo kurang, apa yang terjadi?</b>
A: Signal di-skip. Top up untuk lanjut!

<b>Q: Bisa refund saldo?</b>
A: Hubungi admin untuk penarikan

<b>Q: Support broker apa?</b>
A: Semua broker MT5 (IC Markets, Pepperstone, dll)

<b>Q: Butuh VPS?</b>
A: Recommended untuk uptime 24/7

❓ <b>Pertanyaan Lain?</b>
DM admin via Telegram!

🔗 <b>Bantuan Lengkap:</b>
https://arra7-app.vercel.app/copytrade/help

#FAQ #HelpDesk #CopytradeHelp`,

    // HARI 7: Promo & Testimoni
    day7_promo: `🎉 <b>PROMO & TESTIMONI COPYTRADE</b>

🔥 <b>PROMO SPESIAL BULAN INI!</b>

💎 <b>Bonus Top Up:</b>
• Top up 100 credits → Bonus 10 credits!
• Top up 500 credits → Bonus 75 credits!

🎁 <b>Provider Challenge:</b>
• Gratis biaya pendaftaran
• Revenue share 2 credits/signal
• Bonus khusus top performer!

⭐ <b>Testimoni Users:</b>

_"Alhamdulillah, 2 minggu copytrade udah +30% dari modal. Providernya konsisten, EA juga stabil."_
— Budi, Jakarta

_"Awalnya ragu, tapi setelah coba 1 bulan hasilnya memuaskan. Win rate 65%, worth it!"_
— Andi, Surabaya

_"Sistem credit transparan, nggak ada biaya tersembunyi. Recommended!"_
— Reza, Bandung

📊 <b>Statistik Platform:</b>
• 100+ Active Users
• 10+ Approved Providers
• 500+ Signals Executed
• 85%+ User Satisfaction

🚀 <b>Join Sekarang!</b>
Jangan ketinggalan profit dari copytrade!

🔗 <b>Daftar Gratis:</b>
https://arra7-app.vercel.app/copytrade

#Promo #Testimoni #CopytradeSuccess #PassiveIncome`,
};

// Template metadata untuk admin display
export const TEMPLATE_METADATA: Record<string, { name: string; emoji: string; description: string; day: number }> = {
    day1_register: { name: 'Hari 1: Daftar', emoji: '🎯', description: 'Pengenalan & Cara Daftar Copytrade', day: 1 },
    day2_topup: { name: 'Hari 2: Top Up', emoji: '💰', description: 'Panduan Top Up Saldo Credit', day: 2 },
    day3_follow: { name: 'Hari 3: Follow', emoji: '👥', description: 'Cara Pilih Provider & Follow', day: 3 },
    day4_ea_bridge: { name: 'Hari 4: EA Bridge', emoji: '🔧', description: 'Instalasi & Konfigurasi EA', day: 4 },
    day5_results: { name: 'Hari 5: Hasil', emoji: '📈', description: 'Contoh Hasil Trading & Statistik', day: 5 },
    day6_faq: { name: 'Hari 6: FAQ', emoji: '❓', description: 'Pertanyaan & Troubleshooting', day: 6 },
    day7_promo: { name: 'Hari 7: Promo', emoji: '🎉', description: 'Promo & Testimoni Users', day: 7 },
};

// Mendapatkan key template berdasarkan hari (1-7)
export function getTemplateKeyForDay(dayOfWeek: number): string {
    // dayOfWeek: 1 (Senin) - 7 (Minggu)
    const mapping: Record<number, string> = {
        1: 'day1_register',
        2: 'day2_topup',
        3: 'day3_follow',
        4: 'day4_ea_bridge',
        5: 'day5_results',
        6: 'day6_faq',
        7: 'day7_promo',
    };
    return mapping[dayOfWeek] || 'day1_register';
}

// Mendapatkan template yang aktif untuk hari ini (berubah setiap 24 jam)
export function getTodaysTemplate(): { key: string; message: string; dayName: string } {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Minggu) - 6 (Sabtu)
    
    // Konversi: 0 (Minggu) → 7, 1 (Senin) → 1, dst
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    const key = getTemplateKeyForDay(adjustedDay);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    
    return {
        key,
        message: COPYTRADE_TEMPLATES[key],
        dayName: dayNames[adjustedDay - 1],
    };
}

// Mendapatkan template berdasarkan key
export function getTemplateByKey(key: string): string | null {
    return COPYTRADE_TEMPLATES[key] || null;
}

// Mendapatkan semua template keys
export function getAllTemplateKeys(): string[] {
    return Object.keys(COPYTRADE_TEMPLATES);
}

export function isTelegramConfigured(): boolean {
    return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}

export async function broadcastSignalToSubscribers(message: string): Promise<{ sent: number; failed: number }> {
    try {
        const { getActiveSubscribers } = await import('./turso');
        const subscribers = await getActiveSubscribers();

        console.log(`[BROADCAST] Found ${subscribers.length} active subscribers.`);

        let sent = 0;
        let failed = 0;

        // Process in chunks to avoid rate limits if list is huge (simple loop for now)
        for (const chatId of subscribers) {
            const result = await sendTelegramMessage(message, 'HTML', chatId);
            if (result.success) {
                sent++;
            } else {
                failed++;
                console.error(`[BROADCAST] Failed to send to ${chatId}: ${result.error}`);
            }
        }

        console.log(`[BROADCAST] Completed. Sent: ${sent}, Failed: ${failed}`);
        return { sent, failed };
    } catch (error) {
        console.error('[BROADCAST] Critical error:', error);
        return { sent: 0, failed: 0 };
    }
}

