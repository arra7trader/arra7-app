'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import * as Popover from '@radix-ui/react-popover';
import LanguageSwitcher from './LanguageSwitcher';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function Navbar() {
    const { data: session, status } = useSession();
    const t = useTranslations('nav');
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { label: t('home'), href: '/' },
        { label: 'Copytrade', href: '/copytrade-arra77' },
        { label: t('pricing'), href: '/pricing' },
        { label: 'FAQ', href: '/faq' },
        {
            label: (
                <div className="flex items-center gap-2">
                    <img src="/icons/a7-icon.jpg" alt="A7" className="w-5 h-5 object-contain rounded-md" />
                    <span>App</span>
                </div>
            ),
            href: '/download-app'
        },
    ];

    const searchParams = useSearchParams();
    const isAppMode = searchParams?.get('mode') === 'app';

    // If in App Mode, hide Navbar and reset page padding
    if (isAppMode) {
        return (
            <style jsx global>{`
                header { display: none !important; }
                .pt-20 { padding-top: 0 !important; }
                /* Hide footer if needed too */
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
                ? 'bg-[#080A0FBF] border-b border-[#FFFFFF0D] backdrop-blur-[20px] backdrop-saturate-[180%]'
                : 'bg-transparent'
                }`}
        >
            <nav className="flex items-center justify-between h-16 w-full px-6 md:px-12 antialiased">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-1 group">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-block"
                    >
                        <span className="tracking-tighter bg-clip-text text-transparent font-['Space_Grotesk',system-ui,sans-serif] font-bold text-2xl" style={{ backgroundImage: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)' }}>
                            ARRA
                        </span>
                        <span className="tracking-tighter text-[#F8FAFC] font-['Space_Grotesk',system-ui,sans-serif] font-bold text-2xl">
                            7
                        </span>
                    </motion.div>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center justify-center gap-8 pl-12 flex-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`font-['Inter'] text-[14px] font-medium transition-colors ${item.href === '/' ? 'text-[#F8FAFC]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                        >
                            {typeof item.label === 'string' ? item.label : (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center rounded-[4px] w-5 h-5 shrink-0" style={{ backgroundImage: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)' }}>
                                        <span className="text-white font-['Space_Grotesk'] font-bold text-[9px]">A7</span>
                                    </div>
                                    <span>App</span>
                                </div>
                            )}
                        </Link>
                    ))}
                </div>

                {/* Right Side Actions */}
                <div className="hidden md:flex items-center gap-5 justify-end">
                    
                    {/* Language Switcher using our custom component wrapper but we can style its container if needed */}
                    <div className="flex items-center">
                        <LanguageSwitcher />
                    </div>

                    {status === 'loading' ? (
                        <div className="w-8 h-8 rounded-full bg-[#FFFFFF0A] animate-pulse" />
                    ) : session ? (
                        <div className="flex items-center gap-4">
                            {/* Quick Links */}
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/journal"
                                    className="flex items-center justify-center rounded-xl bg-[#FFFFFF0A] hover:bg-[#FFFFFF14] transition-colors shrink-0 size-9 border border-[#FFFFFF0D]"
                                    title={t('tradeJournal')}
                                >
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                    </svg>
                                </Link>
                                <Link
                                    href="/portfolio"
                                    className="flex items-center justify-center rounded-xl bg-[#FFFFFF0A] hover:bg-[#FFFFFF14] transition-colors shrink-0 size-9 border border-[#FFFFFF0D]"
                                    title={t('portfolio')}
                                >
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                    </svg>
                                </Link>
                            </div>

                            <Popover.Root>
                                <Popover.Trigger asChild>
                                    <button className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-transparent ring-offset-2 ring-offset-[#080A0F] hover:ring-[#3B82F6]/50 transition-all border border-[#FFFFFF1A]">
                                        {session.user?.image ? (
                                            <img
                                                src={session.user.image}
                                                alt={session.user.name || 'User'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center text-white text-sm font-bold font-['Space_Grotesk']">
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
                                            className="bg-[#0F172A] rounded-2xl p-2 min-w-[220px] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-[#FFFFFF1A] backdrop-blur-xl"
                                        >
                                            <div className="px-3 py-3 border-b border-[#FFFFFF1A]">
                                                <div className="text-sm font-bold text-[#F8FAFC] font-['Space_Grotesk'] truncate">{session.user?.name}</div>
                                                <div className="text-xs text-[#94A3B8] font-['Inter'] truncate">{session.user?.email}</div>
                                            </div>

                                            <div className="py-2 space-y-1">
                                                <Link
                                                    href="/journal"
                                                    className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#FFFFFF0A] rounded-xl transition-colors font-['Inter']"
                                                >
                                                    <svg className="w-4 h-4 text-[#60A5FA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                                    </svg>
                                                    {t('tradeJournal')}
                                                </Link>
                                                <Link
                                                    href="/portfolio"
                                                    className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#FFFFFF0A] rounded-xl transition-colors font-['Inter']"
                                                >
                                                    <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                                    </svg>
                                                    {t('portfolio')}
                                                </Link>
                                                <Link
                                                    href="/social"
                                                    className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#FFFFFF0A] rounded-xl transition-colors font-['Inter']"
                                                >
                                                    <svg className="w-4 h-4 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                                    </svg>
                                                    {t('socialFeed')}
                                                </Link>
                                                <Link
                                                    href="/xauusd-neural-lab"
                                                    className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#FFFFFF0A] rounded-xl transition-colors font-['Inter']"
                                                >
                                                    <svg className="w-4 h-4 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                                                    </svg>
                                                    Neural Lab
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">VVIP</span>
                                                </Link>
                                            </div>

                                            <div className="border-t border-[#FFFFFF1A] pt-1">
                                                <button
                                                    onClick={() => signOut()}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-left text-[#ef4444] hover:bg-[#ef44441a] rounded-xl transition-colors font-['Inter']"
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
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => signIn('google')}
                            className="rounded-full py-2 px-6 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all font-['Inter'] font-semibold text-[13px] text-white"
                            style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)' }}
                        >
                            {t('login')}
                        </motion.button>
                    )}
                </div>

                {/* Mobile Menu Button remains largely unchanged structurally but with new styling */}
                <div className="md:hidden flex items-center gap-4">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-xl bg-[#FFFFFF0A] border border-[#FFFFFF0D] hover:bg-[#FFFFFF1A] transition-colors"
                    >
                        <svg className="w-5 h-5 text-[#F8FAFC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        className="md:hidden overflow-hidden bg-[#080A0F] border-t border-[#FFFFFF1A]"
                    >
                        <div className="py-2 space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="block px-6 py-4 text-[#F8FAFC] font-['Inter'] font-medium border-b border-[#FFFFFF0A] hover:bg-[#FFFFFF05] transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {typeof item.label === 'string' ? item.label : 'App'}
                                </Link>
                            ))}

                            {session && (
                                <div className="px-6 py-4 border-b border-[#FFFFFF0A] space-y-4">
                                    <Link
                                        href="/journal"
                                        className="flex items-center gap-3 text-[#CBD5E1] font-['Inter'] font-medium"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <svg className="w-5 h-5 text-[#60A5FA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                        </svg>
                                        {t('tradeJournal')}
                                    </Link>
                                    <Link
                                        href="/portfolio"
                                        className="flex items-center gap-3 text-[#CBD5E1] font-['Inter'] font-medium"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <svg className="w-5 h-5 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                        </svg>
                                        {t('portfolio')}
                                    </Link>
                                </div>
                            )}

                            <div className="px-6 py-6 flex items-center justify-between">
                                <LanguageSwitcher />
                                {session ? (
                                    <button
                                        onClick={() => signOut()}
                                        className="text-[14px] font-medium text-[#ef4444] font-['Inter']"
                                    >
                                        {t('logout')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => signIn('google')}
                                        className="rounded-full py-2 px-6 shadow-[0_0_20px_rgba(59,130,246,0.2)] font-['Inter'] font-semibold text-[13px] text-white"
                                        style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)' }}
                                    >
                                        {t('login')}
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
