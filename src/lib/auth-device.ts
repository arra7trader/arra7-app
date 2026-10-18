import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveMobileUserFromRequest } from '@/lib/mobile-session';
import { getDeviceStatus } from '@/lib/license';
import getTursoClient, { getUserMembership } from '@/lib/turso';
import { isAdminEmail } from '@/lib/admin-access';
import { createHash } from 'crypto';

export interface ResolvedUser {
    userId: string;
    membership: 'BASIC' | 'PRO' | 'VVIP';
    isDevice: boolean;
    isFullAccess: boolean;
    email?: string;
}

const FULL_ACCESS_TIERS = ['VVIP', 'LIFETIME', 'ALL_ACCESS', 'FULL_ACCESS', 'PROMO_125K', 'ADMIN'];

/**
 * Resolves user identity without forcing login.
 * Prioritizes:
 * 1. NextAuth server session (elevated if browser device has active full access)
 * 2. Mobile Google/Bearer token
 * 3. Device ID (from body, x-device-id header, pica_device_id cookie, or query param)
 * 4. Persistent fallback guest device ID (derived from IP + User Agent)
 */
export async function resolveUserOrDevice(
    request: Request,
    bodyDeviceId?: string
): Promise<ResolvedUser> {
    // 0. Extract Device ID from request parameters, cookies, or headers
    let deviceId = bodyDeviceId?.trim();
    if (!deviceId) {
        deviceId = request.headers.get('x-device-id')?.trim();
    }
    if (!deviceId) {
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.match(/pica_device_id=([^;]+)/);
        if (match && match[1]) {
            deviceId = decodeURIComponent(match[1].trim());
        }
    }
    if (!deviceId) {
        try {
            const url = new URL(request.url);
            const paramId = url.searchParams.get('deviceId');
            if (paramId) deviceId = paramId.trim();
        } catch {}
    }

    // Check device tier from database if deviceId exists
    let deviceTier: 'BASIC' | 'PRO' | 'VVIP' = 'BASIC';
    let tierExpiresAt: string | null = null;
    if (deviceId) {
        try {
            const devStatus = await getDeviceStatus(deviceId);
            if (devStatus && devStatus.tier) {
                const upper = String(devStatus.tier).toUpperCase();
                if (FULL_ACCESS_TIERS.includes(upper)) {
                    deviceTier = 'VVIP';
                } else if (upper === 'PRO') {
                    deviceTier = 'PRO';
                }
                tierExpiresAt = devStatus.tierExpiresAt || null;
            }
        } catch (err) {
            console.warn('[resolveUserOrDevice] Device status check error:', err);
        }
    }

    // 1. NextAuth Session
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            const email = session.user.email || '';
            const isAdmin = isAdminEmail(email) || (session.user as any)?.role === 'ADMIN';
            const sessionTier = String((session.user as any)?.tier || '').toUpperCase();
            const { membership } = await getUserMembership(session.user.id);
            const userMemUpper = String(membership || '').toUpperCase();

            let finalMembership: 'BASIC' | 'PRO' | 'VVIP' = 'BASIC';
            if (
                isAdmin ||
                FULL_ACCESS_TIERS.includes(userMemUpper) ||
                FULL_ACCESS_TIERS.includes(sessionTier) ||
                deviceTier === 'VVIP'
            ) {
                finalMembership = 'VVIP';
            } else if (userMemUpper === 'PRO' || sessionTier === 'PRO' || deviceTier === 'PRO') {
                finalMembership = 'PRO';
            }

            // If user has full access on their device, sync to users table
            if (finalMembership === 'VVIP' && userMemUpper !== 'VVIP') {
                const turso = getTursoClient();
                if (turso) {
                    await turso.execute({
                        sql: "UPDATE users SET membership = 'VVIP' WHERE id = ?",
                        args: [session.user.id],
                    }).catch(() => {});
                }
            }

            return {
                userId: session.user.id,
                membership: finalMembership,
                isDevice: false,
                isFullAccess: finalMembership === 'VVIP',
                email,
            };
        }
    } catch (err) {
        console.warn('[resolveUserOrDevice] Session check warning:', err);
    }

    // 2. Mobile User
    try {
        const mobileUser = await resolveMobileUserFromRequest(request, {
            allowLegacyGoogleIdToken: true,
        });
        if (mobileUser?.userId) {
            const { membership } = await getUserMembership(mobileUser.userId);
            const userMemUpper = String(membership || '').toUpperCase();
            let finalMembership: 'BASIC' | 'PRO' | 'VVIP' = 'BASIC';
            if (FULL_ACCESS_TIERS.includes(userMemUpper) || deviceTier === 'VVIP') {
                finalMembership = 'VVIP';
            } else if (userMemUpper === 'PRO' || deviceTier === 'PRO') {
                finalMembership = 'PRO';
            }

            return {
                userId: mobileUser.userId,
                membership: finalMembership,
                isDevice: false,
                isFullAccess: finalMembership === 'VVIP',
                email: mobileUser.email,
            };
        }
    } catch (err) {
        console.warn('[resolveUserOrDevice] Mobile user check warning:', err);
    }

    // 3. Device Identification
    if (!deviceId) {
        // Fallback: Persistent Guest Device ID derived from IP + User Agent
        const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
        const ua = request.headers.get('user-agent') || 'unknown';
        const hash = createHash('sha256').update(`${ip}-${ua}`).digest('hex').substring(0, 16);
        deviceId = `pica_guest_${hash}`;
    }

    // Ensure device user exists in users table so foreign keys & quota queries run without error
    try {
        const turso = getTursoClient();
        if (turso) {
            await turso.execute({
                sql: `INSERT INTO users (id, email, name, membership, membership_expires)
                      VALUES (?, ?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET
                        membership = CASE 
                          WHEN excluded.membership = 'VVIP' THEN 'VVIP' 
                          WHEN excluded.membership = 'PRO' AND users.membership != 'VVIP' THEN 'PRO' 
                          ELSE users.membership 
                        END,
                        membership_expires = COALESCE(excluded.membership_expires, users.membership_expires)`,
                args: [
                    deviceId,
                    `${deviceId}@device.pica.internal`,
                    `Device ${deviceId.replace('pica_dev_', '').replace('pica_guest_', '').substring(0, 8)}`,
                    deviceTier,
                    tierExpiresAt,
                ],
            });
        }
    } catch (err) {
        // Table or constraint error ignored safely
    }

    return {
        userId: deviceId,
        membership: deviceTier,
        isDevice: true,
        isFullAccess: deviceTier === 'VVIP',
    };
}
