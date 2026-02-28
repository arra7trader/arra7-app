import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getUserMembership } from '@/lib/turso';
import { getMobileUserRecord, resolveMobileUserFromRequest } from '@/lib/mobile-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        let userId = session?.user?.id || null;
        let userFromSession = session?.user || null;

        if (userFromSession && !userId) {
            return NextResponse.json({
                membership: 'BASIC',
                user: userFromSession
            });
        }

        if (!userId) {
            const mobileUser = await resolveMobileUserFromRequest(request, {
                allowLegacyGoogleIdToken: true,
            });
            userId = mobileUser?.userId || null;
            userFromSession = null;
        }

        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const membership = await getUserMembership(userId);

        if (userFromSession) {
            return NextResponse.json({
                membership,
                user: {
                    id: userId,
                    name: userFromSession.name,
                    email: userFromSession.email,
                    image: userFromSession.image,
                    tier: membership.membership,
                }
            });
        }

        const mobileRecord = await getMobileUserRecord(userId);
        if (!mobileRecord) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json({
            membership,
            user: {
                id: mobileRecord.id,
                name: mobileRecord.name,
                email: mobileRecord.email,
                image: mobileRecord.image,
                tier: membership.membership,
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
