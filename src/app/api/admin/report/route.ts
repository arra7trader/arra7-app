import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateDailyReport, getPerformanceSummary } from '@/lib/signal-tracker';
import { sendTelegramMessage, isTelegramConfigured } from '@/lib/telegram';
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
                    telegramConfigured: isTelegramConfigured(),
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
        const { action, report } = body;

        if (action === 'send_telegram') {
            if (!report) {
                return NextResponse.json(
                    { status: 'error', message: 'Report is required' },
                    { status: 400 }
                );
            }

            if (!isTelegramConfigured()) {
                return NextResponse.json(
                    { status: 'error', message: 'Telegram bot not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID in environment variables.' },
                    { status: 400 }
                );
            }

            // Send using existing telegram utility
            const result = await sendTelegramMessage(report, 'Markdown');

            if (!result.success) {
                return NextResponse.json(
                    { status: 'error', message: result.error || 'Telegram send failed' },
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
