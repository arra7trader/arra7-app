import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient, { updateUserGeoLocation } from '@/lib/turso';

// Get user IP and geo-location from ip-api.com (free, no API key needed)
async function getGeoLocation(ip: string) {
    try {
        // Skip for localhost
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return { country: 'Local', city: 'Development', lat: 0, lon: 0 };
        }

        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.status === 'success') {
            return {
                country: data.country,
                city: data.city,
                lat: data.lat,
                lon: data.lon
            };
        }
        return null;
    } catch (error) {
        console.error('Geo-location API error:', error);
        return null;
    }
}

// POST: Track user location
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        // Get IP from request headers
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

        // Get geo-location
        const geoData = await getGeoLocation(ip);

        if (geoData) {
            await updateUserGeoLocation(session.user.id, {
                ip,
                country: geoData.country,
                city: geoData.city
            });
        }

        return NextResponse.json({
            status: 'success',
            location: geoData
        });

    } catch (error) {
        console.error('Location tracking error:', error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}

// GET: Admin only - get all user locations
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Check if admin (you can customize this check)
        const adminEmails = ['apmexplore@gmail.com'];
        if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
            return NextResponse.json({ status: 'error', message: 'Admin only' }, { status: 403 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'all'; // all, 24h, 7d

        let dateFilter = '';
        if (period === '24h') {
            dateFilter = "AND last_login_at >= datetime('now', '-1 day')";
        } else if (period === '7d') {
            dateFilter = "AND last_login_at >= datetime('now', '-7 days')";
        }

        const result = await turso.execute({
            sql: `SELECT 
                id, name, email, image, membership,
                last_login_ip, last_login_country, last_login_city, last_login_at,
                created_at
            FROM users 
            WHERE last_login_country IS NOT NULL ${dateFilter}
            ORDER BY last_login_at DESC`,
            args: []
        });

        // Get coordinates for each city (we'll cache this server-side)
        const usersWithCoords = await Promise.all(
            result.rows.map(async (row) => {
                // For demo, use approximate coordinates based on city
                // In production, you'd store lat/lon in database
                let lat = -6.2088; // Default Jakarta
                let lon = 106.8456;

                // Get actual coordinates if city exists
                if (row.last_login_city && row.last_login_country) {
                    const cityCoords = getCityCoordinates(
                        row.last_login_city as string,
                        row.last_login_country as string
                    );
                    if (cityCoords) {
                        lat = cityCoords.lat;
                        lon = cityCoords.lon;
                    }
                }

                return {
                    id: row.id,
                    name: row.name || 'Anonymous',
                    email: row.email,
                    image: row.image,
                    membership: row.membership || 'BASIC',
                    country: row.last_login_country,
                    city: row.last_login_city,
                    lastSeen: row.last_login_at,
                    lat,
                    lon
                };
            })
        );

        return NextResponse.json({
            status: 'success',
            users: usersWithCoords,
            total: usersWithCoords.length
        });

    } catch (error) {
        console.error('Get locations error:', error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}

// Helper: Get approximate coordinates for Indonesian cities
function getCityCoordinates(city: string, country: string): { lat: number; lon: number } | null {
    const cityCoords: Record<string, { lat: number; lon: number }> = {
        // Indonesia
        'Jakarta': { lat: -6.2088, lon: 106.8456 },
        'Surabaya': { lat: -7.2575, lon: 112.7521 },
        'Bandung': { lat: -6.9175, lon: 107.6191 },
        'Medan': { lat: 3.5952, lon: 98.6722 },
        'Semarang': { lat: -6.9666, lon: 110.4196 },
        'Makassar': { lat: -5.1477, lon: 119.4327 },
        'Palembang': { lat: -2.9761, lon: 104.7754 },
        'Tangerang': { lat: -6.1783, lon: 106.6319 },
        'Depok': { lat: -6.4025, lon: 106.7942 },
        'Bekasi': { lat: -6.2383, lon: 106.9756 },
        'Yogyakarta': { lat: -7.7956, lon: 110.3695 },
        'Malang': { lat: -7.9666, lon: 112.6326 },
        'Denpasar': { lat: -8.6500, lon: 115.2167 },
        'Balikpapan': { lat: -1.2379, lon: 116.8529 },
        'Pontianak': { lat: -0.0263, lon: 109.3425 },
        'Manado': { lat: 1.4748, lon: 124.8421 },
        'Batam': { lat: 1.0456, lon: 104.0305 },
        'Pekanbaru': { lat: 0.5071, lon: 101.4478 },
        // International
        'Singapore': { lat: 1.3521, lon: 103.8198 },
        'Kuala Lumpur': { lat: 3.1390, lon: 101.6869 },
        'Bangkok': { lat: 13.7563, lon: 100.5018 },
        'Hong Kong': { lat: 22.3193, lon: 114.1694 },
        'Tokyo': { lat: 35.6762, lon: 139.6503 },
        'Seoul': { lat: 37.5665, lon: 126.9780 },
        'Sydney': { lat: -33.8688, lon: 151.2093 },
        'London': { lat: 51.5074, lon: -0.1278 },
        'New York': { lat: 40.7128, lon: -74.0060 },
        'Dubai': { lat: 25.2048, lon: 55.2708 },
    };

    // Try exact match
    if (cityCoords[city]) {
        return cityCoords[city];
    }

    // Try partial match
    for (const [name, coords] of Object.entries(cityCoords)) {
        if (city.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(city.toLowerCase())) {
            return coords;
        }
    }

    // Default by country
    const countryDefaults: Record<string, { lat: number; lon: number }> = {
        'Indonesia': { lat: -6.2088, lon: 106.8456 },
        'Malaysia': { lat: 3.1390, lon: 101.6869 },
        'Singapore': { lat: 1.3521, lon: 103.8198 },
        'Thailand': { lat: 13.7563, lon: 100.5018 },
        'Vietnam': { lat: 21.0285, lon: 105.8542 },
        'Philippines': { lat: 14.5995, lon: 120.9842 },
    };

    return countryDefaults[country] || null;
}
