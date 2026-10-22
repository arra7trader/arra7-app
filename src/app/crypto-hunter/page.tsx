'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import { isAdminEmail } from '@/lib/admin-access';
import CryptoHunterDashboard from '@/components/crypto-hunter/CryptoHunterDashboard';
import {
    ArrowLeftIcon,
    CryptoHunterIcon,
    LockIcon,
    KeyIcon,
    CrownIcon,
} from '@/components/PremiumIcons';

export default function CryptoHunterPage() {
    const { data: session, status } = useSession();
    const { isVvip: isDeviceVvip, openActivation, tier: deviceTier, isLoading: isDeviceLoading } = usePicaDevice();

    const [isCheckingMembership, setIsCheckingMembership] = useState(true);
    const [isDbFullAccess, setIsDbFullAccess] = useState(false);

    // Determine Admin status
    const isAdmin = Boolean(
        isAdminEmail(session?.user?.email) || 
        (session?.user as any)?.role === 'ADMIN'
    );

    // Full Access 125k tiers (Lifetime, All-Access, VVIP, Promo 125k, Admin)
    const FULL_ACCESS_TIERS = ['VVIP', 'LIFETIME', 'ALL_ACCESS', 'FULL_ACCESS', 'PROMO_125K', 'ADMIN'];
    const sessionTier = String((session?.user as any)?.tier || (session?.user as any)?.membership || '').toUpperCase();
    const cleanDeviceTier = String(deviceTier || '').toUpperCase();

    // Full access if user is Admin OR has verified device license (125k/VVIP) OR session tier OR DB quota
    const isFullAccess = Boolean(
        isAdmin ||
        isDeviceVvip ||
        FULL_ACCESS_TIERS.includes(cleanDeviceTier) ||
        isDbFullAccess ||
        FULL_ACCESS_TIERS.includes(sessionTier)
    );

    useEffect(() => {
        if (isAdmin || isDeviceVvip || FULL_ACCESS_TIERS.includes(cleanDeviceTier)) {
            setIsDbFullAccess(true);
            setIsCheckingMembership(false);
            return;
        }

        if (status === 'authenticated') {
            const checkMembership = async () => {
                try {
                    const res = await fetch('/api/user/quota');
                    const qData = await res.json();
                    if (qData.status === 'success') {
                        const membership = String(qData.quota?.membership || 'BASIC').toUpperCase();
                        const allowed = FULL_ACCESS_TIERS.includes(membership) || membership === 'VVIP' || membership === 'ADMIN';
                        setIsDbFullAccess(allowed);
                    }
                } catch {
                    setIsDbFullAccess(false);
                } finally {
                    setIsCheckingMembership(false);
                }
            };
            checkMembership();
        } else if (status === 'unauthenticated') {
            setIsCheckingMembership(false);
        }
    }, [status, isAdmin, isDeviceVvip, cleanDeviceTier]);

    // Loading State
    if (isCheckingMembership || isDeviceLoading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold text-slate-600 font-mono tracking-wider uppercase">
                    Memverifikasi Lisensi Full Access 125K...
                </p>
            </div>
        );
    }

    // RESTRICTED ACCESS SCREEN (MUST HAVE 125K FULL ACCESS / VVIP LICENSE)
    if (!isFullAccess) {
        return (
            <div className="min-h-screen bg-slate-950 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center relative overflow-hidden selection:bg-emerald-600 selection:text-white">
                {/* Background ambient glow */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-emerald-600/20 via-teal-600/15 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="max-w-xl w-full mx-auto relative z-10"
                >
                    <div className="rounded-3xl p-6 sm:p-9 bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl space-y-6 text-center">
                        
                        {/* Lock Emblem with Institutional Crypto Hunter SVG */}
                        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-amber-500/20 border-2 border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <CryptoHunterIcon size="lg" className="text-emerald-400" />
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-xs">
                                <LockIcon size="xs" />
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold font-mono">
                                <CrownIcon size="xs" className="text-amber-400" />
                                <span>PORTAL EKSKLUSIF FULL ACCESS 125K</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
                                Crypto Hunter Terkunci
                            </h1>
                            <p className="text-sm text-slate-300 leading-relaxed font-sans max-w-md mx-auto">
                                Radar pencari crypto potensial ini eksklusif untuk pemilik <strong className="text-amber-400">Paket Full Access Rp 125.000</strong> (Promo Lifetime) atau member <strong className="text-emerald-400">VVIP</strong> resmi.
                            </p>
                        </div>

                        {/* 5 OG Features Preview in Locked Portal */}
                        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-left space-y-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                5 Senjata Rahasia OG Crypto Hunter di Dalam:
                            </span>
                            <div className="space-y-2 text-xs text-slate-200 font-sans">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-emerald-400 text-sm">🐋</span>
                                    <span><strong>Smart Money Shadow:</strong> Lacak dompet whale anonim win-rate 60%+</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-cyan-400 text-sm">🏴‍☠️</span>
                                    <span><strong>4-Tier Entry Scanner:</strong> Deteksi ultra-early MC $5K hingga $20M</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-rose-400 text-sm">🛡️</span>
                                    <span><strong>GoPlus Auto-Audit:</strong> Filter honeypot, mint/freeze authority &amp; rug</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-amber-400 text-sm">📈</span>
                                    <span><strong>Before/After Tracker:</strong> Bukti live kenaikan harga &amp; MC sejak deteksi</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-purple-400 text-sm">⚡</span>
                                    <span><strong>Volume/MC Divergence:</strong> Deteksi spike volume abnormal sebelum breakout</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3 pt-2">
                            {/* Activate License Button */}
                            <button
                                type="button"
                                onClick={openActivation}
                                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
                            >
                                <KeyIcon size="sm" />
                                <span>Masukkan Kunci Lisensi Saya</span>
                            </button>

                            {/* Buy 125k Promo Lifetime Link */}
                            <Link
                                href="/payment/transfer?plan=ALL_ACCESS&duration=lifetime"
                                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:opacity-95 text-white font-extrabold text-sm shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2 font-sans"
                            >
                                <span>🔥</span>
                                <span>Klaim Promo Full Access (Rp 125.000 Sekali Bayar) &rarr;</span>
                            </Link>

                            {/* Secondary Navigation */}
                            <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2 font-sans">
                                <Link href="/login" className="hover:text-white transition-colors underline underline-offset-4">
                                    Sudah beli tapi belum login? Masuk
                                </Link>
                                <span>•</span>
                                <Link href="/" className="hover:text-white transition-colors">
                                    Kembali ke Beranda
                                </Link>
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        );
    }

    // FULL ACCESS GRANTED - RENDER DASHBOARD
    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
            {/* Navigation Bar */}
            <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeftIcon size="sm" className="text-slate-600" />
                        </Link>
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xs">
                                <CryptoHunterIcon size="sm" className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold text-slate-900">Crypto Hunter</h1>
                                <p className="text-[10px] text-slate-400 font-medium">OG Smart Money Scanner</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full bg-emerald-600 h-1.5 w-1.5"></span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                {isAdmin ? 'ADMIN ACCESS' : 'FULL ACCESS 125K'}
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="px-4 sm:px-6 py-6">
                <CryptoHunterDashboard />
            </main>
        </div>
    );
}
