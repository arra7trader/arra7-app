import { NextResponse } from 'next/server';

/**
 * Verifies a Google ID Token
 * @param token The ID token from the Authorization header
 * @returns The user's email if valid, null otherwise
 */
export async function verifyMobileToken(token: string): Promise<string | null> {
    try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);

        if (!response.ok) {
            console.error('Initial token verification failed, status:', response.status);
            return null;
        }

        const data = await response.json();

        // Verify audience if needed (optional safety)
        // if (data.aud !== process.env.GOOGLE_CLIENT_ID) return null;

        if (data.email_verified === 'true' || data.email_verified === true) {
            return data.email;
        }

        return null;
    } catch (error) {
        console.error('Mobile token verification error:', error);
        return null;
    }
}
