'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

type NavItem = {
    href: string;
    label: string;
    match: (pathname: string) => boolean;
    adminOnly?: boolean;
};

const ADMIN_EMAILS = new Set(['apmexplore@gmail.com', 'admin@arra.com']);

const navItems: NavItem[] = [
    {
        href: '/copytrade',
        label: 'Hub',
        match: (pathname) => pathname === '/copytrade',
    },
    {
        href: '/copytrade/dashboard',
        label: 'Follower Desk',
        match: (pathname) => pathname.startsWith('/copytrade/dashboard'),
    },
    {
        href: '/copytrade/provider',
        label: 'Provider Studio',
        match: (pathname) => pathname.startsWith('/copytrade/provider'),
    },
    {
        href: '/copytrade/become-provider',
        label: 'Join Provider',
        match: (pathname) => pathname.startsWith('/copytrade/become-provider'),
    },
    {
        href: '/copytrade-bridge',
        label: 'Bridge',
        match: (pathname) => pathname.startsWith('/copytrade-bridge'),
    },
    {
        href: '/copytrade/system',
        label: 'System Guide',
        match: (pathname) => pathname.startsWith('/copytrade/system'),
    },
    {
        href: '/admin/copytrade-bridge',
        label: 'Admin',
        match: (pathname) => pathname.startsWith('/admin/copytrade-bridge'),
        adminOnly: true,
    },
];

export default function CopytradeModuleNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const email = session?.user?.email?.toLowerCase() || '';
    const isAdmin = ADMIN_EMAILS.has(email);

    const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

    return (
        <div className="sticky top-[68px] z-30 border-y border-[var(--border-light)] bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3">
                {visibleItems.map((item) => {
                    const isActive = item.match(pathname);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                isActive
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
