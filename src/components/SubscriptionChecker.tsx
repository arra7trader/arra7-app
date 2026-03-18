'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function SubscriptionChecker() {
    const { data: session } = useSession();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationType, setNotificationType] = useState<'expired' | 'warning' | null>(null);
    const [daysLeft, setDaysLeft] = useState(0);
    const router = useRouter();

    useEffect(() => {
        if (session?.user) {
            // Check for expiration
            if (session.user.isExpired) {
                setNotificationType('expired');
                setShowNotification(true);
            }
            // Check for warning (expiring in 3 days or less)
            else if (session.user.daysUntilExpiry !== undefined &&
                session.user.daysUntilExpiry > 0 &&
                session.user.daysUntilExpiry <= 3) {
                setDaysLeft(session.user.daysUntilExpiry);
                setNotificationType('warning');
                setShowNotification(true);
            }
        }
    }, [session]);

    if (!showNotification) return null;

    return (
        <AnimatePresence>
            {showNotification && (
                <motion.div
                    initial={{ opacity: 0, y: 50, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 50, x: '-50%' }}
                    className="fixed bottom-6 left-1/2 z-[100] w-full max-w-md px-4"
                >
                    <div className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md ${notificationType === 'expired'
                            ? 'bg-red-500/10 border-red-500/30 text-red-200'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        }`}>
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full shrink-0 ${notificationType === 'expired' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                                }`}>
                                {notificationType === 'expired' ? (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>

                            <div className="flex-1">
                                <h3 className={`font-bold text-lg mb-1 ${notificationType === 'expired' ? 'text-red-100' : 'text-amber-100'
                                    }`}>
                                    {notificationType === 'expired' ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                                </h3>
                                <p className="text-sm opacity-90 mb-3">
                                    {notificationType === 'expired'
                                        ? 'Masa berlangganan Anda telah habis. Paket Anda telah kembali ke BASIC.'
                                        : `Masa berlangganan Anda tersisa ${daysLeft} hari lagi. Perbarui sekarang untuk mempertahankan akses premium.`}
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => router.push('/pricing')}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${notificationType === 'expired'
                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                : 'bg-amber-500 hover:bg-amber-600 text-[var(--text-primary)]'
                                            }`}
                                    >
                                        Upgrade Plan
                                    </button>
                                    <button
                                        onClick={() => setShowNotification(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--bg-primary)]/10 transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
