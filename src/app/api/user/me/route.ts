import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getUserMembership } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Default to BASIC if no ID (shouldn't happen for logged in users)
        if (!session.user.id) {
            return NextResponse.json({
                membership: 'BASIC',
                user: session.user
            });
        }

        const membership = await getUserMembership(session.user.id);

        return NextResponse.json({
            membership,
            user: {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                image: session.user.image
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
