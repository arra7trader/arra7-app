'use client';

import { useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { signIn, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleIcon } from '@/components/PremiumIcons';
import PicaLogo from '@/components/PicaLogo';

function LoginContent() {
    const { data: session, status } = useSession();
    const t = useTranslations('auth');
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const authError = searchParams.get('error');

    useEffect(() => {
        if (session) {
            router.push(callbackUrl);
        }
    }, [session, router, callbackUrl]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <p className="text-slate-600 font-medium">{t('redirecting')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC]">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                {/* Card */}
                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/60 border border-slate-200/90 text-center">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="mb-4">
                            <PicaLogo size="lg" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                            {t('loginTitle')}
                        </h1>
                        <p className="text-sm text-slate-500 max-w-xs">
                            {t('loginSubtitle')}
                        </p>
                    </div>

                    {/* OAuth Error Alert if any */}
                    {authError && (
                        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left">
                            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider mb-1">
                                <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Login Gagal ({authError})
                            </div>
                            <p className="text-xs text-rose-600 leading-relaxed">
                                {authError === 'OAuthCallback' || authError === 'OAuthSignin' || authError === 'redirect_uri_mismatch'
                                    ? 'Domain pica.my.id belum ditambahkan di Authorized redirect URIs Google Cloud Console.'
                                    : 'Terjadi kendala autentikasi. Pastikan domain dan koneksi sudah terverifikasi.'}
                            </p>
                        </div>
                    )}

                    {/* Google Sign In Button */}
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => signIn('google', { callbackUrl })}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                        <GoogleIcon className="w-5 h-5" />
                        {t('continueWithGoogle')}
                    </motion.button>

                    {/* Terms */}
                    <p className="mt-6 text-center text-xs text-slate-400">
                        Dengan melanjutkan, Anda menyetujui Ketentuan Layanan &amp; Kebijakan Privasi PICA.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
