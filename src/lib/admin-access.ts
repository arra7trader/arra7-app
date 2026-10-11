const DEFAULT_ADMIN_EMAILS = ['apmexplore@gmail.com'];

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

export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAIL_SET.has(email.toLowerCase().trim());
}
