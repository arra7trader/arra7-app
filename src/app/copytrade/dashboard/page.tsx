'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import SignalCard from '@/components/copytrade/SignalCard';

type Tab = 'signals' | 'providers' | 'provider-workspace';

interface Relationship {
    id: string;
    provider_id: string;
    display_name?: string;
    status: 'active' | 'paused' | 'stopped';
    allocated_capital?: number | null;
    total_profit_loss?: number | null;
}

interface Signal {
    id: string;
    pair: string;
    action: 'BUY' | 'SELL';
    entry_price: number | null;
    stop_loss: number | null;
    take_profit: number | null;
    lot_size: number;
    timeframe: string;
    commentary: string | null;
    status: string;
    result_pips: number | null;
    created_at: string;
    provider_name?: string;
    broker_name?: string;
    price_koin?: number;
    is_unlocked?: boolean;
}

interface ProviderProfile {
    id: string;
    display_name: string;
    is_active: number;
    is_approved: number;
    total_followers?: number | null;
    win_rate?: number | null;
}

const defaultForm = {
    pair: 'XAUUSD',
    action: 'BUY',
    timeframe: '1H',
    lotSize: '0.10',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    priceKoin: '0',
    commentary: '',
};

export default function CopytradeDashboardPage() {
    const { data: session, status } = useSession();
    const [tab, setTab] = useState<Tab>('signals');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [providerSignals, setProviderSignals] = useState<Signal[]>([]);
    const [profile, setProfile] = useState<ProviderProfile | null>(null);
    const [form, setForm] = useState(defaultForm);

    useEffect(() => {
        if (status === 'authenticated') void refreshAll();
    }, [status]);

    const refreshAll = async () => {
        setLoading(true);
        try {
            const [relRes, sigRes, myRes, pSigRes] = await Promise.all([
                fetch('/api/copytrade/relationships'),
                fetch('/api/copytrade/signals?mode=follower'),
                fetch('/api/copytrade/providers?myProfile=true'),
                fetch('/api/copytrade/signals?mode=provider'),
            ]);
            const relData = await relRes.json();
            const sigData = await sigRes.json();
            const myData = await myRes.json();
            const pSigData = await pSigRes.json();

            setRelationships((relData.relationships || []) as Relationship[]);
            setSignals((sigData.signals || []) as Signal[]);
            setProfile((myData.provider || null) as ProviderProfile | null);
            setProviderSignals((pSigData.signals || []) as Signal[]);
        } catch (error) {
            console.error('[CopytradeDashboard] refresh failed', error);
        } finally {
            setLoading(false);
        }
    };

    const updateRelationship = async (relationshipId: string, nextStatus: 'active' | 'paused' | 'stopped') => {
        await fetch('/api/copytrade/relationships', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relationshipId, status: nextStatus }),
        });
        setRelationships((current) => current.map((row) => (row.id === relationshipId ? { ...row, status: nextStatus } : row)));
    };

    const postSignal = async () => {
        setMessage('');
        const payload = {
            pair: form.pair.toUpperCase().trim(),
            action: form.action,
            timeframe: form.timeframe,
            lotSize: Number(form.lotSize || '0.1'),
            entryPrice: form.entryPrice ? Number(form.entryPrice) : null,
            stopLoss: form.stopLoss ? Number(form.stopLoss) : null,
            takeProfit: form.takeProfit ? Number(form.takeProfit) : null,
            priceKoin: Number(form.priceKoin || '0'),
            commentary: form.commentary || null,
        };
        const response = await fetch('/api/copytrade/signals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
            setMessage(data.error || 'Gagal posting signal');
            return;
        }
        setMessage(data.message || 'Signal berhasil diposting');
        setForm(defaultForm);
        await refreshAll();
    };

    const summary = useMemo(() => {
        const active = relationships.filter((row) => row.status === 'active').length;
        const allocated = relationships.reduce((sum, row) => sum + Number(row.allocated_capital || 0), 0);
        const pnl = relationships.reduce((sum, row) => sum + Number(row.total_profit_loss || 0), 0);
        return { active, allocated, pnl };
    }, [relationships]);

    if (status === 'loading' || loading) {
        return <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8" />;
    }

    if (!session?.user?.email) {
        return (
            <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8">
                <div className="mx-auto max-w-xl rounded-2xl border border-[var(--border-light)] bg-white p-8 text-center">
                    <h1 className="text-2xl font-black text-[var(--text-primary)]">Follower Desk membutuhkan login</h1>
                    <button onClick={() => signIn()} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                        Login sekarang
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-4 md:grid-cols-4">
                    {[
                        { label: 'Active Providers', value: summary.active.toString() },
                        { label: 'Allocated Capital', value: `$${summary.allocated.toFixed(2)}` },
                        { label: 'Net P/L', value: `${summary.pnl >= 0 ? '+' : ''}$${summary.pnl.toFixed(2)}` },
                        { label: 'Signal Feed', value: signals.length.toString() },
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
                            <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
                            <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">{item.value}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-[var(--border-light)] bg-white p-2">
                    {[
                        { id: 'signals', label: 'Signal Feed' },
                        { id: 'providers', label: 'My Providers' },
                        { id: 'provider-workspace', label: 'Provider Workspace' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id as Tab)}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === item.id ? 'bg-blue-600 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {tab === 'signals' && (
                    <div className="mt-6 space-y-3">
                        {signals.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-[var(--border-light)] bg-white p-8 text-center text-sm text-[var(--text-secondary)]">
                                Belum ada signal. Ikuti provider dari marketplace dulu. <Link href="/copytrade" className="font-semibold text-blue-600">Buka marketplace</Link>
                            </div>
                        )}
                        {signals.map((signal) => <SignalCard key={signal.id} signal={signal} onStatusUpdate={refreshAll} />)}
                    </div>
                )}

                {tab === 'providers' && (
                    <div className="mt-6 space-y-3">
                        {relationships.length === 0 && <div className="rounded-2xl border border-[var(--border-light)] bg-white p-6 text-sm text-[var(--text-secondary)]">Belum ada provider yang diikuti.</div>}
                        {relationships.map((row) => (
                            <div key={row.id} className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="font-bold text-[var(--text-primary)]">{row.display_name || row.provider_id}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">Allocated ${Number(row.allocated_capital || 0).toFixed(2)} | P/L {Number(row.total_profit_loss || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => updateRelationship(row.id, 'active')} className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white">Resume</button>
                                        <button onClick={() => updateRelationship(row.id, 'paused')} className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white">Pause</button>
                                        <button onClick={() => updateRelationship(row.id, 'stopped')} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white">Stop</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'provider-workspace' && (
                    <div className="mt-6 space-y-4">
                        {!profile && (
                            <div className="rounded-2xl border border-dashed border-[var(--border-light)] bg-white p-8 text-center">
                                <p className="text-sm text-[var(--text-secondary)]">Akun Anda belum menjadi provider.</p>
                                <Link href="/copytrade/become-provider" className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Daftar provider</Link>
                            </div>
                        )}

                        {profile && (
                            <>
                                <div className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
                                    <p className="font-bold text-[var(--text-primary)]">{profile.display_name}</p>
                                    <p className="text-xs text-[var(--text-secondary)]">Followers {Number(profile.total_followers || 0)} | Win Rate {Number(profile.win_rate || 0).toFixed(1)}%</p>
                                </div>

                                <div className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Post Signal</h3>
                                    <div className="mt-3 grid gap-2 md:grid-cols-4">
                                        <input value={form.pair} onChange={(e) => setForm({ ...form, pair: e.target.value })} className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" placeholder="Pair" />
                                        <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"><option>BUY</option><option>SELL</option></select>
                                        <input value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })} className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" placeholder="Timeframe" />
                                        <input value={form.priceKoin} onChange={(e) => setForm({ ...form, priceKoin: e.target.value })} className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" placeholder="Price Koin" />
                                        <input value={form.entryPrice} onChange={(e) => setForm({ ...form, entryPrice: e.target.value })} className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" placeholder="Entry" />
                                        <input value={form.stopLoss} onChange={(e) => setForm({ ...form, stopLoss: e.target.value })} className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" placeholder="Stop Loss" />
                                        <input value={form.takeProfit} onChange={(e) => setForm({ ...form, takeProfit: e.target.value })} className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" placeholder="Take Profit" />
                                        <input value={form.lotSize} onChange={(e) => setForm({ ...form, lotSize: e.target.value })} className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" placeholder="Lot Size" />
                                    </div>
                                    <textarea value={form.commentary} onChange={(e) => setForm({ ...form, commentary: e.target.value })} rows={3} className="mt-2 w-full rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" placeholder="Commentary..." />
                                    {message && <p className="mt-2 text-xs text-[var(--text-secondary)]">{message}</p>}
                                    <button onClick={postSignal} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Post signal</button>
                                </div>

                                <div className="space-y-3">
                                    {providerSignals.map((signal) => <SignalCard key={signal.id} signal={signal} isProvider onStatusUpdate={refreshAll} />)}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
