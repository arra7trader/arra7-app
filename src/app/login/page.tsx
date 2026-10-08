'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    const callbackUrl = searchParams.get('callbackUrl') || '/admin';
    const authError = searchParams.get('error');

    // Admin secret portal state
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [adminPin, setAdminPin] = useState('');
    const [adminEmail, setAdminEmail] = useState('arlandpratama@gmail.com');
    const [adminLoading, setAdminLoading] = useState(false);
    const [adminErrorMsg, setAdminErrorMsg] = useState('');

    useEffect(() => {
        if (session) {
            router.push(callbackUrl);
        }
    }, [session, router, callbackUrl]);

    const handleGoogleLogin = () => {
        signIn('google', {
            callbackUrl,
            prompt: 'select_account',
        });
    };

    const handleAdminPasskeyLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminPin.trim()) return;

        setAdminLoading(true);
        setAdminErrorMsg('');

        try {
            const res = await signIn('admin-passkey', {
                passkey: adminPin.trim(),
                targetEmail: adminEmail,
                callbackUrl: '/admin',
                redirect: false,
            });

            if (res?.error) {
                setAdminErrorMsg('Passkey Admin salah. Akses ditolak.');
            } else if (res?.ok) {
                router.push('/admin');
            }
        } catch (err: any) {
            setAdminErrorMsg(err?.message || 'Gagal login admin.');
        } finally {
            setAdminLoading(false);
        }
    };

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
                <p className="text-slate-600 font-medium text-sm">{t('redirecting')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC] py-12 font-sans antialiased text-slate-900">
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                {/* Main Login Card */}
                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-200/80 text-center">
                    
                    {/* Brand Logo & Title */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="mb-4">
                            <PicaLogo size="lg" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
                            {t('loginTitle')}
                        </h1>
                        <p className="text-xs text-slate-500">
                            Masuk ke akun Anda atau kelola platform PICA
                        </p>
                    </div>

                    {/* Google OAuth Notice if error occurred */}
                    {authError && (
                        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left">
                            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
                                <span>⚠️</span>
                                <span>Pemberitahuan Login Google</span>
                            </div>
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Domain <b>pica.my.id</b> memerlukan verifikasi redirect URI di Google Cloud Console. Silakan gunakan <b>Portal Admin</b> di bawah jika Anda admin.
                            </p>
                        </div>
                    )}

                    {/* Google Sign In Button */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-98"
                    >
                        <GoogleIcon className="w-5 h-5" />
                        <span>{t('continueWithGoogle')}</span>
                    </button>

                    <div className="relative my-7">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-[11px] uppercase">
                            <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">
                                Keamanan &amp; Akses
                            </span>
                        </div>
                    </div>

                    {/* Discreet Admin Portal (Confidential Passkey) */}
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 text-left">
                        <button
                            type="button"
                            onClick={() => setIsAdminOpen(!isAdminOpen)}
                            className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-slate-500">🔒</span>
                                <span>Portal Khusus Administrator</span>
                            </span>
                            <span className="text-blue-600 text-[11px] font-bold">
                                {isAdminOpen ? 'Tutup ▲' : 'Buka ▼'}
                            </span>
                        </button>

                        <AnimatePresence>
                            {isAdminOpen && (
                                <motion.form
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    onSubmit={handleAdminPasskeyLogin}
                                    className="mt-3.5 space-y-3 pt-3 border-t border-slate-200/80"
                                >
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                                            Email Akun Admin
                                        </label>
                                        <select
                                            value={adminEmail}
                                            onChange={(e) => setAdminEmail(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="arlandpratama@gmail.com">arlandpratama@gmail.com</option>
                                            <option value="apmexplore@gmail.com">apmexplore@gmail.com</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                                            Passkey Rahasia Admin
                                        </label>
                                        <input
                                            type="password"
                                            value={adminPin}
                                            onChange={(e) => setAdminPin(e.target.value)}
                                            placeholder="••••••••••••"
                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            autoComplete="current-password"
                                        />
                                    </div>

                                    {adminErrorMsg && (
                                        <p className="text-xs text-rose-600 font-medium">
                                            ⚠️ {adminErrorMsg}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={adminLoading || !adminPin.trim()}
                                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        {adminLoading ? 'Memverifikasi...' : 'Masuk ke Dashboard Admin'}
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer text */}
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
