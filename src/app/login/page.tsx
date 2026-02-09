'use client';

import { useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { signIn, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleIcon } from '@/components/PremiumIcons';

function LoginContent() {
    const { data: session, status } = useSession();
    const t = useTranslations('auth');
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';

    useEffect(() => {
        if (session) {
            router.push(callbackUrl);
        }
    }, [session, router, callbackUrl]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-8 h-8 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <p className="text-[var(--text-secondary)]">{t('redirecting')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-secondary)]">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Card */}
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-[var(--border-light)]">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.3 }}
                            className="inline-block mb-6"
                        >
                            <span className="text-3xl font-bold tracking-tight">
                                <span className="gradient-text">ARRA</span>
                                <span className="text-[var(--text-primary)]">7</span>
                            </span>
                        </motion.div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{t('loginTitle')}</h1>
                        <p className="text-[var(--text-secondary)]">{t('loginSubtitle')}</p>
                    </div>

                    {/* Google Sign In Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => signIn('google', { callbackUrl })}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[var(--text-primary)] hover:bg-gray-800 text-white font-medium transition-all"
                    >
                        <GoogleIcon className="w-5 h-5" />
                        {t('continueWithGoogle')}
                    </motion.button>

                    {/* Terms */}
                    <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-8 h-8 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
