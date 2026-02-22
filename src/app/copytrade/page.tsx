'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { signIn, useSession } from 'next-auth/react';
import ProviderCard from '@/components/copytrade/ProviderCard';

interface ProviderRow {
    id: string;
    display_name: string;
    bio?: string | null;
    broker_name?: string | null;
    win_rate?: number | null;
    total_profit_usd?: number | null;
    max_drawdown?: number | null;
    total_followers?: number | null;
    total_trades?: number | null;
}

interface HubStats {
    totalProviders: number;
    totalFollowers: number;
    totalTrades: number;
}

const defaultStats: HubStats = {
    totalProviders: 0,
    totalFollowers: 0,
    totalTrades: 0,
};

export default function CopytradeHubPage() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<HubStats>(defaultStats);
    const [providers, setProviders] = useState<ProviderRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let active = true;

        const run = async () => {
            try {
                const [providersRes, statsRes] = await Promise.all([
                    fetch('/api/copytrade/providers'),
                    fetch('/api/copytrade/stats'),
                ]);

                const providersData = await providersRes.json();
                const statsData = await statsRes.json();

                if (!active) return;
                setProviders((providersData.providers || []) as ProviderRow[]);
                setStats({
                    totalProviders: Number(statsData.totalProviders || 0),
                    totalFollowers: Number(statsData.totalFollowers || 0),
                    totalTrades: Number(statsData.totalTrades || 0),
                });
            } catch (error) {
                console.error('[CopytradeHub] fetch failed', error);
            } finally {
                if (active) setLoading(false);
            }
        };

        run();
        return () => {
            active = false;
        };
    }, []);

    const filteredProviders = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return providers;
        return providers.filter((provider) => {
            const name = provider.display_name?.toLowerCase() || '';
            const broker = provider.broker_name?.toLowerCase() || '';
            const bio = provider.bio?.toLowerCase() || '';
            return name.includes(query) || broker.includes(query) || bio.includes(query);
        });
    }, [providers, search]);

    return (
        <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-16 pt-8 text-[var(--text-primary)]">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-6 rounded-3xl border border-[var(--border-light)] bg-white p-6 shadow-sm md:grid-cols-3">
                    <div className="md:col-span-2">
                        <p className="mb-2 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                            Copytrade Marketplace
                        </p>
                        <h1 className="text-3xl font-black text-[var(--text-primary)] md:text-4xl">
                            Satu tempat untuk follow provider, beli sinyal, dan pantau performa.
                        </h1>
                        <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)] md:text-base">
                            Sistem copytrade ARRA7 mendukung mode follower dan mode provider. Anda bisa mulai dari marketplace, lalu lanjut ke dashboard dan
                            bridge tanpa pindah platform.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            {session ? (
                                <>
                                    <Link
                                        href="/copytrade/dashboard"
                                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                                    >
                                        Buka Follower Desk
                                    </Link>
                                    <Link
                                        href="/copytrade/provider"
                                        className="rounded-xl border border-[var(--border-light)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-blue-300 hover:text-blue-700"
                                    >
                                        Buka Provider Studio
                                    </Link>
                                </>
                            ) : (
                                <button
                                    onClick={() => signIn()}
                                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                                >
                                    Login untuk mulai
                                </button>
                            )}
                            <Link
                                href="/copytrade/system"
                                className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary)]"
                            >
                                Lihat System Guide
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        {[
                            { label: 'Provider Active', value: stats.totalProviders },
                            { label: 'Follower Active', value: stats.totalFollowers },
                            { label: 'Historical Trades', value: stats.totalTrades },
                        ].map((item) => (
                            <div key={item.label} className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{item.label}</p>
                                <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">{item.value.toLocaleString('id-ID')}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 grid gap-3 md:grid-cols-4">
                    {[
                        { href: '/copytrade/dashboard', title: 'Follower Desk', desc: 'Monitor provider yang Anda ikuti dan status signal.' },
                        { href: '/copytrade/provider', title: 'Provider Studio', desc: 'Kelola akun provider, post signal, update status.' },
                        { href: '/copytrade-bridge', title: 'Bridge Console', desc: 'Integrasi EA MT4/MT5, license key, credit, logs.' },
                        { href: '/copytrade/system', title: 'Operational Guide', desc: 'SOP penggunaan untuk user, provider, dan admin.' },
                    ].map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="rounded-2xl border border-[var(--border-light)] bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-300"
                        >
                            <p className="text-sm font-bold text-[var(--text-primary)]">{item.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{item.desc}</p>
                        </Link>
                    ))}
                </div>

                <div className="mt-8 rounded-2xl border border-[var(--border-light)] bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Provider Directory</h2>
                            <p className="text-sm text-[var(--text-secondary)]">Cari provider berdasarkan nama, broker, atau strategi.</p>
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari provider..."
                            className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-blue-400 md:w-72"
                        />
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {loading &&
                        Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="h-72 animate-pulse rounded-2xl border border-[var(--border-light)] bg-white" />
                        ))}

                    {!loading &&
                        filteredProviders.map((provider, index) => (
                            <motion.div
                                key={provider.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04 }}
                            >
                                <ProviderCard provider={provider} />
                            </motion.div>
                        ))}
                </div>

                {!loading && filteredProviders.length === 0 && (
                    <div className="mt-6 rounded-2xl border border-dashed border-[var(--border-light)] bg-white p-10 text-center">
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Tidak ada provider yang cocok</h3>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">Ubah kata kunci pencarian atau daftar sebagai provider baru.</p>
                        <Link
                            href="/copytrade/become-provider"
                            className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                            Daftar Jadi Provider
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}
