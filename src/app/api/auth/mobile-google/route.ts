import { NextResponse } from 'next/server';
import { upsertUser, getUserMembership } from '@/lib/turso';
import { createMobileAccessToken } from '@/lib/mobile-session';

export async function POST(req: Request) {
    try {
        const { idToken } = await req.json();

        if (!idToken) {
            return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
        }

        // Verify Google ID Token
        // Using Google's public token info endpoint to avoid adding heavy libraries
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);

        if (!verifyRes.ok) {
            console.error('Mobile Google Auth: Invalid token');
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const payload = await verifyRes.json();
        const { sub: id, email, name, picture: image, aud, email_verified: emailVerified } = payload;

        if (!email || !id) {
            return NextResponse.json({ error: 'Email not found in token' }, { status: 400 });
        }

        if (emailVerified !== true && emailVerified !== 'true') {
            return NextResponse.json({ error: 'Email is not verified' }, { status: 401 });
        }

        // Enforce audience when configured
        const allowedAudiences = [
            process.env.MOBILE_GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_ID,
        ].filter((value): value is string => Boolean(value));

        if (allowedAudiences.length > 0 && (!aud || !allowedAudiences.includes(aud))) {
            return NextResponse.json({ error: 'Invalid audience' }, { status: 401 });
        }

        // Upsert user to Turso
        const success = await upsertUser({
            id,
            email,
            name,
            image,
        });

        if (!success) {
            return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }

        // Get membership status
        const { membership } = await getUserMembership(id);
        const { token, expiresAt } = createMobileAccessToken({
            userId: id,
            email,
        });

        return NextResponse.json({
            success: true,
            accessToken: token,
            appAccessToken: token,
            token, // Backward-compatible key
            expiresAt,
            user: {
                id,
                email,
                name,
                image,
                tier: membership,
            },
        });

    } catch (error) {
        console.error('Mobile Google Auth Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
