const DEFAULT_UNLIMITED_EMAILS = ['apmexplore@gmail.com'];

export const UNLIMITED_COPYTRADE_BALANCE = 999999999;

function parseUnlimitedEmails(rawValue: string | undefined): string[] {
    if (!rawValue) return [];
    return rawValue
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
}

export function getUnlimitedCopytradeEmails(): string[] {
    const fromEnv = parseUnlimitedEmails(process.env.CT_UNLIMITED_EMAILS);
    const merged = [...DEFAULT_UNLIMITED_EMAILS, ...fromEnv];
    return Array.from(new Set(merged));
}

export function isUnlimitedCopytradeEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return getUnlimitedCopytradeEmails().includes(email.trim().toLowerCase());
}

