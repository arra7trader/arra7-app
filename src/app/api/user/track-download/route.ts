import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json(
                { status: 'error', message: 'Database not configured' },
                { status: 503 }
            );
        }

        const userId = session.user.id;

        if (!userId) {
            return NextResponse.json(
                { status: 'error', message: 'User ID missing' },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();

        // Update user record
        await turso.execute({
            sql: `UPDATE users SET downloaded_apk = 1, apk_downloaded_at = ? WHERE id = ?`,
            args: [now, userId]
        });

        console.log(`[APK] User ${userId} downloaded APK at ${now}`);

        return NextResponse.json({
            status: 'success',
            message: 'Download tracked'
        });

    } catch (error) {
        console.error('Track download error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
