'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import ComingSoonOverlay from './ComingSoonOverlay';

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

export default function CopyTradeGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();

    // Allow loading state to pass or show simple spinner if critical
    // But for "Coming Soon", we might want to show it immediately if not authenticated or not admin.

    // If loading, we can show a spinner or just nothing
    if (status === 'loading') {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
    }

    // Check if user is admin
    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);

    // If not admin, show Coming Soon
    if (!isAdmin) {
        return <ComingSoonOverlay />;
    }

    // If admin, show content
    return <>{children}</>;
}
