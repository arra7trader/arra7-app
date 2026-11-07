const DEFAULT_ADMIN_EMAILS = [
    'apmexplore@gmail.com',
    'arlandpratama@gmail.com',
    'arlandpratama1@gmail.com',
    'arra7trader@gmail.com',
    'arratujuhkreasi@gmail.com',
    'admin@pica.my.id',
    'admin@arra.com',
    'admin@arra7.com',
];

function parseCsvEmails(raw: string | undefined): string[] {
    if (!raw || !raw.trim()) return [];
    return raw
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
}

function parseAdminEmails(): string[] {
    const merged = new Set<string>(DEFAULT_ADMIN_EMAILS);

    // Server-side private env
    for (const email of parseCsvEmails(process.env.ADMIN_EMAILS)) {
        merged.add(email);
    }

    // Client-safe env (optional) for UI gate
    for (const email of parseCsvEmails(process.env.NEXT_PUBLIC_ADMIN_EMAILS)) {
        merged.add(email);
    }

    return Array.from(merged);
}

export const ADMIN_EMAIL_SET = new Set(parseAdminEmails());
export const ADMIN_EMAILS = Array.from(ADMIN_EMAIL_SET);

export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    if (ADMIN_EMAIL_SET.has(clean)) return true;
    if (clean.startsWith('admin@')) return true;
    if (clean.endsWith('@arra.com') || clean.endsWith('@arra7.com')) return true;
    if (clean.includes('arlandpratama') || clean.includes('apmexplore')) return true;
    return false;
}

export function isAdminUser(userOrSession: any): boolean {
    if (!userOrSession) return false;
    if (typeof userOrSession === 'string') {
        return isAdminEmail(userOrSession);
    }

    const u = userOrSession.user || userOrSession;
    if (u.isAdmin === true) return true;
    if (typeof u.role === 'string' && u.role.toUpperCase() === 'ADMIN') return true;
    if (typeof u.tier === 'string' && u.tier.toUpperCase() === 'ADMIN') return true;
    if (typeof u.membership === 'string' && u.membership.toUpperCase() === 'ADMIN') return true;
    if (typeof u.membershipTier === 'string' && u.membershipTier.toUpperCase() === 'ADMIN') return true;
    if (u.email && isAdminEmail(u.email)) return true;

    return false;
}
