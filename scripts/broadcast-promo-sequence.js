const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
let botToken = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/TELEGRAM_BOT_TOKEN=([^\r\n]+)/);
  if (match) botToken = match[1].trim();
}

const CHANNEL_ID = '@arrareborn7';
const STATE_FILE = path.join(__dirname, '..', '..', '.arra_ai', 'promo_daemon_state.json');

const PROMO_POSTS = [
  {
    step: 1,
    title: 'PICA Quant Builder Bundle (100 Modul Indikator & EA Maker MT5)',
    text: `🚀 <b>RAHASIA BIKIN ROBOT & INDIKATOR TRADING SENDIRI TANPA BISA CODING!</b> 🛠️📈

Sering beli indikator tapi repaint? Atau beli EA mahal-mahal tapi pas dipakai malah MC? 

Saatnya Anda punya kendali penuh atas sistem trading Anda sendiri dengan <b>PICA Quant Builder Bundle (2-in-1 Suite)</b>!

🔥 <b>APA YANG ANDA DAPATKAN?</b>
✅ <b>100 Modul Indikator TradingView & MT5</b>: Racik custom indikator tanpa pusing coding Pine Script/MQL5.
✅ <b>100 Modul EA MT5 Builder</b>: Susun strategi Scalping, Intraday, Swing, HFT, Hedging, hingga SMC hanya dengan drag-and-drop & klik logic.
✅ <b>Engine Backtest Instan</b>: Uji strategi Anda langsung di web dengan data riil, cek Win Rate, Max Drawdown, dan Profit Factor sebelum pasang modal nyata.
✅ <b>Export Source Code Bersih</b>: Hasil rakitan bisa langsung di-download (.mq5 / .ex5 / .pine) dan dipasang di MetaTrader 5 atau TradingView.

━━━━━━━━━━━━━━━━━━━━
⚡ <b>PROMO EARLY BIRD (CUMA 20 SLOT PERDANA)</b>
🏷️ <b>Harga 1: Rp 175.000 — SEKALI BAYAR UNTUK SEUMUR HIDUP (LIFETIME)!</b>
<i>(Setelah 20 slot habis, berlaku Harga 2: Rp 175.000 per bulan)</i>

👉 <b>Sudah terisi 8 slot! Sisa 12 slot lagi sebelum harga naik ke bulanan!</b>
━━━━━━━━━━━━━━━━━━━━

🌐 <b>Coba & Buat EA/Indikator Anda Sekarang:</b>
• EA Maker: https://pica.my.id/ea-maker
• Indikator Maker: https://pica.my.id/indicator-maker
• Rincian Paket: https://pica.my.id/pricing

📲 <b>Klaim Slot Early Bird Lifetime Rp 175k Sekarang:</b>
Hubungi Admin: @arra7trader 
<i>(Pembayaran via BCA 1392698188 a.n. Arland Pratama Muldiawan)</i>`,
    buttons: [
      [
        { text: '🛠️ Coba EA Maker di Web', url: 'https://pica.my.id/ea-maker' },
        { text: '📊 Coba Indikator Maker', url: 'https://pica.my.id/indicator-maker' }
      ],
      [
        { text: '💬 Amankan Slot Lifetime via Admin', url: 'https://t.me/arra7trader' }
      ]
    ]
  },
  {
    step: 2,
    title: 'EA PICA Neural Gold M1 & M5 (Deep Learning ONNX)',
    text: `👑🤖 <b>TRADING GOLD (XAUUSD) OTOMATIS BERBASIS DEEP LEARNING AI!</b> ⚡🥇

Masih sering floating ratusan pips di Gold? Sering emosi, overtrade, atau panik pas ada news besar?

Serahkan eksekusi market Anda kepada <b>EA PICA Neural Gold</b> — Expert Advisor MT5 generasi terbaru yang ditenagai model kecerdasan buatan <b>Native ONNX Bi-LSTM Neural Network</b>!

🔥 <b>KENAPA EA PICA NEURAL GOLD BEDA DARI ROBOT BIASA?</b>
✅ <b>Native AI Deep Learning</b>: Bukan sekadar indikator MA/RSI silang, tapi membaca probabilitas arah harga Gold menggunakan model machine learning terlatih.
✅ <b>Dual Weapon Strategy</b>:
   • <b>M1 Scalper</b>: Agresif, menangkap peluang mikro harian dengan trailing profit ketat.
   • <b>M5 Intraday</b>: Presisi tinggi, menyaring noise market untuk target reward optimal.
✅ <b>4 Preset File (.set) Siap Pakai</b>: Mode Aman (Low DD) dan Mode Agresif tinggal load ke MT5 tanpa ribet setting dari nol.
✅ <b>Strict Risk Management</b>: Stop Loss dinamis, anti-martingale liar, dan perlindungan modal ketat.

━━━━━━━━━━━━━━━━━━━━
💥 <b>FLASH SALE HARI INI (DISKON 82%)</b>
<s>Rp 499.000</s> ➡️ <b>Hanya Rp 90.000 (SEKALI BAYAR / LIFETIME)!</b>
<i>Include: File EA (.ex5), File AI (.onnx), 4 Preset (.set), Panduan Setup MT5, dan License Key unlocker resmi.</i>
━━━━━━━━━━━━━━━━━━━━

📥 <b>Download & Detail Panduan:</b>
https://pica.my.id/ea-pica-neural-gold

📲 <b>Dapatkan EA Neural Gold Sekarang:</b>
Chat Admin: @arra7trader
<i>(Aktivasi instan via BCA 1392698188 a.n. Arland Pratama Muldiawan)</i>`,
    buttons: [
      [
        { text: '📥 Lihat Spek EA Neural Gold', url: 'https://pica.my.id/ea-pica-neural-gold' }
      ],
      [
        { text: '⚡ Amankan Lisensi Rp 90k via Admin', url: 'https://t.me/arra7trader' }
      ]
    ]
  },
  {
    step: 3,
    title: 'HERMES AI Private Mentor Trading',
    text: `🧠✨ <b>PUNYA MENTOR TRADING PRIBADI PROFESIONAL 24/7 DI SAKU ANDA!</b> 📱💬

Trading sendirian itu berat. Saat market sideways bingung, pas floating panik, dan pas kena Stop Loss gak tahu di mana salahnya.

Sekarang Anda tidak perlu lagi trading sendirian. Kenalkan <b>HERMES — AI Private Mentor Trading</b> dari PICA!

🔥 <b>APA SAJA KEMAMPUAN HERMES AI MENTOR?</b>
✅ <b>Tanya Jawab Analisa Tanpa Batas 24/7</b>: Paham Smart Money Concepts (SMC), Order Block, Fair Value Gap (FVG), Supply-Demand, hingga Wyckoff.
✅ <b>Kalkulator Lot & Risk Management Otomatis</b>: Cukup sebutkan modal dan target SL, Hermes langsung hitung lot aman agar akun Anda anti-MC.
✅ <b>Review Jurnal Trading</b>: Ceritakan setup Anda yang gagal, Hermes akan bedah kenapa kena SL dan bagaimana memperbaikinya.
✅ <b>Mental & Psychology Coach</b>: Membantu Anda disiplin, menahan FOMO, dan mencegah revenge trading setelah kekalahan.

━━━━━━━━━━━━━━━━━━━━
🎁 <b>PROMO LAUNCHING (TERBATAS 50 SLOT PERTAMA)</b>
<s>Rp 299.000</s> ➡️ <b>Hanya Rp 49.000 (AKSES SELAMANYA)!</b>
<i>Hemat 83%! Sekali bayar, bebas konsultasi sepuasnya tanpa biaya langganan bulanan.</i>
━━━━━━━━━━━━━━━━━━━━

🌐 <b>Mulai Ngobrol dengan Mentor AI Anda:</b>
https://pica.my.id/hermes-mentor

📲 <b>Klaim Akses Hermes Rp 49k Sekarang:</b>
Hubungi Admin: @arra7trader
<i>(Konfirmasi cepat via BCA 1392698188 a.n. Arland Pratama Muldiawan)</i>`,
    buttons: [
      [
        { text: '🧠 Coba Hermes AI Mentor', url: 'https://pica.my.id/hermes-mentor' }
      ],
      [
        { text: '💬 Order Hermes Rp 49k via Admin', url: 'https://t.me/arra7trader' }
      ]
    ]
  }
];

function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading state:', e.message);
  }
  return { status: 'idle', postsSent: [] };
}

function writeState(data) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing state:', e.message);
  }
}

async function sendPost(postIndex) {
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not found');
  }

  const post = PROMO_POSTS[postIndex];
  if (!post) {
    throw new Error('Post not found at index ' + postIndex);
  }

  const payload = {
    chat_id: CHANNEL_ID,
    text: post.text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: post.buttons
    },
    disable_web_page_preview: false
  };

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error('Telegram API error: ' + JSON.stringify(data));
  }

  return data;
}

// CLI handler
const arg = process.argv[2];

if (arg === 'test-dry-run') {
  console.log('DRY RUN VALID: 3 Promo Posts parsed successfully.');
  PROMO_POSTS.forEach((p, i) => console.log(`Post #${i+1}: ${p.title} (${p.text.length} chars)`));
} else if (arg === 'stop') {
  const state = readState();
  state.status = 'stopped';
  state.stoppedAt = new Date().toISOString();
  writeState(state);
  console.log('PROMO_DAEMON_STOPPED');
} else if (arg === 'status') {
  console.log(JSON.stringify(readState(), null, 2));
} else if (arg === 'send-step') {
  const stepIdx = parseInt(process.argv[3], 10);
  sendPost(stepIdx).then(res => {
    const state = readState();
    state.postsSent = state.postsSent || [];
    state.postsSent.push({
      step: stepIdx + 1,
      title: PROMO_POSTS[stepIdx].title,
      messageId: res.result.message_id,
      sentAt: new Date().toISOString()
    });
    writeState(state);
    console.log(`POST_${stepIdx + 1}_SENT_SUCCESS: message_id=${res.result.message_id}`);
  }).catch(err => {
    console.error(`POST_FAILED:`, err.message);
    process.exit(1);
  });
} else if (arg === 'run-daemon') {
  console.log('[DAEMON] Starting 1-hour interval sequence for 3 posts...');
  (async () => {
    try {
      let state = {
        status: 'running',
        startedAt: new Date().toISOString(),
        postsSent: []
      };
      writeState(state);

      for (let i = 0; i < PROMO_POSTS.length; i++) {
        // Check if stopped externally
        state = readState();
        if (state.status === 'stopped') {
          console.log(`[DAEMON] Aborted at step ${i + 1} due to STOP command.`);
          process.exit(0);
        }

        console.log(`[DAEMON] Sending Post #${i + 1}: ${PROMO_POSTS[i].title}...`);
        const res = await sendPost(i);
        console.log(`[DAEMON] Post #${i + 1} Sent! message_id=${res.result.message_id}`);

        state = readState();
        state.postsSent = state.postsSent || [];
        state.postsSent.push({
          step: i + 1,
          title: PROMO_POSTS[i].title,
          messageId: res.result.message_id,
          sentAt: new Date().toISOString()
        });
        state.currentStep = i + 1;
        
        if (i < PROMO_POSTS.length - 1) {
          const nextRun = new Date(Date.now() + 3600 * 1000);
          state.nextStepAt = nextRun.toISOString();
          writeState(state);

          console.log(`[DAEMON] Waiting 1 hour (until ${nextRun.toLocaleTimeString()}) for next post...`);
          // Check every 10 seconds for stop signal
          const waitStart = Date.now();
          while (Date.now() - waitStart < 3600 * 1000) {
            await new Promise(r => setTimeout(r, 10000));
            const check = readState();
            if (check.status === 'stopped') {
              console.log('[DAEMON] Stop detected during wait interval. Exiting.');
              process.exit(0);
            }
          }
        } else {
          state.status = 'completed';
          state.completedAt = new Date().toISOString();
          delete state.nextStepAt;
          writeState(state);
          console.log('[DAEMON] All 3 posts broadcasted successfully!');
        }
      }
    } catch (e) {
      console.error('[DAEMON_ERROR]', e.message);
      const state = readState();
      state.status = 'error';
      state.lastError = e.message;
      writeState(state);
      process.exit(1);
    }
  })();
} else {
  console.log('Usage: node broadcast-promo-sequence.js [test-dry-run | send-step <index> | run-daemon | stop | status]');
}
