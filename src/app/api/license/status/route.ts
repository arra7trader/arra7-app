import { NextRequest, NextResponse } from 'next/server';
import { getDeviceStatus } from '@/lib/license';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminEmail, isAdminUser } from '@/lib/admin-access';
import getTursoClient from '@/lib/turso';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { status: 'error', message: 'Parameter deviceId diperlukan.' },
        { status: 400 }
      );
    }

    // Check if current user is logged in as Admin
    const session = await getServerSession(authOptions);
    const isAdmin = Boolean(isAdminUser(session?.user)) || Boolean(isAdminEmail(session?.user?.email));

    if (isAdmin) {
      // Auto-elevate this device to VVIP in the database
      const turso = getTursoClient();
      if (turso) {
        try {
          const expiresAtIso = '2099-12-31T23:59:59.000Z';
          await turso.execute({
            sql: `INSERT INTO device_users (
                    device_id, tier, tier_expires_at, active_license_code, 
                    last_active_at
                  )
                  VALUES (?, 'VVIP', ?, 'ADMIN-SESSION', CURRENT_TIMESTAMP)
                  ON CONFLICT(device_id) DO UPDATE SET
                    tier = 'VVIP',
                    tier_expires_at = excluded.tier_expires_at,
                    active_license_code = 'ADMIN-SESSION',
                    last_active_at = CURRENT_TIMESTAMP`,
            args: [deviceId, expiresAtIso],
          });
        } catch (e) {
          console.warn('[API_LICENSE_STATUS] Failed to auto-elevate admin device:', e);
        }
      }

      return NextResponse.json({
        status: 'success',
        data: {
          deviceId,
          tier: 'VVIP',
          tierExpiresAt: '2099-12-31T23:59:59.000Z',
          isExpired: false,
          daysLeft: 99999,
          activeLicenseCode: 'ADMIN-SESSION',
        },
      });
    }

    const status = await getDeviceStatus(deviceId);

    return NextResponse.json({
      status: 'success',
      data: status,
    });
  } catch (error: any) {
    console.error('[API_LICENSE_STATUS] Error:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Gagal memeriksa status lisensi.' },
      { status: 500 }
    );
  }
}
