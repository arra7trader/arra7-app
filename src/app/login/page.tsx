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

    // Admin PIN mode state
    const [isAdminMode, setIsAdminMode] = useState(false);
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

    const handleAdminPinLogin = async (e: React.FormEvent) => {
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
                setAdminErrorMsg('Passkey Admin salah. Coba lagi.');
            } else if (res?.ok) {
                router.push('/admin');
            }
        } catch (err: any) {
            setAdminErrorMsg(err?.message || 'Gagal login admin');
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
                <p className="text-slate-600 font-medium">{t('redirecting')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC] py-12">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                {/* Card */}
                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/60 border border-slate-200/90 text-center">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-7">
                        <div className="mb-4">
                            <PicaLogo size="lg" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1.5">
                            {t('loginTitle')}
                        </h1>
                        <p className="text-xs text-slate-500 max-w-xs">
                            Akses ke Admin Dashboard &amp; Pengelolaan Platform PICA
                        </p>
                    </div>

                    {/* OAuth Error Alert if any */}
                    {authError && (
                        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left">
                            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider mb-1">
                                <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Google OAuth Terkendala ({authError})
                            </div>
                            <p className="text-xs text-rose-600 leading-relaxed mb-2">
                                Google memblokir karena domain <b>pica.my.id</b> belum ditambahkan di Authorized redirect URIs Google Cloud Console.
                            </p>
                            <p className="text-xs text-slate-700 font-semibold bg-white p-2 rounded-lg border border-rose-200">
                                💡 <b>Solusi Cepat Admin:</b> Gunakan form <b>Login Passkey Admin</b> di bawah untuk langsung masuk tanpa Google!
                            </p>
                        </div>
                    )}

                    {/* Google Sign In Button */}
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer mb-4"
                    >
                        <GoogleIcon className="w-5 h-5" />
                        <span>{t('continueWithGoogle')}</span>
                    </motion.button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-3 text-slate-400 font-semibold">ATAU</span>
                        </div>
                    </div>

                    {/* Admin PIN Passkey Login Form */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left">
                        <button
                            type="button"
                            onClick={() => setIsAdminMode(!isAdminMode)}
                            className="w-full flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
                        >
                            <span className="flex items-center gap-2">
                                <span>🔐</span>
                                <span>Login Langsung Admin (Bypass Google)</span>
                            </span>
                            <span className="text-blue-600 text-[11px]">
                                {isAdminMode ? '▲ Tutup' : '▼ Buka'}
                            </span>
                        </button>

                        <AnimatePresence>
                            {(isAdminMode || Boolean(authError)) && (
                                <motion.form
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    onSubmit={handleAdminPinLogin}
                                    className="mt-3.5 space-y-3 pt-3 border-t border-slate-200/80"
                                >
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Pilih Akun Email Admin
                                        </label>
                                        <select
                                            value={adminEmail}
                                            onChange={(e) => setAdminEmail(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="arlandpratama@gmail.com">arlandpratama@gmail.com (Admin Utama)</option>
                                            <option value="apmexplore@gmail.com">apmexplore@gmail.com (Admin)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Passkey / PIN Rahasia Admin
                                        </label>
                                        <input
                                            type="password"
                                            value={adminPin}
                                            onChange={(e) => setAdminPin(e.target.value)}
                                            placeholder="Masukkan Passkey Admin"
                                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Default PIN: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">pica-admin-7788</code>
                                        </p>
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
                                        {adminLoading ? 'Memverifikasi...' : 'Masuk ke Dashboard Admin →'}
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>

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
