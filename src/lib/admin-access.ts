const DEFAULT_ADMIN_EMAILS = ['apmexplore@gmail.com', 'admin@arra.com'];

function parseEnvAdminEmails(): string[] {
    const raw = process.env.ADMIN_EMAILS || '';
    if (!raw.trim()) return [];

    return raw
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
}

export const ADMIN_EMAIL_SET = new Set([
    ...DEFAULT_ADMIN_EMAILS.map((email) => email.toLowerCase()),
    ...parseEnvAdminEmails(),
]);

export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAIL_SET.has(email.toLowerCase());
}
