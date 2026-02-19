import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getUserMembership } from '@/lib/turso';

export const dynamic = 'force-dynamic';

// GET /api/user/membership - Return current user's membership tier as simple object
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ membership: 'BASIC' }, { status: 401 });
        }

        if (!session.user.id) {
            return NextResponse.json({ membership: 'BASIC' });
        }

        const data = await getUserMembership(session.user.id);

        return NextResponse.json({ membership: data.membership });
    } catch (error) {
        console.error('[API] membership error:', error);
        return NextResponse.json({ membership: 'BASIC' });
    }
}
