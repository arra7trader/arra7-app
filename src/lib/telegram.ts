// Telegram Bot API utility for sending marketing messages
// Uses environment variables for security

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

function getTelegramConfig() {
    // Use TELEGRAM_BOT_TOKEN_2 for marketing/admin panel
    const botToken = process.env.TELEGRAM_BOT_TOKEN_2 || process.env.TELEGRAM_BOT_TOKEN;
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
// 1 PANDUAN LENGKAP - 7 GAYA PENYAMPAIAN BERBEDA
// Template berubah otomatis setiap 24 jam (7 hari cycle)
// Konten: Panduan lengkap Copytrade ARRA77 (Daftar → Profit)

export const COPYTRADE_TEMPLATES: Record<string, string> = {
    // HARI 1: STORYTELLING - "Perjalanan Budi"
    day1_story: `🎯 <b>DARI NOL JADI PROFIT: Kisah Budi dengan Copytrade</b>

<b>📖 CHAPTER 1: Masalah Budi</b>
Budi trader pemula. Sering loss karena:
❌ Tidak punya strategi jelas
❌ Emosional saat trading
❌ Tidak punya waktu analisa market

<b>📖 CHAPTER 2: Penemuan Budi</b>
Budi menemukan <b>Copytrade ARRA77</b>:
✅ Copy trading otomatis dari provider pro
✅ Trading 24/7 via EA Bridge
✅ Kontrol penuh atas risiko

<b>📖 CHAPTER 3: Langkah Budi</b>
1️⃣ <b>Daftar:</b> Login → Menu Copytrade → Buat Profile
2️⃣ <b>Top Up:</b> QRIS min. 10 credits (Rp 10.000)
3️⃣ <b>Pilih Provider:</b> Lihat track record → Klik Follow
4️⃣ <b>Install EA:</b> Download → Input License Key → Run!

<b>📖 CHAPTER 4: Hasil Budi</b>
📊 Minggu 1: Belajar sistem
📊 Minggu 2: Mulai profit konsisten
📊 Minggu 3: +25% dari modal!

<b>💡 KUNCI SUKSES BUDI:</b>
• Pilih provider win rate > 60%
• Gunakan fixed lot 0.01
• Biarkan EA bekerja 24/7
• Top up cukup untuk 20+ signals

<b>🚀 GILIRAN ANDA!</b>
Modal kecil bisa profit besar. Mulai sekarang!

🔗 <b>Daftar Gratis:</b>
https://arra7-app.vercel.app/copytrade

💰 <b>Biaya:</b> 1 signal = 3 credits (Rp 3.000)

#CopytradeARRA77 #SuccessStory #TradingOtomatis`,

    // HARI 2: STEP-BY-STEP - "Panduan Visual"
    day2_stepbystep: `📚 <b>PANDUAN LENGKAP COPYTRADE ARRA77</b>
<i>Dari Nol Sampai Bisa Profit (Step-by-Step)</i>

━━━━━━━━━━━━━━━━━━━━
<b>🎯 STEP 1: DAFTAR (5 MENIT)</b>
━━━━━━━━━━━━━━━━━━━━

1. Buka https://arra7-app.vercel.app
2. Login/Register akun
3. Menu "Copytrade" → "Create Profile"
4. Isi nama & email → Submit

✅ <i>Done! Profile aktif.</i>

━━━━━━━━━━━━━━━━━━━━
<b>💰 STEP 2: TOP UP (3 MENIT)</b>
━━━━━━━━━━━━━━━━━━━━

1. Klik "Top Up" di dashboard
2. Pilih jumlah credits:
   • 10 credits = Rp 10.000 (min)
   • 50 credits = Rp 50.000 (recommended)
   • 100 credits = Rp 100.000 (best value)
3. Scan QRIS → Bayar
4. Upload bukti → Tunggu approve

✅ <i>Saldo masuk dalam 1x24 jam.</i>

━━━━━━━━━━━━━━━━━━━━
<b>👥 STEP 3: PILIH PROVIDER (10 MENIT)</b>
━━━━━━━━━━━━━━━━━━━━

1. Menu "Providers" → Browse
2. Cek statistik:
   ✓ Win Rate > 60%
   ✓ Total Trades > 20
   ✓ Risk Level: MEDIUM
3. Klik "Follow" pada provider pilihan
4. Set konfigurasi:
   • Risk Mode: FIXED_LOT
   • Fixed Lot: 0.01
   • One Trade: ON

✅ <i>Provider siap di-copy!</i>

━━━━━━━━━━━━━━━━━━━━
<b>🔧 STEP 4: INSTALL EA (15 MENIT)</b>
━━━━━━━━━━━━━━━━━━━━

1. Download EA dari dashboard
2. Copy file ke MT5/Experts/
3. Buka MT5 → Navigator → Experts
4. Drag "Arra-Copytrade-Bridge" ke chart
5. Input License Key dari dashboard
6. Centang "Allow WebRequest"
7. OK → EA aktif!

✅ <i>EA running, siap copy signal!</i>

━━━━━━━━━━━━━━━━━━━━
<b>📈 STEP 5: MONITOR PROFIT</b>
━━━━━━━━━━━━━━━━━━━━

Dashboard menampilkan:
• Saldo credits
• Posisi aktif
• Riwayat trading
• Profit/Loss

💡 <b>Tips:</b>
• Gunakan VPS untuk 24/7
• Cek EA setiap hari
• Top up sebelum habis

🔗 <b>MULAI SEKARANG:</b>
https://arra7-app.vercel.app/copytrade

#Tutorial #Copytrade #StepByStep #MT5`,

    // HARI 3: FAQ STYLE - "Tanya Jawab"
    day3_faq: `❓ <b>COPYTRADE ARRA77: 10 Pertanyaan Paling Sering</b>

<b>Q1: Apa itu Copytrade ARRA77?</b>
A: Sistem copy trading otomatis. Anda copy trade dari provider pro langsung ke akun MT5 Anda via EA Bridge.

<b>Q2: Berapa modal minimal?</b>
A: 
• Top up min: 10 credits (Rp 10.000)
• Biaya per signal: 3 credits (Rp 3.000)
• Recommended: 50 credits untuk mulai

<b>Q3: Bagaimana cara daftar?</b>
A: 
1. Login di https://arra7-app.vercel.app
2. Menu Copytrade → Create Profile
3. Generate License Key
4. Install EA di MT5

<b>Q4: Apa itu EA Bridge?</b>
A: Software yang menghubungkan sinyal dari server ke MT5 Anda. Jalan otomatis 24/7.

<b>Q5: Bagaimana cara pilih provider?</b>
A:
• Win Rate > 60%
• Total Trades > 20
• Risk Level sesuai profil Anda
• Lihat konsistensi profit

<b>Q6: Berapa profit per bulan?</b>
A: Tergantung provider & market. Rata-rata:
• Konservatif: 5-10%/bulan
• Moderat: 10-20%/bulan
• Agresif: 20-30%/bulan (risk tinggi)

<b>Q7: Apakah ada biaya bulanan?</b>
A: Tidak ada! Hanya bayar per signal (3 credits). Tidak ada subscription fee.

<b>Q8: Bisa trade manual sambil copytrade?</b>
A: Bisa! Aktifkan "One Trade at a Time" untuk hindari konflik.

<b>Q9: Bagaimana jika saldo habis?</b>
A: Signal otomatis di-skip. Top up untuk lanjut copy.

<b>Q10: Bisa withdraw saldo?</b>
A: Hubungi admin untuk penarikan saldo.

━━━━━━━━━━━━━━━━━━━━

<b>🚀 SIAP MULAI?</b>

Panduan lengkap tersedia di:
🔗 https://arra7-app.vercel.app/copytrade

<b>💬 Butuh bantuan?</b>
DM admin via Telegram!

#FAQ #Copytrade #TanyaJawab #HelpDesk`,

    // HARI 4: CHECKLIST - "To-Do List"
    day4_checklist: `✅ <b>CHECKLIST LENGKAP COPYTRADE ARRA77</b>
<i>Centang setiap step sampai profit!</i>

━━━━━━━━━━━━━━━━━━━━
<b>📋 PREPARATION (Hari 1)</b>
━━━━━━━━━━━━━━━━━━━━
□ Download & install MT5
□ Buka akun demo/live di broker
□ Siapkan modal min. Rp 50.000
□ Siapkan VPS (optional tapi recommended)

━━━━━━━━━━━━━━━━━━━━
<b>📋 REGISTRATION (Hari 1)</b>
━━━━━━━━━━━━━━━━━━━━
□ Daftar di https://arra7-app.vercel.app
□ Login ke akun
□ Menu "Copytrade"
□ Create Profile (isi nama & email)
□ Generate License Key
□ Screenshot License Key untuk EA

━━━━━━━━━━━━━━━━━━━━
<b>📋 TOP UP (Hari 1-2)</b>
━━━━━━━━━━━━━━━━━━━━
□ Klik "Top Up"
□ Pilih jumlah credits (min. 10)
□ Scan QRIS & bayar
□ Upload bukti pembayaran
□ Tunggu approve admin (max 1x24 jam)
□ Cek saldo sudah masuk

━━━━━━━━━━━━━━━━━━━━
<b>📋 PROVIDER SELECTION (Hari 2)</b>
━━━━━━━━━━━━━━━━━━━━
□ Menu "Providers" → Browse
□ Filter provider dengan:
  □ Win Rate > 60%
  □ Total Trades > 20
  □ Status: APPROVED
□ Klik "Follow"
□ Set konfigurasi:
  □ Risk Mode: FIXED_LOT
  □ Fixed Lot: 0.01 (untuk mulai)
  □ One Trade at a Time: ON

━━━━━━━━━━━━━━━━━━━━
<b>📋 EA INSTALLATION (Hari 2-3)</b>
━━━━━━━━━━━━━━━━━━━━
□ Download EA dari dashboard
□ Copy file .ex5 ke MT5/Experts/
□ Restart MT5
□ Buka Navigator → Experts
□ Drag EA ke chart (XAUUSD/M15 recommended)
□ Input License Key
□ Centang "Allow WebRequest"
□ Pastikan smiley face muncul di EA
□ Cek status di dashboard: ONLINE

━━━━━━━━━━━━━━━━━━━━
<b>📋 MONITORING (Hari 3-7)</b>
━━━━━━━━━━━━━━━━━━━━
□ Cek EA setiap hari (heartbeat < 30s)
□ Monitor saldo credits
□ Lihat posisi aktif di dashboard
□ Track profit/loss
□ Top up jika saldo < 10 credits

━━━━━━━━━━━━━━━━━━━━
<b>📋 OPTIMIZATION (Minggu 2+)</b>
━━━━━━━━━━━━━━━━━━━━
□ Evaluasi performa provider
□ Adjust lot size jika perlu
□ Diversifikasi ke multiple providers
□ Scale up modal jika profit konsisten

━━━━━━━━━━━━━━━━━━━━

<b>🎉 SELAMAT!</b>
Anda sekarang copytrader aktif!

<b>💡 TIPS PRO:</b>
• Jangan sering ganti provider
• Biarkan EA bekerja (jangan micromanage)
• Fokus pada long-term consistency

🔗 <b>Start Now:</b>
https://arra7-app.vercel.app/copytrade

#Checklist #Copytrade #TradingPlan #Success`,

    // HARI 5: VISUAL GUIDE - "Infographic Style"
    day5_visual: `🎨 <b>COPYTRADE ARRA77: Visual Guide</b>
<i>1 Gambar = 1000 Kata</i>

╔═══════════════════════════════════╗
║   🚀 CARA KERJA COPYTRADE         ║
╚═══════════════════════════════════╝

┌─────────────┐
│  PROVIDER   │ → Trade Signal (BUY/SL/TP)
│  (Trader Pro)│
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  ARRA77     │ → Process & Distribute
│   SERVER    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  EA BRIDGE  │ → Execute di MT5
│  (Your PC)  │    Anda!
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   PROFIT!   │ 💰💰💰
└─────────────┘

╔═══════════════════════════════════╗
║   💰 BREAKDOWN BIAYA              ║
╚═══════════════════════════════════╝

┌──────────────────────────────┐
│ 1 Signal = 3 Credits         │
│                              │
│ ├─ Provider: 2 credits       │
│ └─ Admin: 1 credit           │
│                              │
│ 1 Credit = Rp 1.000          │
│ 1 Signal = Rp 3.000          │
└──────────────────────────────┘

╔═══════════════════════════════════╗
║   📊 CONTOH PERHITUNGAN           ║
╚═══════════════════════════════════╝

Modal: Rp 100.000 (100 credits)
Signals/hari: 5
Biaya/hari: 15 credits (Rp 15.000)

Scenario (Win Rate 60%):
├─ 3 Win x Rp 50.000 = +150.000
├─ 2 Loss x Rp 30.000 = -60.000
├─ Biaya signal = -15.000
└─ NET PROFIT = +75.000/hari*

*Disclaimer: Hasil tidak guaranteed

╔═══════════════════════════════════╗
║   ⚡ TIMELINE MULAI               ║
╚═══════════════════════════════════╝

Day 1: Daftar + Top Up ✅
Day 2: Pilih Provider ✅
Day 3: Install EA ✅
Day 4: First Signal! 🎯
Day 7: Evaluate Results 📊
Day 30: Scale Up! 🚀

━━━━━━━━━━━━━━━━━━━━

<b>🎯 READY TO START?</b>

🔗 https://arra7-app.vercel.app/copytrade

#VisualGuide #Infographic #Copytrade #EasyStart`,

    // HARI 6: MISTAKES - "Jangan Lakukan Ini!"
    day6_mistakes: `⚠️ <b>7 KESALAHAN FATAL COPYTRADE PEMULA</b>
<i>Jangan sampai Anda mengalaminya!</i>

━━━━━━━━━━━━━━━━━━━━

<b>❌ MISTAKE #1: Modal Terlalu Kecil</b>
<b>Masalah:</b> Top up 10 credits, langsung habis dalam 3 signal.
<b>Solusi:</b> Minimal 50 credits untuk buffer 15+ signals.

<b>❌ MISTAKE #2: Ganti Provider Terus</b>
<b>Masalah:</b> Panik saat loss, ganti provider. Akhirnya tidak pernah tahu performa jangka panjang.
<b>Solusi:</b> Minimal 2 minggu evaluasi sebelum ganti.

<b>❌ MISTAKE #3: Lot Size Terlalu Besar</b>
<b>Masalah:</b> Langsung pakai 0.1 lot, loss besar dalam 1 trade.
<b>Solusi:</b> Mulai 0.01 lot, scale up perlahan.

<b>❌ MISTAKE #4: EA Offline Tidak Dipantau</b>
<b>Masalah:</b> EA mati 3 hari, kehilangan 10+ signal profit.
<b>Solusi:</b> Cek dashboard setiap hari. Gunakan VPS.

<b>❌ MISTAKE #5: Tidak Paham Biaya</b>
<b>Masalah:</b> Kaget saldo cepat habis, tidak tahu ada biaya per signal.
<b>Solusi:</b> Pahami: 1 signal = 3 credits = Rp 3.000.

<b>❌ MISTAKE #6: Pilih Provider Salah</b>
<b>Masalah:</b> Tergiur profit 100%/bulan, ternyata high risk, loss semua.
<b>Solusi:</b> Pilih win rate > 60%, total trades > 20, risk MEDIUM.

<b>❌ MISTAKE #7: Trade Manual Saat Copytrade</b>
<b>Masalah:</b> Buka posisi manual saat EA aktif, konflik signal.
<b>Solusi:</b> Aktifkan "One Trade at a Time" atau trade di akun terpisah.

━━━━━━━━━━━━━━━━━━━━

<b>✅ CHECKLIST ANTI-GAGAL:</b>

□ Modal cukup (50+ credits)
□ Provider berkualitas (win rate > 60%)
□ Lot size konservatif (0.01 untuk mulai)
□ EA monitored daily (heartbeat < 30s)
□ Pahami biaya (3 credits/signal)
□ Pakai VPS untuk uptime 24/7
□ One Trade at a Time: ON

━━━━━━━━━━━━━━━━━━━━

<b>💡 BONUS TIP:</b>

<b>"Copytrade itu marathon, bukan sprint."</b>

Fokus pada konsistensi, bukan profit instan.
Provider terbaik = yang konsisten 6-12 bulan.

━━━━━━━━━━━━━━━━━━━━

<b>🚀 START SMART:</b>
https://arra7-app.vercel.app/copytrade

#Mistakes #Copytrade #TradingTips #LearnFromOthers`,

    // HARI 7: SUCCESS BLUEPRINT - "Roadmap to Profit"
    day7_blueprint: `🗺️ <b>BLUEPRINT SUKSES COPYTRADE ARRA77</b>
<i>Roadmap 30 Hari dari Nol ke Profit Konsisten</i>

━━━━━━━━━━━━━━━━━━━━
<b>📅 MINGGU 1: FOUNDATION</b>
━━━━━━━━━━━━━━━━━━━━

<b>Day 1-2: Setup</b>
□ Daftar & buat profile
□ Top up 50-100 credits
□ Download & install EA
□ Test EA dengan demo account

<b>Day 3-4: Provider Research</b>
□ Browse semua provider
□ Catat 3-5 kandidat terbaik
□ Cek track record (min. 20 trades)
□ Pilih 1 provider utama

<b>Day 5-7: First Signals</b>
□ Follow provider pilihan
□ Set lot size 0.01
□ Monitor 5-10 signals pertama
□ Catat hasil (win/loss)

<b>🎯 Target Minggu 1:</b>
• Sistem berjalan stabil
• EA online 24/7
• Minimal 5 signals executed

━━━━━━━━━━━━━━━━━━━━
<b>📅 MINGGU 2: OPTIMIZATION</b>
━━━━━━━━━━━━━━━━━━━━

<b>Day 8-10: Performance Review</b>
□ Evaluasi win rate aktual
□ Cek average profit/loss
□ Adjust lot size jika perlu
□ Top up jika saldo < 30 credits

<b>Day 11-14: Scale Up</b>
□ Naikkan lot ke 0.02 (jika profit konsisten)
□ Pertimbangkan provider ke-2 untuk diversifikasi
□ Setup VPS jika belum

<b>🎯 Target Minggu 2:</b>
• Win rate > 55%
• Profit > 10% dari modal
• Sistem 100% otomatis

━━━━━━━━━━━━━━━━━━━━
<b>📅 MINGGU 3-4: CONSISTENCY</b>
━━━━━━━━━━━━━━━━━━━━

<b>Day 15-21: Stabilization</b>
□ Maintain konfigurasi optimal
□ Monitor daily performance
□ Reinvest profit (compound)
□ Build emergency buffer (50+ credits)

<b>Day 22-30: Expansion</b>
□ Evaluasi monthly performance
□ Plan scale up untuk bulan depan
□ Consider additional providers
□ Document lessons learned

<b>🎯 Target Minggu 3-4:</b>
• Profit konsisten 15-25%/bulan
• Drawdown < 20%
• Sistem fully automated

━━━━━━━━━━━━━━━━━━━━
<b>📊 EXPECTED RESULTS (30 Hari)</b>
━━━━━━━━━━━━━━━━━━━━

<b>Conservative Scenario:</b>
• Modal awal: Rp 100.000
• Win rate: 60%
• Profit: +Rp 50.000 (50%)
• Signals: ~100

<b>Moderate Scenario:</b>
• Modal awal: Rp 100.000
• Win rate: 65%
• Profit: +Rp 100.000 (100%)
• Signals: ~100

<b>Aggressive Scenario:</b>
• Modal awal: Rp 100.000
• Win rate: 70%
• Profit: +Rp 200.000 (200%)
• Signals: ~100

⚠️ <i>Disclaimer: Past performance ≠ future results</i>

━━━━━━━━━━━━━━━━━━━━
<b>🔑 KEYS TO SUCCESS</b>
━━━━━━━━━━━━━━━━━━━━

1️⃣ <b>Patience:</b> Jangan ganti provider setiap loss
2️⃣ <b>Consistency:</b> Biarkan sistem bekerja
3️⃣ <b>Risk Management:</b> Lot size sesuai modal
4️⃣ <b>Monitoring:</b> Cek EA & saldo daily
5️⃣ <b>Continuous Learning:</b> Track & analyze results

━━━━━━━━━━━━━━━━━━━━

<b>🚀 START YOUR JOURNEY:</b>
https://arra7-app.vercel.app/copytrade

<b>💬 Need Help?</b>
Admin support via Telegram!

#Blueprint #Success #Copytrade #Roadmap #Profit`,
};

// Template metadata untuk admin display
export const TEMPLATE_METADATA: Record<string, { name: string; emoji: string; description: string; day: number }> = {
    day1_story: { name: 'Hari 1: Storytelling', emoji: '📖', description: 'Kisah Perjalanan Budi (Storytelling)', day: 1 },
    day2_stepbystep: { name: 'Hari 2: Step-by-Step', emoji: '📚', description: 'Panduan Visual Step-by-Step', day: 2 },
    day3_faq: { name: 'Hari 3: FAQ', emoji: '❓', description: '10 Pertanyaan Paling Sering', day: 3 },
    day4_checklist: { name: 'Hari 4: Checklist', emoji: '✅', description: 'To-Do List Lengkap', day: 4 },
    day5_visual: { name: 'Hari 5: Visual', emoji: '🎨', description: 'Infographic Style Guide', day: 5 },
    day6_mistakes: { name: 'Hari 6: Mistakes', emoji: '⚠️', description: '7 Kesalahan Fatal Pemula', day: 6 },
    day7_blueprint: { name: 'Hari 7: Blueprint', emoji: '🗺️', description: 'Roadmap 30 Hari ke Profit', day: 7 },
};

// Mendapatkan key template berdasarkan hari (1-7)
export function getTemplateKeyForDay(dayOfWeek: number): string {
    // dayOfWeek: 1 (Senin) - 7 (Minggu)
    const mapping: Record<number, string> = {
        1: 'day1_story',
        2: 'day2_stepbystep',
        3: 'day3_faq',
        4: 'day4_checklist',
        5: 'day5_visual',
        6: 'day6_mistakes',
        7: 'day7_blueprint',
    };
    return mapping[dayOfWeek] || 'day1_story';
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
    // Check for marketing bot token (TELEGRAM_BOT_TOKEN_2) or fallback to main token
    return !!(
        (process.env.TELEGRAM_BOT_TOKEN_2 || process.env.TELEGRAM_BOT_TOKEN) && 
        process.env.TELEGRAM_CHANNEL_ID
    );
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

