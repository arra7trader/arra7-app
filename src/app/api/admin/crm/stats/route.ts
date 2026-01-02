import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';
import { isAdmin } from '../../users/route';

// Pricing constants for revenue calculation
const PRICING = {
    PRO: 49000,   // Rp 49.000/month
    VVIP: 99000,  // Rp 99.000/month
};

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !isAdmin(session.user.email)) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 403 }
            );
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json(
                { status: 'error', message: 'Database not configured' },
                { status: 503 }
            );
        }

        // Get all users
        const usersResult = await turso.execute(`
            SELECT * FROM users ORDER BY created_at DESC
        `);

        const users = usersResult.rows;
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const thisMonth = now.toISOString().slice(0, 7); // YYYY-MM

        // Calculate member stats
        const memberStats = {
            total: users.length,
            basic: users.filter((u: any) => u.membership === 'BASIC').length,
            pro: users.filter((u: any) => u.membership === 'PRO').length,
            vvip: users.filter((u: any) => u.membership === 'VVIP').length,
            active: users.filter((u: any) => u.membership !== 'BASIC').length,
        };

        // Calculate retention metrics
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const expiringUsers = users.filter((u: any) => {
            if (!u.membership_expires || u.membership === 'BASIC') return false;
            const expDate = new Date(u.membership_expires);
            return expDate > now && expDate <= sevenDaysFromNow;
        });

        const inactiveUsers = users.filter((u: any) => {
            if (!u.last_login_at) return false;
            const lastLogin = new Date(u.last_login_at);
            return lastLogin < sevenDaysAgo && u.membership !== 'BASIC';
        });

        const retentionAlerts = {
            expiringSoon: expiringUsers.map((u: any) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                membership: u.membership,
                expiresAt: u.membership_expires,
            })),
            inactive: inactiveUsers.map((u: any) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                membership: u.membership,
                lastLoginAt: u.last_login_at,
            })),
            counts: {
                expiring: expiringUsers.length,
                inactive: inactiveUsers.length,
            }
        };

        // Calculate revenue (estimated based on active paid members)
        // In a real app, this would come from a payments table
        const proRevenue = memberStats.pro * PRICING.PRO;
        const vvipRevenue = memberStats.vvip * PRICING.VVIP;
        const estimatedMRR = proRevenue + vvipRevenue;

        const revenueStats = {
            mrr: estimatedMRR,
            proRevenue,
            vvipRevenue,
            paidMembers: memberStats.pro + memberStats.vvip,
            // These would need a payments table for accuracy
            today: 0,
            thisMonth: estimatedMRR,
        };

        // Recent signups (last 7 days)
        const recentSignups = users.filter((u: any) => {
            if (!u.created_at) return false;
            const createdAt = new Date(u.created_at);
            return createdAt >= sevenDaysAgo;
        }).length;

        // Conversion metrics
        const conversionRate = memberStats.total > 0
            ? ((memberStats.pro + memberStats.vvip) / memberStats.total * 100).toFixed(1)
            : '0';

        return NextResponse.json({
            status: 'success',
            data: {
                memberStats,
                revenueStats,
                retentionAlerts,
                metrics: {
                    recentSignups,
                    conversionRate,
                    churnRisk: retentionAlerts.counts.expiring + retentionAlerts.counts.inactive,
                },
                updatedAt: now.toISOString(),
            }
        });

    } catch (error) {
        console.error('CRM stats error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to fetch CRM stats' },
            { status: 500 }
        );
    }
}
