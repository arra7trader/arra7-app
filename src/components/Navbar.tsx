'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import * as Popover from '@radix-ui/react-popover';
import LanguageSwitcher from './LanguageSwitcher';
import Link from 'next/link';

export default function Navbar() {
    const { data: session, status } = useSession();
    const t = useTranslations('nav');
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { label: t('home'), href: '/' },
        { label: t('pricing'), href: '/pricing' },
    ];

    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass' : 'bg-transparent'
                }`}
        >
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 lg:h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="relative"
                        >
                            <span className="text-2xl font-bold tracking-tight">
                                <span className="gradient-text">ARRA</span>
                                <span className="text-white">7</span>
                            </span>
                            <motion.div
                                className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                layoutId="logo-glow"
                            />
                        </motion.div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="nav-link text-sm font-medium"
                            >
                                {item.label}
                            </Link>
                        ))}

                        {/* Products Dropdown */}
                        <Popover.Root>
                            <Popover.Trigger asChild>
                                <button className="nav-link text-sm font-medium flex items-center gap-1.5 outline-none">
                                    {t('products')}
                                    <svg
                                        className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </Popover.Trigger>
                            <AnimatePresence>
                                <Popover.Portal>
                                    <Popover.Content
                                        sideOffset={12}
                                        className="z-50"
                                        asChild
                                    >
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="glass rounded-xl p-2 min-w-[200px] border border-[#1F2937]"
                                        >
                                            <Link
                                                href="/products/indicators"
                                                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                                        {t('indicators')}
                                                    </div>
                                                    <div className="text-xs text-[#64748B]">Technical analysis tools</div>
                                                </div>
                                            </Link>
                                            <Link
                                                href="/products/expert-advisors"
                                                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">
                                                        {t('expertAdvisors')}
                                                    </div>
                                                    <div className="text-xs text-[#64748B]">Automated trading bots</div>
                                                </div>
                                            </Link>
                                            <div className="h-px bg-[#1F2937] my-1" />
                                            <Link
                                                href="/analisa-saham"
                                                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">
                                                        Analisa Saham
                                                    </div>
                                                    <div className="text-xs text-[#64748B]">AI stock analysis IDX</div>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    </Popover.Content>
                                </Popover.Portal>
                            </AnimatePresence>
                        </Popover.Root>
                    </div>

                    {/* Right Side Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <LanguageSwitcher />

                        {status === 'loading' ? (
                            <div className="w-8 h-8 rounded-full bg-[#1F2937] animate-pulse" />
                        ) : session ? (
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/analisa-market"
                                    className="text-sm font-medium text-[#94A3B8] hover:text-white transition-colors"
                                >
                                    {t('analisaMarket')}
                                </Link>
                                <Popover.Root>
                                    <Popover.Trigger asChild>
                                        <button className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-blue-500/50 transition-all">
                                            {session.user?.image ? (
                                                <img
                                                    src={session.user.image}
                                                    alt={session.user.name || 'User'}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
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
                                                className="glass rounded-xl p-2 min-w-[180px] border border-[#1F2937]"
                                            >
                                                <div className="px-3 py-2 border-b border-[#1F2937]">
                                                    <div className="text-sm font-medium text-white truncate">{session.user?.name}</div>
                                                    <div className="text-xs text-[#64748B] truncate">{session.user?.email}</div>
                                                </div>
                                                <button
                                                    onClick={() => signOut()}
                                                    className="w-full mt-1 px-3 py-2 text-sm text-left text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    {t('logout')}
                                                </button>
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
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-[#1F2937] hover:border-[#374151] hover:bg-white/10 transition-all text-sm font-medium"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                {t('login')}
                            </motion.button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden overflow-hidden"
                        >
                            <div className="py-4 space-y-3 border-t border-[#1F2937]">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="block px-4 py-2 text-[#94A3B8] hover:text-white transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                                <Link
                                    href="/products/indicators"
                                    className="block px-4 py-2 text-[#94A3B8] hover:text-white transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {t('indicators')}
                                </Link>
                                <Link
                                    href="/products/expert-advisors"
                                    className="block px-4 py-2 text-[#94A3B8] hover:text-white transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {t('expertAdvisors')}
                                </Link>
                                <div className="px-4 pt-3 flex items-center justify-between border-t border-[#1F2937]">
                                    <LanguageSwitcher />
                                    {session ? (
                                        <button
                                            onClick={() => signOut()}
                                            className="text-sm text-red-400"
                                        >
                                            {t('logout')}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => signIn('google')}
                                            className="text-sm text-blue-400"
                                        >
                                            {t('login')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </motion.header>
    );
}
