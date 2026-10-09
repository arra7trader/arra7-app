'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import * as Popover from '@radix-ui/react-popover';
import LanguageSwitcher from './LanguageSwitcher';
import PicaLogo from './PicaLogo';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function Navbar() {
    const { data: session, status } = useSession();
    const t = useTranslations('nav');
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isVvip, isPro, daysLeft, openActivation } = usePicaDevice();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { label: t('home'), href: '/' },
        { 
            label: (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100/80 border border-blue-200/90 text-blue-700 transition-all shadow-xs group">
                    <span className="text-sm">🧠</span>
                    <span className="font-semibold text-[13px] text-blue-700">Neural Lab</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 border border-amber-500/30">VVIP</span>
                </div>
            ), 
            href: '/xauusd-neural-lab' 
        },
        { label: t('analisaMarket'), href: '/analisa-market' },
        {
            label: (
                <div className="flex items-center gap-1.5 px-2 py-0.5">
                    <span>📈</span>
                    <span>Kursus Fibo Kyoko</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-700 border border-blue-500/30">PRO</span>
                </div>
            ),
            href: '/kursus-fibo-kyoko'
        },
        { label: t('pricing'), href: '/pricing' },
    ];

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
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || isMobileMenuOpen
                ? 'bg-white/90 border-b border-slate-200/80 backdrop-blur-xl shadow-xs'
                : 'bg-white/60 border-b border-slate-200/40 backdrop-blur-md'
                }`}
        >
            <nav className="flex items-center justify-between h-16 w-full px-6 md:px-12 antialiased">
                {/* Logo */}
                <Link href="/" className="flex items-center group">
                    <motion.div
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <PicaLogo size="sm" />
                    </motion.div>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center justify-center gap-7 pl-8 flex-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`font-['Inter'] text-[14px] font-medium transition-colors ${item.href === '/' ? 'text-slate-900 font-semibold' : 'text-slate-600 hover:text-blue-600'}`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Right Side Actions */}
                <div className="hidden md:flex items-center gap-4 justify-end">
                    
                    {/* Language Switcher */}
                    <div className="flex items-center">
                        <LanguageSwitcher />
                    </div>

                    {status === 'loading' ? (
                        <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                    ) : session ? (
                        <div className="flex items-center gap-3">
                            {/* Quick Links */}
                            <div className="flex items-center gap-1.5">
                                <Link
                                    href="/journal"
                                    className="flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200/80 transition-colors shrink-0 size-9 border border-slate-200"
                                    title={t('tradeJournal')}
                                >
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                    </svg>
                                </Link>
                                <Link
                                    href="/portfolio"
                                    className="flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200/80 transition-colors shrink-0 size-9 border border-slate-200"
                                    title={t('portfolio')}
                                >
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                    </svg>
                                </Link>
                            </div>

                            <Popover.Root>
                                <Popover.Trigger asChild>
                                    <button className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-transparent ring-offset-2 ring-offset-white hover:ring-blue-500/50 transition-all border border-slate-200 cursor-pointer">
                                        {session.user?.image ? (
                                            <img
                                                src={session.user.image}
                                                alt={session.user.name || 'User'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold font-['Space_Grotesk']">
                                                {session.user?.name?.[0] || 'U'}
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
                                                <div className="text-sm font-bold text-slate-900 font-['Space_Grotesk'] truncate">{session.user?.name}</div>
                                                <div className="text-xs text-slate-500 font-['Inter'] truncate">{session.user?.email}</div>
                                            </div>

                                            <div className="py-2 space-y-1">
                                                <Link
                                                    href="/xauusd-neural-lab"
                                                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/70 rounded-xl transition-colors font-['Inter']"
                                                >
                                                    <span>🧠</span>
                                                    <span>PICA Neural Lab</span>
                                                    <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 border border-amber-500/30">VVIP</span>
                                                </Link>
                                                <Link
                                                    href="/journal"
                                                    className="flex items-center gap-3 px-3 py-2 text-[13px] font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors font-['Inter']"
                                                >
                                                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                                    </svg>
                                                    {t('tradeJournal')}
                                                </Link>
                                                <Link
                                                    href="/portfolio"
                                                    className="flex items-center gap-3 px-3 py-2 text-[13px] font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors font-['Inter']"
                                                >
                                                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                                    </svg>
                                                    {t('portfolio')}
                                                </Link>
                                            </div>

                                            <div className="border-t border-slate-100 pt-1">
                                                <button
                                                    onClick={() => signOut()}
                                                    className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium text-left text-red-600 hover:bg-red-50 rounded-xl transition-colors font-['Inter'] cursor-pointer"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                                    </svg>
                                                    {t('logout')}
                                                </button>
                                            </div>
                                        </motion.div>
                                    </Popover.Content>
                                </Popover.Portal>
                            </Popover.Root>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            {isVvip ? (
                                <button
                                    onClick={openActivation}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
                                    title="Klik untuk melihat masa aktif lisensi"
                                >
                                    <span>🌟</span>
                                    <span>VVIP MEMBER</span>
                                    <span className="text-[10px] text-amber-700 font-medium">({daysLeft}h)</span>
                                </button>
                            ) : isPro ? (
                                <button
                                    onClick={openActivation}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
                                >
                                    <span>⚡</span>
                                    <span>PRO MEMBER</span>
                                    <span className="text-[10px] text-blue-700 font-medium">({daysLeft}h)</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-semibold">
                                        BASIC
                                    </span>
                                    <button
                                        onClick={openActivation}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95"
                                    >
                                        <span>🔑</span>
                                        <span>Aktivasi Kode</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                        <svg className="w-5 h-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Dropdown */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden overflow-hidden bg-white border-t border-slate-200 shadow-xl"
                    >
                        <div className="py-2 space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="block px-6 py-3.5 text-slate-800 font-['Inter'] font-medium border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            ))}

                            {session && (
                                <div className="px-6 py-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
                                    <Link
                                        href="/journal"
                                        className="flex items-center gap-3 text-slate-700 font-['Inter'] font-medium"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                        </svg>
                                        {t('tradeJournal')}
                                    </Link>
                                    <Link
                                        href="/portfolio"
                                        className="flex items-center gap-3 text-slate-700 font-['Inter'] font-medium"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                        </svg>
                                        {t('portfolio')}
                                    </Link>
                                </div>
                            )}

                            <div className="px-6 py-5 flex items-center justify-between">
                                <LanguageSwitcher />
                                {session ? (
                                    <button
                                        onClick={() => signOut()}
                                        className="text-[14px] font-semibold text-red-600 font-['Inter'] cursor-pointer"
                                    >
                                        {t('logout')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            openActivation();
                                        }}
                                        className="rounded-full py-2 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-['Inter'] font-semibold text-[13px] shadow-sm cursor-pointer"
                                    >
                                        🔑 Aktivasi Kode
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
