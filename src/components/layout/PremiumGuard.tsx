'use client';

import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { LockIcon } from '@/components/PremiumIcons'; // Using existing icons if available, otherwise will need to create/import

// Fallback icon if not available
const LockIconFallback = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

interface PremiumGuardProps {
    children: React.ReactNode;
    minTier?: 'PRO' | 'VVIP';
    title?: string;
    description?: string;
}

export default function PremiumGuard({
    children,
    minTier = 'PRO',
    title = 'Premium Feature',
    description = 'This feature is available exclusively for PRO and VVIP members.'
}: PremiumGuardProps) {
    const { data: session, status } = useSession();
    const loading = status === 'loading';
    const userTier = session?.user?.tier || 'BASIC';

    // Check access
    const hasAccess = () => {
        if (userTier === 'VVIP') return true;
        if (minTier === 'PRO' && userTier === 'PRO') return true;
        return false;
    };

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (hasAccess()) {
        return <>{children}</>;
    }

    return (
        <div className="relative w-full min-h-[600px] rounded-3xl overflow-hidden border border-[var(--border-light)] bg-[var(--bg-primary)] dark:bg-gray-900">
            {/* Blurred Background Content (Simulated) */}
            <div className="absolute inset-0 p-8 filter blur-lg opacity-40 pointer-events-none select-none overflow-hidden">
                {children}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 bg-[var(--bg-primary)]/60 dark:bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-md bg-[var(--bg-primary)] dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-[var(--border-light)]"
                >
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mb-6">
                        <LockIconFallback className="w-8 h-8 text-amber-400" />
                    </div>

                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                        {title} Locked
                    </h2>

                    <p className="text-[var(--text-secondary)] mb-8">
                        {description}
                    </p>

                    <div className="space-y-3">
                        <Link href="/pricing" className="block w-full">
                            <button className="btn-primary w-full py-3 text-base shadow-lg shadow-blue-500/20">
                                Upgrade to Unlock
                            </button>
                        </Link>
                        <Link href="/" className="block w-full">
                            <button className="w-full py-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                                Go Back
                            </button>
                        </Link>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[var(--border-light)]">
                        <p className="text-xs text-[var(--text-muted)]">
                            Already upgraded? <button onClick={() => window.location.reload()} className="text-blue-500 hover:underline">Refresh Page</button>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
