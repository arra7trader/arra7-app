import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';
import { nanoid } from 'nanoid';

// GET /api/copytrade/providers - Get all active signal providers or user's provider profile
export async function GET(request: NextRequest) {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(request.url);
        const myProfile = searchParams.get('myProfile');
        const own = searchParams.get('own');

        // If requesting own profile
        if (myProfile === 'true' || own === 'true') {
            if (!session?.user?.email) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const userResult = await turso.execute({
                sql: 'SELECT id FROM users WHERE email = ?',
                args: [session.user.email]
            });

            if (userResult.rows.length === 0) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            const userId = userResult.rows[0].id as string;

            const providerResult = await turso.execute({
                sql: `SELECT sp.*, ps.* FROM signal_providers sp
                      LEFT JOIN provider_statistics ps ON sp.id = ps.provider_id
                      WHERE sp.user_id = ?`,
                args: [userId]
            });

            if (providerResult.rows.length === 0) {
                return NextResponse.json({ provider: null });
            }

            return NextResponse.json({ provider: providerResult.rows[0] });
        }

        // Get all active providers with statistics
        const result = await turso.execute(`
            SELECT sp.*, ps.*, u.name as user_name
            FROM signal_providers sp
            LEFT JOIN provider_statistics ps ON sp.id = ps.provider_id
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE sp.is_active = 1 AND sp.is_approved = 1
            ORDER BY sp.total_followers DESC
        `);

        return NextResponse.json({ providers: result.rows });

    } catch (error) {
        console.error('[COPYTRADE] GET providers error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/copytrade/providers - Register as a signal provider
export async function POST(request: NextRequest) {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { displayName, bio, subscriptionFee, profitSharingPercent, brokerName, brokerAccountId } = body;

        // Validate inputs
        if (!displayName || displayName.trim().length < 3) {
            return NextResponse.json({ error: 'Display name must be at least 3 characters' }, { status: 400 });
        }

        if (subscriptionFee < 0 || subscriptionFee > 10000000) {
            return NextResponse.json({ error: 'Invalid subscription fee' }, { status: 400 });
        }

        if (profitSharingPercent < 0 || profitSharingPercent > 30) {
            return NextResponse.json({ error: 'Profit sharing must be between 0-30%' }, { status: 400 });
        }

        // Get user ID
        const userResult = await turso.execute({
            sql: 'SELECT id, membership FROM users WHERE email = ?',
            args: [session.user.email]
        });

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userResult.rows[0];
        const userId = user.id as string;
        const membership = user.membership as string;

        // Check membership eligibility (PRO or VVIP)
        if (membership !== 'PRO' && membership !== 'VVIP') {
            return NextResponse.json({
                error: 'You need PRO or VVIP membership to become a Signal Provider'
            }, { status: 403 });
        }

        // Check if already registered
        const existingProvider = await turso.execute({
            sql: 'SELECT id FROM signal_providers WHERE user_id = ?',
            args: [userId]
        });

        if (existingProvider.rows.length > 0) {
            return NextResponse.json({ error: 'You are already registered as a provider' }, { status: 400 });
        }

        // Create provider
        const providerId = nanoid();
        await turso.execute({
            sql: `INSERT INTO signal_providers 
                  (id, user_id, display_name, bio, subscription_fee, profit_sharing_percent, 
                   broker_name, broker_account_id, is_active, is_approved)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
            args: [providerId, userId, displayName, bio || '', subscriptionFee, profitSharingPercent,
                brokerName || '', brokerAccountId || '']
        });

        // Create initial statistics entry
        await turso.execute({
            sql: `INSERT INTO provider_statistics (id, provider_id) VALUES (?, ?)`,
            args: [nanoid(), providerId]
        });

        return NextResponse.json({
            success: true,
            providerId,
            message: 'Provider registration submitted for admin approval'
        });

    } catch (error) {
        console.error('[COPYTRADE] POST provider error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
