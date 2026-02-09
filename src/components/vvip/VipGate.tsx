'use client';

import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function VipGate({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="animate-pulse w-8 h-8 rounded-full bg-[var(--accent-blue)]"></div>
            </div>
        );
    }

    // Check if user is VVIP
    const isVVIP = session?.user?.tier === 'VVIP';

    if (!isVVIP) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-black text-white relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-black to-black"></div>

                <div className="max-w-md w-full text-center space-y-8 relative z-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-yellow-600 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.3)]"
                    >
                        <svg className="w-10 h-10 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </motion.div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600">
                            VVIP Access Only
                        </h1>

                        <p className="text-gray-400 leading-relaxed">
                            This AI Companion is an exclusive private intelligence tool for our VVIP members. Upgrade your tier to unlock the ultimate trading assistant.
                        </p>
                    </div>

                    <div className="pt-4">
                        <Link
                            href="/pricing"
                            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:scale-105 transition-all duration-300"
                        >
                            <span>Upgrade ke VVIP</span>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
