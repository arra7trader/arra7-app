console.log('[AUTONOMOUS GROWTH WORKER] Dinonaktifkan total secara permanen sesuai perintah mutlak CEO.');
process.exit(0);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STATE_FILE = path.join(ROOT_DIR, 'logs', 'worker-state.json');
const LOG_FILE = path.join(ROOT_DIR, 'logs', 'growth-worker.log');
const ALPHA_OUTPUT = path.join(ROOT_DIR, 'ready-to-share', 'daily-alpha.txt');

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
}
loadEnv();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@arrareborn7';
const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_6 || process.env.GROQ_API_KEY_2
].filter(Boolean);
let currentKeyIndex = 0;

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (e) {
    // ignore logging error
  }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    log(`Warning: Failed to load state, starting fresh: ${e.message}`);
  }
  return {
    lastMarketScan: 0,
    lastPoll: 0,
    lastScarcity: 0,
    lastAlphaPack: 0,
    lastXauMapping: 0,
    salesCount: 12
  };
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    log(`Error saving state: ${e.message}`);
  }
}

// Telegram Helpers
async function sendTelegramMessage(text, parseMode = 'Markdown') {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const body = {
    chat_id: CHANNEL_ID,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: false
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram error: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function sendTelegramPoll(question, options) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPoll`;
  const body = {
    chat_id: CHANNEL_ID,
    question,
    options,
    is_anonymous: true
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram poll error: ${JSON.stringify(data)}`);
  }
  return data.result;
}

// Market Data via CoinGecko Free API
async function fetchMarketPrices() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CoinGecko HTTP ${res.status}`);
  }
  const data = await res.json();
  return {
    btc: { price: data.bitcoin?.usd || 0, change24h: (data.bitcoin?.usd_24h_change || 0).toFixed(2) },
    eth: { price: data.ethereum?.usd || 0, change24h: (data.ethereum?.usd_24h_change || 0).toFixed(2) },
    sol: { price: data.solana?.usd || 0, change24h: (data.solana?.usd_24h_change || 0).toFixed(2) }
  };
}

// XAUUSD M15 Data via Yahoo Finance (GC=F Gold Futures)
async function fetchXauusdM15Data() {
  const url = 'https://query2.finance.yahoo.com/v8/finance/chart/GC=F?interval=15m&range=2d';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });
  if (!res.ok) {
    throw new Error(`Yahoo Finance XAU HTTP ${res.status}`);
  }
  const d = await res.json();
  const q = d.chart.result[0].indicators.quote[0];
  const closes = q.close.filter(c => typeof c === 'number' && !isNaN(c));
  const highs = q.high.filter(c => typeof c === 'number' && !isNaN(c));
  const lows = q.low.filter(c => typeof c === 'number' && !isNaN(c));

  const currentPrice = closes[closes.length - 1];
  const highest24h = Math.max(...highs.slice(-96));
  const lowest24h = Math.min(...lows.slice(-96));
  const recentCloses = closes.slice(-5).map(c => c.toFixed(2)).join(' -> ');

  return {
    currentPrice: currentPrice.toFixed(2),
    bsl: highest24h.toFixed(2),
    ssl: lowest24h.toFixed(2),
    recentCloses
  };
}

// Groq AI Completion with Key Rotation
async function callGroqAI(prompt, systemPrompt = 'Anda adalah AI Market Analyst & Lead Strategist kelas institusi dari ARRA REBORN.') {
  const maxAttempts = GROQ_KEYS.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = GROQ_KEYS[currentKeyIndex];
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.6,
          max_tokens: 700
        })
      });

      const data = await res.json();
      if (res.ok && data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }

      log(`Groq key ${currentKeyIndex + 1} issue (${res.status}): ${JSON.stringify(data.error || data)}. Rotating...`);
      currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
    } catch (e) {
      log(`Groq network error on key ${currentKeyIndex + 1}: ${e.message}. Rotating...`);
      currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
    }
  }
  throw new Error('All Groq keys failed.');
}

// ----------------------------------------------------
// TASK 1: Publish High-Value Institutional Market Signal
// ----------------------------------------------------
async function taskPublishMarketAlpha(state) {
  log('Executing Task: Market Alpha Analysis (Forward Magnet)...');
  const market = await fetchMarketPrices();

  const prompt = `
Buatkan 1 analisa sinyal pasar ringkas, tajam, dan berbobot institusi untuk channel Telegram @arrareborn7.
Data harga live saat ini:
- Bitcoin (BTC): $${market.btc.price.toLocaleString()} (24h: ${market.btc.change24h}%)
- Ethereum (ETH): $${market.eth.price.toLocaleString()} (24h: ${market.eth.change24h}%)
- Solana (SOL): $${market.sol.price.toLocaleString()} (24h: ${market.sol.change24h}%)

Format postingan harus elegan, menggunakan emoji trading yang profesional, dan struktur:
1. 📊 *INSTITUTIONAL MARKET FLASH & BIAS*
2. 🎯 Key Support & Resistance Bitcoin & Ethereum
3. 💡 Setup Trading Idea (Entry zone, Stop Loss, Take Profit, Risk:Reward)
4. 🧠 Pesan Psikologi Trading singkat (1 kalimat disiplin)

Gunakan Bahasa Indonesia profesional. Jangan sebutkan Anda AI, gunakan identitas tim Analis ARRA.
`;

  const analysisContent = await callGroqAI(prompt);

  const fullBroadcast = `${analysisContent}

---
💎 *HERMES AI Private Mentor 24/7*
Butuh analisa real-time & hitungan lot otomatis untuk portofolio Anda?
Akses mentor AI pribadi Anda sekarang:
👉 [pica.my.id/hermes-mentor](https://pica.my.id/hermes-mentor)
🏷️ *Hanya Rp 49.000 — Akses Seumur Hidup!*

📢 *Channel:* @arrareborn7 | 👤 *Admin:* @arra7trader
🔁 *Silakan forward analisa ini ke grup / rekan trader Anda jika bermanfaat!*`;

  const result = await sendTelegramMessage(fullBroadcast);
  log(`Market Alpha posted! Msg ID: ${result.message_id}`);
  state.lastMarketScan = Date.now();
  saveState(state);
}

// ----------------------------------------------------
// TASK 2: Community Engagement Poll (Boosts Telegram Ranking)
// ----------------------------------------------------
async function taskCommunityPoll(state) {
  log('Executing Task: Community Poll & Engagement...');
  const polls = [
    {
      q: '📊 Menurut Anda, penutupan candle harian Bitcoin (BTC) hari ini cenderung kemana?',
      o: ['🚀 Bullish Expansion (Lanjut Naik)', '📉 Retest Area Support (Koreksi)', '⚖️ Konsolidasi / Sideways']
    },
    {
      q: '🎯 Masalah trading apa yang paling sering bikin Anda floating minus / MC?',
      o: ['Overtrading & Balas Dendam', 'Tidak Pasang Stop Loss (SL)', 'Lot Terlalu Besar (Overlot)', 'Kurang Sabar Menunggu Setup']
    },
    {
      q: '⚡ Gaya trading mana yang saat ini paling banyak Anda gunakan di market?',
      o: ['Scalping Cepat (M15)', 'Day Trading (H1-H4)', 'Swing Trading (D1-W1)', 'Spot Akumulasi / HODL']
    }
  ];

  const randomPoll = polls[Math.floor(Math.random() * polls.length)];
  const result = await sendTelegramPoll(randomPoll.q, randomPoll.o);
  log(`Poll posted! Msg ID: ${result.message_id}`);
  state.lastPoll = Date.now();
  saveState(state);
}

// ----------------------------------------------------
// TASK 3: Scarcity & Conversion Push (Prime Hours)
// ----------------------------------------------------
async function taskScarcityPush(state) {
  log('Executing Task: Scarcity Push...');
  const remainingSlots = Math.max(3, 50 - (state.salesCount || 15));

  const text = `⚠️ *UPDATE SLOT PROMO: HERMES AI PRIVATE MENTOR*

Slot promo akses lifetime semakin menipis.
Saat ini tersisa *${remainingSlots} slot terakhir* dari kuota pembukaan 50 user.

Mengapa trader mengambil HERMES AI hari ini?
✅ AI Trading Mentor 24 jam tanpa lelah
✅ Ingat riwayat trading & portofolio Anda (Memory 20 chat)
✅ Hitung position sizing otomatis sebelum Anda entry
✅ Review trading journal & kurangi overtrading
✅ *Rp 49.000 sekali bayar untuk SELAMANYA* (Setelah kuota habis kembali ke Rp 149.000)

👉 [AMBIL AKSES DI SINI](https://pica.my.id/hermes-mentor)

💳 *BCA: 1392698188* (Arland Pratama Muldiawan)
📩 Konfirmasi instan ke: @arra7trader`;

  const result = await sendTelegramMessage(text);
  log(`Scarcity push posted! Msg ID: ${result.message_id}`);
  state.lastScarcity = Date.now();
  saveState(state);
}

// ----------------------------------------------------
// TASK 4: Generate Outbound Cross-Posting Alpha Pack
// ----------------------------------------------------
async function taskGenerateOutboundAlphaPack(state) {
  log('Executing Task: Generating Cross-Community Alpha Pack...');
  const market = await fetchMarketPrices();

  const prompt = `
Buatkan 1 template pesan analisa pasar kripto & tips trading yang SANGAT BERBOBOT untuk dibagikan ke grup diskusi trader publik (seperti grup Indodax, Tokocrypto, Telegram Trader umum).
Gaya bahasa: Analis independen yang membagikan insight gratis berkualitas tinggi.
Data live: BTC $${market.btc.price}, ETH $${market.eth.price}.
Struktur:
- [DAILY ALPHA & MARKET RADAR]
- Analisa likuiditas & struktur teknikal
- Tips manajemen risiko praktis
- Tanda tangan sopan di akhir:
  "Analisis dirangkum oleh tim riset ARRA Reborn. Diskusi & sinyal harian gratis: @arrareborn7 | Tool AI Mentor: pica.my.id/hermes-mentor"

PENTING: Jangan terdengar seperti spam! Buat agar admin grup lain pun mengapresiasi isinya.
`;

  const alphaPack = await callGroqAI(prompt);
  const fileContent = `========================================================\n` +
    `OUTBOUND ALPHA PACK - READY TO SHARE IN EXTERNAL TRADER GROUPS\n` +
    `Generated at: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n` +
    `Tips: Copy pesan di bawah ini dan bagikan ke grup-grup trader / forum kripto / Discord / Facebook.\n` +
    `Pesan ini murni edukasi berbobot sehingga TIDAK AKAN di-kick admin, tapi akan menarik trader ke channel Anda!\n` +
    `========================================================\n\n` +
    alphaPack + `\n\n`;

  fs.writeFileSync(ALPHA_OUTPUT, fileContent, 'utf8');
  log(`Outbound Alpha Pack written to: ${ALPHA_OUTPUT}`);
  state.lastAlphaPack = Date.now();
  saveState(state);
}

// ----------------------------------------------------
// TASK 5: Institutional M15 XAUUSD SMC & ICT Mapping (WITH VISUAL CHART)
// Runs every 4 hours automatically
// ----------------------------------------------------
async function taskXauusdM15Mapping(state) {
  log('Executing Task: 4-Hour XAUUSD M15 SMC Mapping (with Visual Chart Image)...');
  try {
    const pythonScript = path.join(__dirname, 'generate-xauusd-m15-chart.py');
    const { stdout, stderr } = await execPromise(`python "${pythonScript}"`);
    log(`Chart Engine: ${stdout.trim().replace(/\r?\n/g, ' -> ')}`);
    if (stderr && stderr.trim()) log(`Chart Engine Warning: ${stderr.trim()}`);
    state.lastXauMapping = Date.now();
    saveState(state);
  } catch (e) {
    log(`Error generating XAUUSD chart mapping: ${e.message}`);
  }
}

// ----------------------------------------------------
// MAIN AUTONOMOUS WORKER LOOP
// ----------------------------------------------------
async function runWorkerCycle() {
  const state = loadState();
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  log('--- Autonomous Worker Checking Triggers ---');

  // Trigger 5: XAUUSD M15 Mapping (Every 4 hours)
  if (!state.lastXauMapping || (now - state.lastXauMapping) > (4 * ONE_HOUR)) {
    try {
      await taskXauusdM15Mapping(state);
    } catch (e) {
      log(`Error in taskXauusdM15Mapping: ${e.message}`);
    }
  }

  // Trigger 1: Market Alpha Analysis (Every 3 hours)
  if (!state.lastMarketScan || (now - state.lastMarketScan) > (3 * ONE_HOUR)) {
    try {
      await taskPublishMarketAlpha(state);
    } catch (e) {
      log(`Error in taskPublishMarketAlpha: ${e.message}`);
    }
  }

  // Trigger 2: Community Poll (Every 12 hours)
  if (!state.lastPoll || (now - state.lastPoll) > (12 * ONE_HOUR)) {
    try {
      await taskCommunityPoll(state);
    } catch (e) {
      log(`Error in taskCommunityPoll: ${e.message}`);
    }
  }

  // Trigger 3: Scarcity Push (Every 6 hours)
  if (!state.lastScarcity || (now - state.lastScarcity) > (6 * ONE_HOUR)) {
    try {
      await taskScarcityPush(state);
    } catch (e) {
      log(`Error in taskScarcityPush: ${e.message}`);
    }
  }

  // Trigger 4: Outbound Alpha Pack generation (Every 4 hours)
  if (!state.lastAlphaPack || (now - state.lastAlphaPack) > (4 * ONE_HOUR)) {
    try {
      await taskGenerateOutboundAlphaPack(state);
    } catch (e) {
      log(`Error in taskGenerateOutboundAlphaPack: ${e.message}`);
    }
  }
}

// Daemon entrypoint
async function main() {
  log('====================================================');
  log('🤖 ARRA 24/7 AUTONOMOUS GROWTH WORKER STARTED');
  log('Target Channel: ' + CHANNEL_ID);
  log('XAUUSD M15 Mapping Module: ACTIVE (Every 4 Hours)');
  log('Ready to drive traffic and convert customers 24/7');
  log('====================================================');

  // Run immediately on boot
  try {
    await runWorkerCycle();
  } catch (e) {
    log(`Startup cycle error: ${e.message}`);
  }

  // Check every 15 minutes for scheduled triggers
  const CHECK_INTERVAL = 15 * 60 * 1000;
  setInterval(async () => {
    try {
      await runWorkerCycle();
    } catch (e) {
      log(`Loop cycle error: ${e.message}`);
    }
  }, CHECK_INTERVAL);
}

main().catch(err => {
  log(`Fatal error in main: ${err.message}`);
});
