import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

// Harga membership
const PRICES: Record<string, number> = {
    PRO: 99000,
    VVIP: 399000
};

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
            return NextResponse.json({ status: 'error', message: 'Admin only' }, { status: 403 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 500 });
        }

        // Get membership counts
        const usersResult = await turso.execute(`
            SELECT 
                membership,
                COUNT(*) as count,
                updated_at
            FROM users 
            WHERE membership IN ('PRO', 'VVIP')
            GROUP BY membership
        `);

        let proCount = 0;
        let vvipCount = 0;

        for (const row of usersResult.rows) {
            if (row.membership === 'PRO') proCount = row.count as number;
            if (row.membership === 'VVIP') vvipCount = row.count as number;
        }

        // Calculate estimated revenue based on upgrades
        // Since we don't have a payments table, estimate from membership counts
        const totalRevenue = (proCount * PRICES.PRO) + (vvipCount * PRICES.VVIP);

        // Get recent upgrades (users who upgraded this month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Get users upgraded this month
        const monthlyResult = await turso.execute({
            sql: `SELECT id, name, email, membership, updated_at 
                  FROM users 
                  WHERE membership IN ('PRO', 'VVIP') 
                  AND updated_at >= ?
                  ORDER BY updated_at DESC`,
            args: [startOfMonth.toISOString()]
        });

        let monthlyRevenue = 0;
        let weeklyRevenue = 0;
        let todayRevenue = 0;
        const recentTransactions: any[] = [];

        for (const row of monthlyResult.rows) {
            const amount = PRICES[row.membership as string] || 0;
            monthlyRevenue += amount;

            const updatedAt = new Date(row.updated_at as string);
            if (updatedAt >= startOfWeek) weeklyRevenue += amount;
            if (updatedAt >= startOfDay) todayRevenue += amount;

            recentTransactions.push({
                id: row.id,
                userName: row.name,
                userEmail: row.email,
                membership: row.membership,
                amount: amount,
                date: row.updated_at
            });
        }

        // Generate monthly stats for chart (last 6 months)
        const monthlyStats: any[] = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthName = monthDate.toLocaleDateString('id-ID', { month: 'short' });

            // Count upgrades in that month
            const monthResult = await turso.execute({
                sql: `SELECT membership, COUNT(*) as count 
                      FROM users 
                      WHERE membership IN ('PRO', 'VVIP') 
                      AND updated_at >= ? AND updated_at <= ?
                      GROUP BY membership`,
                args: [monthDate.toISOString(), monthEnd.toISOString()]
            });

            let monthPro = 0;
            let monthVvip = 0;
            for (const r of monthResult.rows) {
                if (r.membership === 'PRO') monthPro = r.count as number;
                if (r.membership === 'VVIP') monthVvip = r.count as number;
            }

            monthlyStats.push({
                month: monthName,
                revenue: (monthPro * PRICES.PRO) + (monthVvip * PRICES.VVIP),
                proCount: monthPro,
                vvipCount: monthVvip
            });
        }

        return NextResponse.json({
            status: 'success',
            data: {
                totalRevenue,
                monthlyRevenue,
                weeklyRevenue,
                todayRevenue,
                proCount,
                vvipCount,
                recentTransactions: recentTransactions.slice(0, 10),
                monthlyStats
            }
        });

    } catch (error) {
        console.error('Revenue API error:', error);
        return NextResponse.json({ status: 'error', message: 'Failed to fetch revenue data' }, { status: 500 });
    }
}
