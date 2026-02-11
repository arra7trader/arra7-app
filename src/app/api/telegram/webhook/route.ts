import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import getTursoClient, { linkTelegramUser, getTelegramUser } from '@/lib/turso';

export async function POST(request: Request) {
    try {
        const update = await request.json();

        // Handle message events
        if (update.message) {
            const chatId = update.message.chat.id.toString();
            const text = update.message.text?.trim();
            const user = update.message.from;
            const username = user.username;
            const firstName = user.first_name;

            if (!text) return NextResponse.json({ ok: true });

            console.log(`[TELEGRAM] Msg from ${firstName} (${chatId}): ${text}`);

            // 1. /start
            if (text === '/start') {
                await sendTelegramMessage(
                    `👋 **Selamat Datang, ${firstName}!**\n\n` +
                    `Saya adalah **ARRA Quantum Assistant** 🤖\n` +
                    `Tugas saya adalah memberikan update market & sinyal VVIP secara real-time.\n\n` +
                    `🛑 **STATUS: BELUM TERHUBUNG**\n` +
                    `Silakan hubungkan akun VVIP Anda untuk akses penuh.\n\n` +
                    `👉 Ketik: \`/auth [email_anda]\`\n` +
                    `Contoh: \`/auth sultan@gmail.com\``,
                    'Markdown'
                );
            }

            // 2. /auth [email]
            else if (text.startsWith('/auth')) {
                const parts = text.split(' ');
                if (parts.length < 2) {
                    await sendTelegramMessage(
                        `⚠️ **Format Salah**\n\nGunakan format: \`/auth [email_anda]\`\nContoh: \`/auth budi@gmail.com\``,
                        'Markdown'
                    );
                    return NextResponse.json({ ok: true });
                }

                const email = parts[1].toLowerCase();
                const turso = getTursoClient();

                if (turso) {
                    // Check if email exists and is VVIP/PRO
                    const userRes = await turso.execute({
                        sql: `SELECT id, membership, name FROM users WHERE email = ?`,
                        args: [email]
                    });

                    if (userRes.rows.length > 0) {
                        const dbUser = userRes.rows[0];
                        const membership = dbUser.membership as string;

                        if (membership === 'VVIP' || membership === 'PRO' || membership === 'ADMIN') {
                            // Valid VVIP/PRO - Link Account
                            const success = await linkTelegramUser(dbUser.id as string, {
                                chatId,
                                username,
                                firstName
                            });

                            if (success) {
                                await sendTelegramMessage(
                                    `✅ **AKUN TERHUBUNG!**\n\n` +
                                    `👤 Nama: ${dbUser.name}\n` +
                                    `💎 Status: **${membership}**\n\n` +
                                    `Anda sekarang memiliki akses ke **Quantum Alerts**.\n` +
                                    `Ketik \`/heatmap\` untuk melihat posisi Big Player saat ini.`,
                                    'Markdown'
                                );
                            } else {
                                await sendTelegramMessage(`❌ Gagal menghubungkan database. Coba lagi nanti.`);
                            }
                        } else {
                            await sendTelegramMessage(
                                `🚫 **Akses Ditolak**\n\nEmail \`${email}\` terdaftar sebagai **BASIC**.\nFitur ini khusus member **PRO/VVIP**.\n\nSilakan upgrade di website ARRA7.`,
                                'Markdown'
                            );
                        }
                    } else {
                        await sendTelegramMessage(
                            `❓ **Email Tidak Ditemukan**\n\nPastikan Anda sudah mendaftar di website ARRA7.\nJika belum, daftar gratis di [arra7-app.vercel.app](https://arra7-app.vercel.app)`,
                            'Markdown'
                        );
                    }
                }
            }

            // 3. /heatmap (VVIP Feature)
            else if (text === '/heatmap' || text === '/gold') {
                const linkedUser = await getTelegramUser(chatId);

                if (!linkedUser) {
                    await sendTelegramMessage(
                        `🔒 **FITUR TERKUNCI**\n\nAnda belum login. Silakan hubungkan akun VVIP Anda dulu.\n\n👉 Ketik: \`/auth [email_anda]\``,
                        'Markdown'
                    );
                    return NextResponse.json({ ok: true });
                }

                if (linkedUser.membership === 'BASIC') {
                    await sendTelegramMessage(
                        `💎 **UPGRADE REQUIRED**\n\nFitur Heatmap khusus VVIP/PRO.\nAkun Anda: BASIC.`,
                        'Markdown'
                    );
                    return NextResponse.json({ ok: true });
                }

                // Fetch Heatmap Data (Mock fetch via internal API logic or URL)
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arra7-app.vercel.app';
                    const res = await fetch(`${apiUrl}/api/xauusd/probability-zones`);

                    if (res.ok) {
                        const data = await res.json();
                        const price = data.currentPrice;

                        // Identify Bias
                        const buyZones = data.zones.filter((z: any) => z.bias === 'LONG');
                        const sellZones = data.zones.filter((z: any) => z.bias === 'SHORT');
                        const totalBuy = buyZones.reduce((acc: number, z: any) => acc + z.probability, 0);
                        const totalSell = sellZones.reduce((acc: number, z: any) => acc + z.probability, 0);
                        const bias = totalBuy > totalSell ? '🟢 NET LONG (Bullish)' : '🔴 NET SHORT (Bearish)';

                        // Top Zones
                        const topBuy = buyZones.slice(0, 3).map((z: any) => `  • $${z.price.toFixed(2)} (${Math.round(z.probability * 100)}%)`).join('\n');
                        const topSell = sellZones.slice(0, 3).map((z: any) => `  • $${z.price.toFixed(2)} (${Math.round(z.probability * 100)}%)`).join('\n');

                        await sendTelegramMessage(
                            `🐋 **WHALE RADAR UPDATE**\n\n` +
                            `💰 **XAUUSD**: $${price.toFixed(2)}\n` +
                            `📊 **Bias**: ${bias}\n\n` +
                            `**🧱 Supply Walls (Resistance):**\n${topSell || '  (None detected)'}\n\n` +
                            `**🛡 Demand Walls (Support):**\n${topBuy || '  (None detected)'}\n\n` +
                            `_Data from Swissquote Institutional Feed_`,
                            'Markdown'
                        );
                    } else {
                        await sendTelegramMessage(`⚠️ Gagal mengambil data market. Coba lagi.`);
                    }
                } catch (e) {
                    console.error(e);
                    await sendTelegramMessage(`⚠️ Error fetching data.`);
                }
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Telegram Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
