import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { koinAmount, bankName, accountNumber, accountName } = body;

        const amount = Number(koinAmount);

        if (!amount || amount < 200) {
            return NextResponse.json({ error: 'Minimal pencairan adalah 200 Koin' }, { status: 400 });
        }

        if (!bankName || !accountNumber || !accountName) {
            return NextResponse.json({ error: 'Data rekening tidak lengkap' }, { status: 400 });
        }

        const turso = getTursoClient();
        if (!turso) throw new Error('Database not configured');

        // Check user balance
        const userRes = await turso.execute({
            sql: 'SELECT koin_balance FROM users WHERE id = ?',
            args: [session.user.id]
        });

        if (userRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const balance = Number(userRes.rows[0].koin_balance || 0);

        if (balance < amount) {
            return NextResponse.json({ error: 'Koin tidak mencukupi' }, { status: 400 });
        }

        // We deduct the balance immediately to hold the funds in 'PENDING', 
        // Admin will approve manually.
        const trxId = crypto.randomUUID();
        const desc = `Withdraw ke ${bankName} ${accountNumber} a/n ${accountName}`;

        // Fee SKN Rp 5.000 (5 Koin), calculated logically but deducted as a whole from balance. The user expects Rp (amount - 5) * 1000 to arrive in bank.
        // We deduct `amount` Koin from user.

        await turso.batch([
            {
                sql: `UPDATE users SET koin_balance = koin_balance - ? WHERE id = ?`,
                args: [amount, session.user.id]
            },
            {
                sql: `INSERT INTO trx_coins (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'WITHDRAW', ?, 'PENDING')`,
                args: [trxId, session.user.id, -amount, desc]
            }
        ], 'write');

        // Optional: Alert Admin via Telegram here
        const adminTelegram = process.env.ADMIN_CHAT_ID || process.env.TELEGRAM_ADMIN_ID;
        if (adminTelegram) {
            const text = `🚨 *Pencairan Koin (Withdraw)* 🚨\n\n` +
                `Email: ${session.user.email}\n` +
                `Jumlah: *${amount} Koin* (Rp ${(amount * 1000).toLocaleString('id-ID')})\n` +
                `Bank: ${bankName}\n` +
                `No Rekening: \`${accountNumber}\`\n` +
                `Nama Rekening: ${accountName}\n\n` +
                `Sistem sudah menahan Saldo Koin user. Silahkan transfer Rp ${((amount - 5) * 1000).toLocaleString('id-ID')} (setelah potong admin fee) ke rekening di atas!`;

            try {
                // If bot token is set, send non-blocking telegram alert.
                // Assuming you have a telegram bot utility or just direct fetch:
                const botToken = process.env.TELEGRAM_BOT_TOKEN;
                if (botToken) {
                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: adminTelegram, text, parse_mode: 'Markdown' })
                    });
                }
            } catch (e) {
                console.error("Failed to notify admin telegram:", e);
            }
        }

        return NextResponse.json({ success: true, message: 'Permintaan pencairan sedang diproses Admin.', remaining_balance: balance - amount });

    } catch (error) {
        console.error('Withdraw API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
