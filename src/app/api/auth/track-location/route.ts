'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateUserGeoLocation, initDatabase } from '@/lib/turso';

// Fetch geo-location from IP address using ip-api.com (free, no API key needed)
async function getGeoFromIP(ip: string): Promise<{ country?: string; city?: string }> {
    try {
        // Skip localhost/private IPs
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return { country: 'Local', city: 'Development' };
        }

        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, {
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!response.ok) {
            console.log('[GEO] ip-api.com response not ok:', response.status);
            return {};
        }

        const data = await response.json();

        if (data.status === 'success') {
            return {
                country: data.country || undefined,
                city: data.city || undefined,
            };
        }

        console.log('[GEO] ip-api.com returned fail status:', data);
        return {};
    } catch (error) {
        console.error('[GEO] Error fetching geo-location:', error);
        return {};
    }
}

// POST - Track user login location
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { status: 'error', message: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Get IP address from request headers
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIP = request.headers.get('x-real-ip');
        const ip = forwardedFor?.split(',')[0] || realIP || 'unknown';

        console.log('[GEO] Tracking login for:', session.user.email, 'IP:', ip);

        // Ensure database has geo-location columns
        await initDatabase();

        // Fetch geo-location from IP
        const geoData = await getGeoFromIP(ip);
        console.log('[GEO] Location data:', geoData);

        // Update user's geo-location in database
        // We need to get user ID from session or email
        const userId = (session.user as any).id;

        if (userId) {
            await updateUserGeoLocation(userId, {
                ip,
                country: geoData.country,
                city: geoData.city,
            });

            return NextResponse.json({
                status: 'success',
                message: 'Location tracked',
                location: geoData,
            });
        } else {
            console.log('[GEO] No user ID in session');
            return NextResponse.json({
                status: 'warning',
                message: 'No user ID available',
            });
        }

    } catch (error) {
        console.error('[GEO] Track location error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
