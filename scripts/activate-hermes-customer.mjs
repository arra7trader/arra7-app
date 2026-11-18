import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { createClient } from '@libsql/client';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env.local');

function getTursoClient() {
  if (!fs.existsSync(ENV_FILE)) {
    throw new Error(`.env.local not found at ${ENV_FILE}`);
  }
  const env = fs.readFileSync(ENV_FILE, 'utf8');
  const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
  const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);

  if (!urlMatch || !tokenMatch) {
    throw new Error('TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not found in .env.local');
  }

  return createClient({
    url: urlMatch[1].trim(),
    authToken: tokenMatch[1].trim(),
  });
}

export async function activateHermesForEmail(rawEmail, notes = 'Manual BCA transfer verified by Arland') {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Email tidak valid!');
  }

  const client = getTursoClient();

  // 1. Ensure user_purchases table exists
  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        product TEXT NOT NULL,
        price INTEGER NOT NULL,
        currency TEXT DEFAULT 'IDR',
        status TEXT DEFAULT 'ACTIVE',
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 2. Check if user already exists in users table
  const userRes = await client.execute({
    sql: 'SELECT id, name, email, membership FROM users WHERE email = ?',
    args: [email],
  });

  let userId;
  let userName;

  if (userRes.rows.length > 0) {
    userId = userRes.rows[0].id;
    userName = userRes.rows[0].name || email.split('@')[0];
    const currentTier = userRes.rows[0].membership;

    // Update membership to HERMES_MENTOR if basic
    if (!['PRO', 'VVIP'].includes(currentTier)) {
      await client.execute({
        sql: "UPDATE users SET membership = 'HERMES_MENTOR', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [userId],
      });
    }
  } else {
    // User hasn't logged in yet - create pre-activated user profile
    userId = crypto.randomUUID();
    userName = email.split('@')[0];
    await client.execute({
      sql: `INSERT INTO users (id, email, name, membership, created_at, updated_at)
            VALUES (?, ?, ?, 'HERMES_MENTOR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [userId, email, userName],
    });
  }

  // 3. Record purchase in user_purchases
  const existingPurchase = await client.execute({
    sql: "SELECT id FROM user_purchases WHERE user_id = ? AND product = 'HERMES_MENTOR' AND status = 'ACTIVE'",
    args: [userId],
  });

  if (existingPurchase.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO user_purchases (user_id, product, price, notes)
            VALUES (?, 'HERMES_MENTOR', 49000, ?)`,
      args: [userId, notes],
    });
  }

  return { userId, userName, email };
}

// Interactive CLI if called directly
async function main() {
  const argEmail = process.argv[2];

  if (argEmail) {
    try {
      console.log(`Mengaktifkan HERMES AI untuk ${argEmail}...`);
      const result = await activateHermesForEmail(argEmail);
      printSuccess(result);
    } catch (err) {
      console.error(`❌ Gagal: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('========================================================');
  console.log('⚡ AKTIVATOR HERMES AI PRIVATE MENTOR (LIFETIME)');
  console.log('========================================================');

  rl.question('Masukkan email pembeli (contoh: budi@gmail.com): ', async (inputEmail) => {
    rl.close();
    try {
      console.log(`\nMemproses database Turso...`);
      const result = await activateHermesForEmail(inputEmail);
      printSuccess(result);
    } catch (err) {
      console.error(`\n❌ Gagal: ${err.message}`);
    }
  });
}

function printSuccess({ userName, email }) {
  console.log('\n========================================================');
  console.log(`🎉 BERHASIL DIAKTIFKAN SEUMUR HIDUP!`);
  console.log(`Pengguna : ${userName} (${email})`);
  console.log(`Produk   : HERMES AI Private Mentor (Rp 49.000 Lifetime)`);
  console.log(`Status   : ACTIVE ✅`);
  console.log('========================================================');
  console.log('\n📋 SALIN PESAN INI UNTUK DIKIRIM KE PEMBELI DI TELEGRAM:');
  console.log('--------------------------------------------------------');
  console.log(`Halo kak ${userName}! Pembayaran Rp 49.000 sudah kami verifikasi. ✅

Akses HERMES AI Private Mentor kamu sudah AKTIF SEUMUR HIDUP untuk email: ${email}

Cara pakainya sangat mudah:
1. Buka https://pica.my.id/hermes-mentor
2. Login menggunakan email Google kamu (${email})
3. Klik tombol "Mulai Chat Mentor"
4. Kamu bisa langsung tanya analisa, hitung lot, review journal, atau minta rekomendasi setup trading kapan saja 24/7!

Selamat trading & salam profit! 🚀`);
  console.log('--------------------------------------------------------\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(console.error);
}
