
import { NextResponse } from 'next/server';
import getTursoClient, { getMarketingCampaigns, logMarketingSent, hasReceivedMarketing, getTelegramUser } from '@/lib/turso';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Cron Job - Runs periodically (e.g. hourly)
export async function GET(request: Request) {
    try {
        // AUTHENTICATION: Check for Vercel Cron Secret (if configured)
        // const authHeader = request.headers.get('authorization');
        // if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        console.log('[MARKETING BOT] Starting run...');

        const turso = getTursoClient();
        if (!turso) return NextResponse.json({ error: 'Database not configured' });

        // 1. Get Active Campaigns
        const campaigns = (await getMarketingCampaigns()).filter(c => c.status === 'ACTIVE');
        console.log(`[MARKETING BOT] Found ${campaigns.length} active campaigns.`);

        let totalSent = 0;

        for (const campaign of campaigns) {
            console.log(`[MARKETING BOT] Processing campaign: ${campaign.name} (${campaign.type})`);

            // 2. Find eligible users based on Trigger Rules
            let eligibleUsers: any[] = [];

            if (campaign.type === 'INACTIVITY') {
                const days = campaign.trigger_rule.daysInactive || 7;
                // Find users who haven't logged in for X days
                // AND haven't received this campaign yet
                const res = await turso.execute({
                    sql: `SELECT id, name, email, membership, last_login_at 
                          FROM users 
                          WHERE last_login_at < datetime('now', ?) 
                          AND membership = 'BASIC'`, // Target BASIC users usually
                    args: [`-${days} days`]
                });
                eligibleUsers = res.rows;
            }
            else if (campaign.type === 'NEW_USER') {
                const days = 1; // Registered in last 24h
                const res = await turso.execute({
                    sql: `SELECT id, name, email, membership 
                          FROM users 
                          WHERE created_at > datetime('now', '-1 day') 
                          AND membership = 'BASIC'`
                });
                eligibleUsers = res.rows;
            }
            // Add other types as needed

            console.log(`[MARKETING BOT] Found ${eligibleUsers.length} potential users for ${campaign.name}`);

            // 3. Send Messages
            for (const user of eligibleUsers) {
                // Check if already sent
                if (await hasReceivedMarketing(campaign.id!, user.id as string)) {
                    continue;
                }

                // Process Channels
                for (const channel of campaign.channels) {
                    let sent = false;

                    if (channel === 'EMAIL' && resend && user.email) {
                        try {
                            const { data, error } = await resend.emails.send({
                                from: 'Arra7 Trader <onboarding@resend.dev>', // Update with your domain
                                to: [user.email as string],
                                subject: 'Special Offer for You! 🚀',
                                html: campaign.message_template.replace('{name}', (user.name as string) || 'Trader')
                            });
                            if (!error) {
                                console.log(`[EMAIL] Sent to ${user.email}`);
                                sent = true;
                            } else {
                                console.error('[EMAIL] Failed:', error);
                            }
                        } catch (e) {
                            console.error('[EMAIL] Exception:', e);
                        }
                    }
                    else if (channel === 'TELEGRAM') {
                        // Need to check if user has linked Telegram
                        // We don't have a direct "getTelegramChatIdByUserId" helper easily accessible 
                        // unless we query valid tables.
                        // For now, let's assume we can't send unless we join tables.
                        // But we can check `telegram_users` table.
                        const tgRes = await turso.execute({
                            sql: 'SELECT chat_id FROM telegram_users WHERE user_id = ?',
                            args: [user.id]
                        });

                        if (tgRes.rows.length > 0) {
                            const chatId = tgRes.rows[0].chat_id as string;
                            const message = campaign.message_template.replace('{name}', (user.name as string) || 'Trader');

                            // Send via Telegram Bot API
                            if (process.env.TELEGRAM_BOT_TOKEN) {
                                try {
                                    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ chat_id: chatId, text: message })
                                    });
                                    console.log(`[TELEGRAM] Sent to ${chatId}`);
                                    sent = true;
                                } catch (e) {
                                    console.error('[TELEGRAM] Failed:', e);
                                }
                            }
                        }
                    }

                    if (sent) {
                        await logMarketingSent(campaign.id!, user.id as string, channel);
                        totalSent++;
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${campaigns.length} campaigns. Sent ${totalSent} messages.`
        });

    } catch (error: any) {
        console.error('Marketing Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
