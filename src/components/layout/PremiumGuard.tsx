'use client';

import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import { KeyIcon } from '@/components/PremiumIcons';

interface PremiumGuardProps {
    children: React.ReactNode;
    minTier?: 'PRO' | 'VVIP';
    title?: string;
    description?: string;
}

export default function PremiumGuard({
    children,
    minTier = 'PRO',
    title = 'Fitur Premium',
    description = 'Fitur ini khusus untuk member yang memiliki kode lisensi aktif.'
}: PremiumGuardProps) {
    const { isVvip, isPro, openActivation, isLoading } = usePicaDevice();
    const { data: session } = useSession();

    // Check access: device license (VVIP/PRO) or session tier
    const hasAccess = () => {
        if (isVvip) return true;
        if (minTier === 'PRO' && isPro) return true;
        const sessionTier = (session?.user as any)?.tier || (session?.user as any)?.membership;
        if (sessionTier === 'VVIP') return true;
        if (minTier === 'PRO' && sessionTier === 'PRO') return true;
        return false;
    };

    if (isLoading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (hasAccess()) {
        return <>{children}</>;
    }

    return (
        <div className="relative w-full min-h-[600px] rounded-3xl overflow-hidden border border-slate-200 bg-slate-50">
            {/* Blurred Background Content (Simulated) */}
            <div className="absolute inset-0 p-8 filter blur-lg opacity-40 pointer-events-none select-none overflow-hidden">
                {children}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-md bg-white p-8 rounded-3xl shadow-2xl border border-slate-200"
                >
                    <div className="w-16 h-16 mx-auto bg-amber-50 rounded-full flex items-center justify-center mb-5 border border-amber-200">
                        <span className="text-3xl">🔒</span>
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 mb-2">
                        {title} Terkunci
                    </h2>

                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        {description}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={openActivation}
                            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm shadow-lg shadow-amber-500/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <KeyIcon size="sm" className="text-white" />
                            <span>Masukkan Kode Lisensi Aktivasi</span>
                        </button>

                        <a
                            href="https://t.me/arra7trader"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors border border-slate-200 text-center"
                        >
                            Beli Lisensi via Telegram @arra7trader &rarr;
                        </a>

                        <Link href="/" className="block w-full pt-1">
                            <span className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                                Kembali ke Beranda
                            </span>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
