import { NextResponse } from 'next/server';
import { upsertUser, getUserMembership } from '@/lib/turso';

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

        // Verify audience (optional but recommended if you had the client ID here)
        // if (payload.aud !== process.env.GOOGLE_CLIENT_ID) ...

        const { sub: id, email, name, picture: image } = payload;

        if (!email) {
            return NextResponse.json({ error: 'Email not found in token' }, { status: 400 });
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

        // Return session data mimic standard NextAuth structure
        // In a real app we might issue a JWT here, for now we assume the app trusts the user 
        // after verification and uses the GOOGLE token or a simple session structure.
        // For simplicity, we return the user data and the same ID token (or a newly minted one if we had a signer).
        // The mobile app will interpret success = logged in.

        return NextResponse.json({
            success: true,
            user: {
                id,
                email,
                name,
                image,
                tier: membership,
            },
            token: idToken, // In future, replace with app-specific JWT
        });

    } catch (error) {
        console.error('Mobile Google Auth Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
