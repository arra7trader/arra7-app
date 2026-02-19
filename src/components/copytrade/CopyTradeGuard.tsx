'use client';

// CopyTradeGuard: No longer blocks users.
// The marketplace is now public. Auth is enforced per-action in individual pages.
export default function CopyTradeGuard({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
