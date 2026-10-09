'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import * as Popover from '@radix-ui/react-popover';
import LanguageSwitcher from './LanguageSwitcher';
import PicaLogo from './PicaLogo';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { isAdminEmail } from '@/lib/admin-access';
import {
    KeyIcon,
    CrownIcon,
    BoltIcon,
    ShieldCheckIcon,
    BookOpenIcon,
    ChartIcon
} from './PremiumIcons';

export default function Navbar() {
    const { data: session, status } = useSession();
    const t = useTranslations('nav');
    const [isScrolled, setIsScrolled] = useState(false);
    const { isVvip, isPro, daysLeft, openActivation } = usePicaDevice();

    const isAdmin = isAdminEmail(session?.user?.email);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const searchParams = useSearchParams();
    const isAppMode = searchParams?.get('mode') === 'app';

    // If in App Mode, hide Navbar and reset page padding
    if (isAppMode) {
        return (
            <style jsx global>{`
                header { display: none !important; }
                .pt-20 { padding-top: 0 !important; }
                footer { display: none !important; }
            `}</style>
        );
    }

    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                ? 'bg-white/90 border-b border-slate-200/80 backdrop-blur-xl shadow-xs'
                : 'bg-white/60 border-b border-slate-200/40 backdrop-blur-md'
                }`}
        >
            <nav className="relative flex items-center justify-between h-16 w-full px-4 sm:px-6 md:px-12 antialiased">
                {/* Left Side: Empty spacer to balance header */}
                <div className="flex-1 flex items-center gap-3">
                    {/* Header menu is completely removed as requested */}
                </div>

                {/* Center: Logo PICA positioned dead center */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
                    <Link href="/" className="flex items-center group">
                        <motion.div
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <PicaLogo size="sm" />
                        </motion.div>
                    </Link>
                </div>

                {/* Right Side Actions */}
                <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
                    {/* Language Switcher */}
                    <div className="flex items-center">
                        <LanguageSwitcher />
                    </div>

                    {status === 'loading' ? (
                        <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                    ) : isAdmin ? (
                        /* Admin Only: Access to Trade Journal, Portfolio, Admin Panel, and Profile */
                        <div className="flex items-center gap-2">
                            {/* Quick Link: Trade Journal */}
                            <Link
                                href="/journal"
                                className="hidden sm:flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200/80 transition-colors shrink-0 size-9 border border-slate-200"
                                title={t('tradeJournal')}
                            >
                                <BookOpenIcon size="sm" className="text-slate-700" />
                            </Link>

                            {/* Quick Link: Portfolio */}
                            <Link
                                href="/portfolio"
                                className="hidden sm:flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200/80 transition-colors shrink-0 size-9 border border-slate-200"
                                title={t('portfolio')}
                            >
                                <ChartIcon size="sm" className="text-slate-700" />
                            </Link>

                            {/* Quick Link: Admin Panel */}
                            <Link
                                href="/admin"
                                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all"
                            >
                                <ShieldCheckIcon size="xs" className="text-amber-400" />
                                <span>Admin</span>
                            </Link>

                            {/* Admin Profile Popover */}
                            <Popover.Root>
                                <Popover.Trigger asChild>
                                    <button
                                        aria-label="Admin Profile"
                                        className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-transparent ring-offset-2 ring-offset-white hover:ring-blue-500/50 transition-all border border-slate-200 cursor-pointer"
                                    >
                                        {session?.user?.image ? (
                                            <img
                                                src={session.user.image}
                                                alt={session.user.name || 'Admin'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 flex items-center justify-center text-white text-xs font-bold font-['Space_Grotesk']">
                                                ADM
                                            </div>
                                        )}
                                    </button>
                                </Popover.Trigger>
                                <Popover.Portal>
                                    <Popover.Content sideOffset={8} align="end" className="z-50">
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className="bg-white rounded-2xl p-2 min-w-[220px] shadow-xl border border-slate-200"
                                        >
                                            <div className="px-3 py-3 border-b border-slate-100">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 border border-amber-500/30">
                                                        Super Admin
                                                    </span>
                                                </div>
                                                <div className="text-sm font-bold text-slate-900 font-['Space_Grotesk'] truncate">
                                                    {session?.user?.name || 'Administrator'}
                                                </div>
                                                <div className="text-xs text-slate-500 font-['Inter'] truncate">
                                                    {session?.user?.email}
                                                </div>
                                            </div>

                                            <div className="py-2 space-y-1">
                                                <Link
                                                    href="/admin"
                                                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-slate-800 hover:bg-slate-100 rounded-xl transition-colors font-['Inter']"
                                                >
                                                    <ShieldCheckIcon size="sm" className="text-amber-600" />
                                                    <span>Admin Panel</span>
                                                </Link>
                                                <Link
                                                    href="/journal"
                                                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors font-['Inter']"
                                                >
                                                    <BookOpenIcon size="sm" className="text-blue-600" />
                                                    <span>{t('tradeJournal')}</span>
                                                </Link>
                                                <Link
                                                    href="/portfolio"
                                                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors font-['Inter']"
                                                >
                                                    <ChartIcon size="sm" className="text-indigo-600" />
                                                    <span>{t('portfolio')}</span>
                                                </Link>
                                            </div>

                                            <div className="border-t border-slate-100 pt-1">
                                                <button
                                                    onClick={() => signOut()}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-left text-red-600 hover:bg-red-50 rounded-xl transition-colors font-['Inter'] cursor-pointer"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                                    </svg>
                                                    <span>{t('logout')}</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    </Popover.Content>
                                </Popover.Portal>
                            </Popover.Root>
                        </div>
                    ) : (
                        /* Regular User: NO trade journal, NO portfolio, NO profile dropdown */
                        <div className="flex items-center gap-2">
                            {isVvip ? (
                                <button
                                    onClick={openActivation}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
                                    title="Status: VVIP Member"
                                >
                                    <CrownIcon size="xs" className="text-amber-600" />
                                    <span className="hidden xs:inline">VVIP MEMBER</span>
                                    <span className="xs:hidden">VVIP</span>
                                    <span className="text-[10px] text-amber-700 font-medium">({daysLeft}h)</span>
                                </button>
                            ) : isPro ? (
                                <button
                                    onClick={openActivation}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
                                    title="Status: PRO Member"
                                >
                                    <BoltIcon size="xs" className="text-blue-600" />
                                    <span className="hidden xs:inline">PRO MEMBER</span>
                                    <span className="xs:hidden">PRO</span>
                                    <span className="text-[10px] text-blue-700 font-medium">({daysLeft}h)</span>
                                </button>
                            ) : (
                                <button
                                    onClick={openActivation}
                                    className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95"
                                >
                                    <KeyIcon size="xs" className="text-white" />
                                    <span>Aktivasi Kode</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </nav>
        </motion.header>
    );
}
