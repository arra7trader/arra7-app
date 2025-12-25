import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateDailyReport, getPerformanceSummary } from '@/lib/signal-tracker';
import getTursoClient from '@/lib/turso';

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

// Get daily report
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (action === 'generate') {
            const report = await generateDailyReport();
            const summary = await getPerformanceSummary('today');

            return NextResponse.json({
                status: 'success',
                data: {
                    report,
                    summary,
                },
            });
        }

        // Get list of reports
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({
                status: 'success',
                data: { reports: [] },
            });
        }

        const result = await turso.execute({
            sql: 'SELECT * FROM daily_reports ORDER BY date DESC LIMIT 30',
            args: [],
        });

        return NextResponse.json({
            status: 'success',
            data: {
                reports: result.rows,
            },
        });

    } catch (error) {
        console.error('Get report error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to get report' },
            { status: 500 }
        );
    }
}

// Send report to Telegram
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { action, report, channelId } = body;

        if (action === 'send_telegram') {
            if (!report) {
                return NextResponse.json(
                    { status: 'error', message: 'Report is required' },
                    { status: 400 }
                );
            }

            // Send to Telegram using bot
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const chatId = channelId || process.env.TELEGRAM_CHANNEL_ID;

            if (!botToken || !chatId) {
                return NextResponse.json(
                    { status: 'error', message: 'Telegram bot not configured' },
                    { status: 400 }
                );
            }

            const telegramResponse = await fetch(
                `https://api.telegram.org/bot${botToken}/sendMessage`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: report,
                        parse_mode: 'Markdown',
                    }),
                }
            );

            const telegramResult = await telegramResponse.json();

            if (!telegramResult.ok) {
                return NextResponse.json(
                    { status: 'error', message: telegramResult.description || 'Telegram send failed' },
                    { status: 400 }
                );
            }

            // Save to database
            const turso = getTursoClient();
            if (turso) {
                const today = new Date().toISOString().split('T')[0];
                const summary = await getPerformanceSummary('today');

                await turso.execute({
                    sql: `INSERT OR REPLACE INTO daily_reports 
                        (date, total_signals, tp_hit, sl_hit, pending, win_rate, report_text, sent_to_telegram, sent_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
                    args: [
                        today,
                        summary?.total || 0,
                        summary?.tpHit || 0,
                        summary?.slHit || 0,
                        summary?.pending || 0,
                        parseFloat(summary?.winRate || '0'),
                        report,
                    ],
                });
            }

            return NextResponse.json({
                status: 'success',
                message: 'Report sent to Telegram successfully',
            });
        }

        return NextResponse.json(
            { status: 'error', message: 'Invalid action' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Send report error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to send report' },
            { status: 500 }
        );
    }
}
