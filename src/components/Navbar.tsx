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
        { label: t('bookmap'), href: '/dom-arra' },
        { label: t('pricing'), href: '/pricing' },
        { label: 'FAQ', href: '/faq' },
        {
            label: (
                <div className="flex items-center gap-2">
                    <img src="/icons/a7-icon.jpg" alt="A7" className="w-5 h-5 object-contain rounded-md" />
                    <span>App</span>
                </div>
            ),
            href: '/download/android'
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
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                ? 'nav-apple shadow-sm'
                : 'bg-transparent'
                }`}
        >
            <nav className="container-wide">
                <div className="flex items-center justify-between h-12">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative"
                        >
                            <span className="text-xl font-semibold tracking-tight">
                                <span className="gradient-text">ARRA</span>
                                <span className="text-[var(--text-primary)]">7</span>
                            </span>
                        </motion.div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="nav-link-apple"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right Side Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <LanguageSwitcher />

                        {status === 'loading' ? (
                            <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] animate-pulse" />
                        ) : session ? (
                            <div className="flex items-center gap-3">
                                {/* Quick Links */}
                                <div className="flex items-center gap-1">
                                    <Link
                                        href="/journal"
                                        className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-secondary)] transition-all"
                                        title="Trade Journal"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                        </svg>
                                    </Link>
                                    <Link
                                        href="/portfolio"
                                        className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-secondary)] transition-all"
                                        title="Portfolio"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                        </svg>
                                    </Link>
                                </div>

                                <Popover.Root>
                                    <Popover.Trigger asChild>
                                        <button className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-[var(--accent-blue)]/30 transition-all">
                                            {session.user?.image ? (
                                                <img
                                                    src={session.user.image}
                                                    alt={session.user.name || 'User'}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium">
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
                                                className="bg-white rounded-xl p-2 min-w-[200px] shadow-lg border border-[var(--border-light)]"
                                            >
                                                <div className="px-3 py-2 border-b border-[var(--border-light)]">
                                                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">{session.user?.name}</div>
                                                    <div className="text-xs text-[var(--text-muted)] truncate">{session.user?.email}</div>
                                                </div>

                                                <div className="py-1">
                                                    <Link
                                                        href="/journal"
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                                        </svg>
                                                        {t('tradeJournal')}
                                                    </Link>
                                                    <Link
                                                        href="/portfolio"
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                                        </svg>
                                                        {t('portfolio')}
                                                    </Link>
                                                    <Link
                                                        href="/social"
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                                        </svg>
                                                        {t('socialFeed')}
                                                    </Link>
                                                </div>

                                                <div className="border-t border-[var(--border-light)] pt-1">
                                                    <button
                                                        onClick={() => signOut()}
                                                        className="w-full px-3 py-2 text-sm text-left text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
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
                                className="btn-primary py-2 px-4 text-sm"
                            >
                                {t('login')}
                            </motion.button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                        <svg className="w-6 h-6 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
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
                            className="md:hidden overflow-hidden bg-white border-t border-[var(--border-light)]"
                        >
                            <div className="py-4 space-y-1">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="block px-4 py-3 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}

                                {session && (
                                    <div className="px-4 pt-4 border-t border-[var(--border-light)] space-y-1">
                                        <Link
                                            href="/journal"
                                            className="block py-3 text-[var(--text-secondary)]"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            {t('tradeJournal')}
                                        </Link>
                                        <Link
                                            href="/portfolio"
                                            className="block py-3 text-[var(--text-secondary)]"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            {t('portfolio')}
                                        </Link>
                                        <Link
                                            href="/social"
                                            className="block py-3 text-[var(--text-secondary)]"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            {t('socialFeed')}
                                        </Link>
                                    </div>
                                )}

                                <div className="px-4 pt-4 flex items-center justify-between border-t border-[var(--border-light)]">
                                    <LanguageSwitcher />
                                    {session ? (
                                        <button
                                            onClick={() => signOut()}
                                            className="text-sm text-red-500"
                                        >
                                            {t('logout')}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => signIn('google')}
                                            className="btn-primary py-2 px-4 text-sm"
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
