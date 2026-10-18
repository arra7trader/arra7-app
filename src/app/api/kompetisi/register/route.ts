import { NextResponse } from 'next/server';
import getTursoClient from '@/lib/turso';
import { sendTelegramMessage } from '@/lib/telegram';

interface RegisterRequestBody {
    fullName: string;
    email: string;
    phone: string;
    fbsAccountNumber: string;
    fbsAccountType?: string;
    depositAmount: number;
    registrationType?: 'NEW' | 'RE_ENTRY' | 'MULTI_ACCOUNT';
}

// In-memory fallback if database is restarting or offline
const IN_MEMORY_REGISTRATIONS: any[] = [];

export async function POST(request: Request) {
    try {
        const body: RegisterRequestBody = await request.json();

        const {
            fullName,
            email,
            phone,
            fbsAccountNumber,
            fbsAccountType = 'Standard',
            depositAmount,
            registrationType = 'NEW'
        } = body;

        // Validasi input
        if (!fullName || !email || !phone || !fbsAccountNumber) {
            return NextResponse.json(
                { success: false, error: 'Harap lengkapi semua kolom formulir pendaftaran.' },
                { status: 400 }
            );
        }

        const depositNum = Number(depositAmount);
        if (isNaN(depositNum) || depositNum < 25) {
            return NextResponse.json(
                { success: false, error: 'Minimal deposit untuk kompetisi adalah $25 USD.' },
                { status: 400 }
            );
        }

        // Tentukan tier fasilitas
        const tier = depositNum >= 250
            ? 'VIP_WHALE'
            : depositNum >= 100
            ? 'PRO_BOOSTER'
            : 'STARTER';

        const registrationRecord = {
            id: `fbs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            fbsAccountNumber: fbsAccountNumber.trim(),
            fbsAccountType: fbsAccountType.trim(),
            depositAmount: depositNum,
            registrationType,
            tier,
            status: 'PENDING_VERIFICATION',
            createdAt: new Date().toISOString()
        };

        // 1. Simpan ke Turso Database jika tersedia
        const turso = getTursoClient();
        if (turso) {
            try {
                // Ensure table exists
                await turso.execute(`
                    CREATE TABLE IF NOT EXISTS competition_participants (
                        id TEXT PRIMARY KEY,
                        full_name TEXT NOT NULL,
                        email TEXT NOT NULL,
                        phone TEXT NOT NULL,
                        fbs_account_number TEXT NOT NULL,
                        fbs_account_type TEXT DEFAULT 'Standard',
                        deposit_amount REAL NOT NULL,
                        status TEXT DEFAULT 'PENDING_VERIFICATION',
                        created_at TEXT NOT NULL
                    )
                `);

                // Insert participant
                await turso.execute({
                    sql: `
                        INSERT INTO competition_participants 
                        (id, full_name, email, phone, fbs_account_number, fbs_account_type, deposit_amount, status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    args: [
                        registrationRecord.id,
                        registrationRecord.fullName,
                        registrationRecord.email,
                        registrationRecord.phone,
                        registrationRecord.fbsAccountNumber,
                        registrationRecord.fbsAccountType,
                        registrationRecord.depositAmount,
                        registrationRecord.status,
                        registrationRecord.createdAt
                    ]
                });
            } catch (dbErr) {
                console.error('[KOMPETISI] Error saving to Turso DB:', dbErr);
                IN_MEMORY_REGISTRATIONS.push(registrationRecord);
            }
        } else {
            IN_MEMORY_REGISTRATIONS.push(registrationRecord);
        }

        // 2. Kirim notifikasi instan ke Telegram Admin jika terkonfigurasi
        try {
            const typeLabel = registrationRecord.registrationType === 'RE_ENTRY'
                ? '🔄 RE-ENTRY / RESET AKUN MC'
                : registrationRecord.registrationType === 'MULTI_ACCOUNT'
                ? '🎰 MULTI-AKUN (TIKET TAMBAHAN)'
                : '🆕 PENDAFTARAN PERTAMA';

            const tierLabel = registrationRecord.tier === 'VIP_WHALE'
                ? '👑 VIP WHALE ($250+) ➔ FREE Sinyal VVIP + Bot Indikator + Rebate 20%'
                : registrationRecord.tier === 'PRO_BOOSTER'
                ? '⭐ PRO BOOSTER ($100+) ➔ FREE Sinyal VVIP PICA 1 Bulan'
                : '🌱 STARTER ($25+) ➔ Akses Turnamen & Leaderboard';

            const telegramMsg = `🏆 <b>REGISTRASI KOMPETISI FBS 1 BULAN!</b>

👤 <b>Nama:</b> ${registrationRecord.fullName}
📱 <b>WhatsApp:</b> ${registrationRecord.phone}
📧 <b>Email:</b> ${registrationRecord.email}
🔢 <b>No. Akun FBS:</b> <code>${registrationRecord.fbsAccountNumber}</code>
⚙️ <b>Tipe Akun:</b> ${registrationRecord.fbsAccountType}
💵 <b>Deposit:</b> $${registrationRecord.depositAmount} USD
📋 <b>Tipe Registrasi:</b> ${typeLabel}
💎 <b>Fasilitas Tier:</b> ${tierLabel}
📅 <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

<i>Silakan cek Dashboard IB FBS untuk memvalidasi akun & aktifkan akses sinyal peserta jika eligible.</i>`;

            await sendTelegramMessage(telegramMsg, 'HTML');
        } catch (teleErr) {
            console.error('[KOMPETISI] Error sending Telegram alert:', teleErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Pendaftaran kompetisi berhasil dikirim langsung ke sistem!',
            participant: registrationRecord
        });
    } catch (err: any) {
        console.error('[KOMPETISI_REGISTER_ERROR]', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Terjadi kesalahan sistem saat memproses pendaftaran.' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const turso = getTursoClient();
        if (turso) {
            try {
                const rs = await turso.execute(`
                    SELECT * FROM competition_participants 
                    ORDER BY created_at DESC 
                    LIMIT 100
                `);
                return NextResponse.json({ success: true, data: rs.rows });
            } catch {
                return NextResponse.json({ success: true, data: IN_MEMORY_REGISTRATIONS });
            }
        }
        return NextResponse.json({ success: true, data: IN_MEMORY_REGISTRATIONS });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
