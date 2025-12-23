'use client';

import { useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { signIn, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

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
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (session) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-[#94A3B8]">{t('redirecting')}</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center px-4">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid opacity-30" />
            <div className="bg-orb bg-orb-blue w-[400px] h-[400px] top-20 -left-20" />
            <div className="bg-orb bg-orb-purple w-[300px] h-[300px] bottom-20 -right-20" />

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-md"
            >
                {/* Card */}
                <div className="glass rounded-2xl p-8 border border-[#1F2937]">
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
                                <span className="text-white">7</span>
                            </span>
                        </motion.div>
                        <h1 className="text-2xl font-bold mb-2">{t('loginTitle')}</h1>
                        <p className="text-[#64748B]">{t('loginSubtitle')}</p>
                    </div>

                    {/* Google Sign In Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => signIn('google', { callbackUrl })}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-medium transition-all"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        {t('continueWithGoogle')}
                    </motion.button>

                    {/* Terms */}
                    <p className="mt-6 text-center text-xs text-[#64748B]">
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -z-10 -inset-4">
                    <div
                        className="w-full h-full rounded-3xl opacity-20"
                        style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
                            filter: 'blur(40px)',
                        }}
                    />
                </div>
            </motion.div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
