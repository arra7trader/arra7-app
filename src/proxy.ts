import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdminEmail } from '@/lib/admin-access';

const protectedRoutes = ['/analisa-market'];
const maintenanceBypassPrefixes = [
    '/maintenance',
    '/download-app',
    '/download/android',
    '/downloads',
    '/login',
];
const maintenanceEnabled = (process.env.APP_MAINTENANCE_MODE ?? 'true') === 'true';

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.includes('.') ||
        pathname.startsWith('/public')
    ) {
        return NextResponse.next();
    }

    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    if (maintenanceEnabled) {
        const bypassMaintenance = maintenanceBypassPrefixes.some((route) => pathname.startsWith(route));
        const isAdmin = isAdminEmail((token?.email as string | undefined) ?? undefined);

        if (!bypassMaintenance && !isAdmin) {
            return NextResponse.redirect(new URL('/maintenance', request.url));
        }
    }

    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
    ],
};
