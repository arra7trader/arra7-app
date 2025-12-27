// Telegram Bot API utility for sending marketing messages
// Uses environment variables for security

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

function getTelegramConfig() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken || !channelId) {
        console.warn('[TELEGRAM] Bot token or channel ID not configured');
        return null;
    }

    return { botToken, channelId };
}

export async function sendTelegramMessage(message: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<{
    success: boolean;
    error?: string;
    messageId?: number;
}> {
    const config = getTelegramConfig();

    if (!config) {
        return { success: false, error: 'Telegram not configured' };
    }

    try {
        const response = await fetch(`${TELEGRAM_API_BASE}${config.botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: config.channelId,
                text: message,
                parse_mode: parseMode,
                disable_web_page_preview: false,
            }),
        });

        const data = await response.json();

        if (data.ok) {
            console.log('[TELEGRAM] Message sent successfully, ID:', data.result.message_id);
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
// 10 MARKETING TEMPLATES FOR AUTO-POSTING
// ============================================

export const MARKETING_TEMPLATES: Record<string, string> = {
    // 1. PROMO TAHUN BARU
    newYearPromo: `🎆🎇✨ <b>HAPPY NEW YEAR 2026!</b> ✨🎇🎆

🚨 <b>PROMO TAHUN BARU TERBATAS!</b> 🚨

Analisa Trading dengan AI ARRA7 sekarang cuma <b>Rp 99K</b> saja! (Hemat 200K!)

╔══════════════════════════════════════╗
║  🎉 <b>PAKET PRO - SPESIAL TAHUN BARU</b> 🎉 ║
╠══════════════════════════════════════╣
║  <s>Rp 299.000</s> → <b>Rp 99.000!</b>         ║
║  💰 HEMAT 200 RIBU! 💰               ║
╚══════════════════════════════════════╝

✅ 25x Analisa per hari
✅ Semua Timeframe
✅ Gold, Forex, Crypto, Saham IDX

🔗 <b>AMBIL PROMO:</b> https://arra7-app.vercel.app/pricing

⏰ Berlaku sampai 1 Januari 2026!

#ARRA7 #PromoTahunBaru #TradingAI`,

    // 2. AI FEATURES HIGHLIGHT
    aiFeatures: `🤖 <b>ARRA7 - AI Trading Assistant</b> 🤖

Bingung analisa chart? Serahkan ke AI! 

✨ <b>Fitur AI Kami:</b>

📊 <b>SMC/ICT Analysis</b>
→ Order Block, FVG, Break of Structure

📈 <b>Price Action</b>
→ Support/Resistance, Trend Analysis

🕯️ <b>Candlestick Patterns</b>
→ Doji, Engulfing, Morning Star, dll

📐 <b>Fibonacci Analysis</b>
→ Retracement & Extension levels

⚡ <b>HASIL ANALISA:</b>
• Entry Point yang tepat
• Take Profit 1, 2, 3
• Stop Loss yang aman
• Risk:Reward Ratio

🆓 Coba GRATIS sekarang!
👉 https://arra7-app.vercel.app

#ARRA7 #AITrading #TradingAnalysis`,

    // 3. WHY CHOOSE ARRA7
    whyArra7: `❓ <b>Kenapa Pilih ARRA7?</b>

Banyak platform trading, tapi...

✅ <b>AI yang CERDAS</b>
→ Analisa 5 teknik profesional sekaligus

✅ <b>CEPAT & AKURAT</b>
→ Hasil analisa dalam hitungan detik

✅ <b>LENGKAP</b>
→ Forex, Gold, Crypto, Saham IDX

✅ <b>MURAH</b>
→ Mulai dari GRATIS, Pro cuma 99K!

✅ <b>MUDAH DIGUNAKAN</b>
→ Upload chart → Dapat analisa!

💡 Tidak perlu jadi expert, biar AI yang analisa!

🔗 https://arra7-app.vercel.app

#ARRA7 #SmartTrading #TradingIndonesia`,

    // 4. TESTIMONIAL
    testimonial: `💬 <b>Kata Mereka tentang ARRA7:</b>

⭐⭐⭐⭐⭐

<i>"Sebelum pakai ARRA7, sering loss karena analisa asal-asalan. Sekarang lebih percaya diri karena ada AI yang bantu!"</i>
— @TraderJakarta

<i>"Fitur SMC/ICT-nya mantap! Entry jadi lebih presisi."</i>
— @GoldTraderID

<i>"Worth it banget 99K untuk sebulan. Udah balik modal berkali-kali!"</i>
— @ForexPemula

<i>"Akhirnya bisa analisa saham IDX juga. Lengkap!"</i>
— @SahamHarian

━━━━━━━━━━━━━━━━━━━━━

🚀 Giliran kamu merasakan manfaatnya!

👉 https://arra7-app.vercel.app

#ARRA7 #TestimoniTrader #TradingAI`,

    // 5. GOLD TRADING FOCUS
    goldTrading: `🥇 <b>Trading GOLD (XAUUSD)?</b>

Gold masih jadi favorit trader karena:
💰 Volatilitas tinggi = Profit potential besar
🛡️ Safe haven saat market tidak pasti

<b>ARRA7 bantu kamu analisa Gold dengan:</b>

📊 SMC/ICT → Cari Order Block & FVG
📈 Price Action → Support/Resistance akurat
📐 Fibonacci → Level retracement & extension
🕯️ Candlestick → Pattern recognition

🎯 <b>HASIL:</b>
• Entry yang presisi
• TP1, TP2, TP3
• SL yang aman
• Risk:Reward ratio jelas

⚡ Upload chart Gold kamu sekarang!
👉 https://arra7-app.vercel.app/analisa-market

#ARRA7 #GoldTrading #XAUUSD #ForexIndonesia`,

    // 6. SAHAM IDX FOCUS
    stockIDX: `📊 <b>Main Saham Indonesia?</b>

ARRA7 sekarang support analisa <b>Saham IDX!</b>

🏦 <b>Saham yang bisa dianalisa:</b>
• BBCA, BBRI, BMRI, BBNI
• TLKM, ASII, UNVR, GOTO
• ANTM, PTBA, ADRO, INCO
• Dan masih banyak lagi!

🤖 <b>AI akan kasih kamu:</b>
✅ Trend Analysis
✅ Support & Resistance
✅ Entry & Exit Point
✅ Stop Loss recommendation

💡 Cocok untuk:
• Swing Trading
• Position Trading
• Screening saham potensial

🆓 Coba GRATIS!
👉 https://arra7-app.vercel.app/analisa-saham

#ARRA7 #SahamIndonesia #IDX #InvestasiSaham`,

    // 7. RISK MANAGEMENT
    riskManagement: `🛡️ <b>Tips Risk Management</b>

Profit konsisten dimulai dari RISK yang terkelola!

📌 <b>ATURAN EMAS:</b>

1️⃣ <b>Max 1-2% per trade</b>
→ Jangan serakah, jaga modal!

2️⃣ <b>Selalu pakai Stop Loss</b>
→ Lindungi dari kerugian besar

3️⃣ <b>Risk:Reward minimal 1:2</b>
→ 1 win bisa cover 2 loss

4️⃣ <b>Jangan overtrade</b>
→ Quality > Quantity

━━━━━━━━━━━━━━━━━━━━━

🤖 <b>ARRA7 selalu kasih:</b>
• Entry Point
• Stop Loss
• Take Profit 1, 2, 3
• Risk:Reward Ratio

Jadi kamu tinggal follow! 👌

👉 https://arra7-app.vercel.app

#ARRA7 #RiskManagement #TradingTips`,

    // 8. FREE TRIAL
    freeTrial: `🆓 <b>GRATIS! Coba ARRA7 Sekarang!</b>

Belum yakin? Coba dulu GRATIS!

📦 <b>PAKET BASIC (FREE):</b>

✅ 2x Analisa Forex per hari
✅ 2x Analisa Saham IDX per hari
✅ Timeframe M1 - M30
✅ Gold & Major Pairs
✅ Economic Calendar

🔓 <b>TANPA:</b>
❌ Kartu kredit
❌ Biaya tersembunyi
❌ Batas waktu trial

💡 Cocok untuk:
• Coba-coba fitur AI
• Trader pemula
• Yang mau lihat dulu hasilnya

🚀 Upgrade ke PRO kapanpun kalau suka!

👉 https://arra7-app.vercel.app

#ARRA7 #FreeTrial #GratisTrading`,

    // 9. SMC/ICT ANALYSIS
    smcAnalysis: `📈 <b>Paham SMC/ICT Concepts?</b>

ARRA7 AI menggunakan teknik <b>Smart Money Concepts</b>!

🎯 <b>Yang kami analisa:</b>

📊 <b>Market Structure</b>
→ Higher High, Lower Low, BOS, CHoCH

🟦 <b>Order Blocks</b>
→ Bullish OB, Bearish OB

📉 <b>Fair Value Gaps (FVG)</b>
→ Imbalance yang sering di-fill

💧 <b>Liquidity</b>
→ EQH, EQL, Liquidity Sweep

🎯 <b>POI (Point of Interest)</b>
→ Area entry optimal

━━━━━━━━━━━━━━━━━━━━━

🤖 Gak perlu manual, AI yang cari!

Upload chart → Dapat analisa SMC lengkap!

👉 https://arra7-app.vercel.app/analisa-market

#ARRA7 #SMC #ICT #SmartMoney #OrderBlock`,

    // 10. WEEKEND REVIEW
    weekendReview: `📅 <b>Weekend = Waktu Evaluasi!</b>

Market tutup, saatnya review trading minggu ini!

📊 <b>Checklist Weekend:</b>

✅ Review semua trade minggu ini
✅ Cek Win Rate & Profit Factor
✅ Analisa kesalahan yang dibuat
✅ Siapkan watchlist minggu depan
✅ Update trading journal

━━━━━━━━━━━━━━━━━━━━━

💡 <b>Pro Tips:</b>

Gunakan ARRA7 untuk pre-analisa chart sebelum market buka Senin!

🤖 Upload chart weekend → Siapkan setup untuk Senin

👉 https://arra7-app.vercel.app

Selamat weekend & happy analyzing! 📈

#ARRA7 #WeekendTrading #TradingJournal`,
};

// Template metadata for admin display
export const TEMPLATE_METADATA: Record<string, { name: string; emoji: string; description: string }> = {
    newYearPromo: { name: 'Promo Tahun Baru', emoji: '🎆', description: 'Promo spesial tahun baru 99K' },
    aiFeatures: { name: 'AI Features', emoji: '🤖', description: 'Highlight fitur AI' },
    whyArra7: { name: 'Why ARRA7', emoji: '❓', description: 'Mengapa pilih ARRA7' },
    testimonial: { name: 'Testimonial', emoji: '💬', description: 'Social proof dari user' },
    goldTrading: { name: 'Gold Trading', emoji: '🥇', description: 'Fokus trading Gold/XAUUSD' },
    stockIDX: { name: 'Saham IDX', emoji: '📊', description: 'Fokus saham Indonesia' },
    riskManagement: { name: 'Risk Management', emoji: '🛡️', description: 'Tips risk management' },
    freeTrial: { name: 'Free Trial', emoji: '🆓', description: 'Promosi paket gratis' },
    smcAnalysis: { name: 'SMC/ICT Analysis', emoji: '📈', description: 'Konsep Smart Money' },
    weekendReview: { name: 'Weekend Review', emoji: '📅', description: 'Evaluasi weekend' },
};

// Get all template keys for iteration
export function getAllTemplateKeys(): string[] {
    return Object.keys(MARKETING_TEMPLATES);
}

// Get rotating template based on current hour
// Changes every 5 hours, cycles through all 10 templates
export function getRotatingTemplate(): { key: string; message: string } {
    const keys = getAllTemplateKeys();
    const now = new Date();

    // Calculate rotation index: changes every 5 hours
    // Using hours since epoch to ensure consistency across restarts
    const hoursSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60));
    const rotationIndex = Math.floor(hoursSinceEpoch / 5) % keys.length;

    const key = keys[rotationIndex];
    return {
        key,
        message: MARKETING_TEMPLATES[key],
    };
}

// Get specific template by key
export function getTemplateByKey(key: string): string | null {
    return MARKETING_TEMPLATES[key] || null;
}

export function isTelegramConfigured(): boolean {
    return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}
