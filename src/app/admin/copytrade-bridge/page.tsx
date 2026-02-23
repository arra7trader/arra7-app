'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import CopytradeModuleNav from '@/components/copytrade/CopytradeModuleNav';
import { isAdminEmail } from '@/lib/admin-access';

type AdminTab = 'providers' | 'users' | 'signals' | 'topups';

interface ProviderRow {
    id: string;
    display_name: string;
    user_email?: string;
    user_membership?: string;
    broker_name?: string;
    is_active: number;
    is_approved: number;
    total_followers?: number;
    created_at: string;
}

interface BridgeUserRow {
    id: string;
    email: string;
    name?: string | null;
    license_key?: string | null;
    copytrade_balance: number;
}

interface BridgeSignalRow {
    id: string;
    pair: string;
    type: string;
    entry_price: number;
    tp: number;
    sl: number;
    created_at: string;
}

interface Stats {
    totalUsers: number;
    activeUsers: number;
    totalSignals: number;
    pendingTopups: number;
    submittedTopups: number;
    creditedTopups: number;
}

interface TopupRow {
    id: string;
    order_id: string;
    email: string;
    plan_id: string;
    credits: number;
    amount_idr: number;
    paid_amount_idr?: number | null;
    status: string;
    payment_provider: string;
    provider_reference?: string | null;
    proof_sender?: string | null;
    proof_channel?: string | null;
    proof_note?: string | null;
    proof_image_url?: string | null;
    proof_submitted_at?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    review_note?: string | null;
    created_at: string;
    paid_at?: string | null;
    credited_at?: string | null;
}

export default function AdminCopytradeBridgePage() {
    const { data: session, status } = useSession();
    const [tab, setTab] = useState<AdminTab>('providers');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const [stats, setStats] = useState<Stats>({ totalUsers: 0, activeUsers: 0, totalSignals: 0, pendingTopups: 0, submittedTopups: 0, creditedTopups: 0 });
    const [providers, setProviders] = useState<ProviderRow[]>([]);
    const [users, setUsers] = useState<BridgeUserRow[]>([]);
    const [signals, setSignals] = useState<BridgeSignalRow[]>([]);
    const [topups, setTopups] = useState<TopupRow[]>([]);

    const [signalForm, setSignalForm] = useState({
        pair: 'XAUUSD',
        type: 'BUY',
        entry_price: '',
        tp: '',
        sl: '',
    });
    const signalTypeOptions = ['BUY', 'SELL', 'BUY LIMIT', 'SELL LIMIT', 'BUY STOP', 'SELL STOP'];

    const [adjustments, setAdjustments] = useState<Record<string, string>>({});
    const [adjustmentReasons, setAdjustmentReasons] = useState<Record<string, string>>({});
    const [topupReviewNotes, setTopupReviewNotes] = useState<Record<string, string>>({});

    useEffect(() => {
        if (status === 'authenticated') void refresh();
    }, [status]);

    const refresh = async () => {
        setLoading(true);
        try {
            const [providerRes, statsRes, usersRes, signalsRes, topupsRes] = await Promise.all([
                fetch('/api/admin/copytrade?filter=all'),
                fetch('/api/admin/copytrade-bridge/stats'),
                fetch('/api/admin/copytrade-bridge/users'),
                fetch('/api/copytrade-bridge/signals?limit=40'),
                fetch('/api/admin/copytrade-bridge/topups?limit=80'),
            ]);

            const providerData = await providerRes.json();
            const statsData = await statsRes.json();
            const usersData = await usersRes.json();
            const signalsData = await signalsRes.json();
            const topupsData = await topupsRes.json();

            setProviders((providerData.providers || []) as ProviderRow[]);
            if (statsData.success) {
                setStats({
                    totalUsers: Number(statsData.totalUsers || 0),
                    activeUsers: Number(statsData.activeUsers || 0),
                    totalSignals: Number(statsData.totalSignals || 0),
                    pendingTopups: Number(statsData.pendingTopups || 0),
                    submittedTopups: Number(statsData.submittedTopups || 0),
                    creditedTopups: Number(statsData.creditedTopups || 0),
                });
            }
            setUsers((usersData.users || []) as BridgeUserRow[]);
            setSignals((signalsData.signals || []) as BridgeSignalRow[]);
            setTopups((topupsData.topups || []) as TopupRow[]);
        } catch (error) {
            console.error('[AdminCopytradeBridge] refresh failed', error);
        } finally {
            setLoading(false);
        }
    };

    const providerGroups = useMemo(() => ({
        pending: providers.filter((row) => row.is_approved === 0 && row.is_active === 0),
        active: providers.filter((row) => row.is_approved === 1 && row.is_active === 1),
        rejected: providers.filter((row) => row.is_approved === -1),
    }), [providers]);

    const moderateProvider = async (providerId: string, action: 'approve' | 'reject' | 'deactivate') => {
        setSaving(true);
        setMessage('');
        try {
            const response = await fetch('/api/admin/copytrade', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ providerId, action }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal update provider');
            setMessage(data.message || 'Provider updated');
            await refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Gagal update provider');
        } finally {
            setSaving(false);
        }
    };

    const adjustBalance = async (userId: string, amount: number, reason: string) => {
        setSaving(true);
        setMessage('');
        try {
            const response = await fetch('/api/admin/copytrade-bridge/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount, reason }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal ubah saldo');
            setUsers((current) => current.map((row) => (row.id === userId ? { ...row, copytrade_balance: Number(data.newBalance || 0) } : row)));
            setAdjustmentReasons((current) => ({ ...current, [userId]: '' }));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Gagal ubah saldo');
        } finally {
            setSaving(false);
        }
    };

    const reviewTopup = async (orderId: string, action: 'approve' | 'reject') => {
        setSaving(true);
        setMessage('');
        try {
            const reason = String(topupReviewNotes[orderId] || '').trim();
            const response = await fetch('/api/admin/copytrade-bridge/topups', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, action, reason }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal review topup');
            setMessage(data.message || `Topup ${orderId} ${action === 'approve' ? 'approved' : 'rejected'}.`);
            await refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Gagal review topup');
        } finally {
            setSaving(false);
        }
    };

    const broadcastSignal = async () => {
        setSaving(true);
        setMessage('');
        try {
            const response = await fetch('/api/copytrade-bridge/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pair: signalForm.pair.toUpperCase().trim(),
                    type: signalForm.type,
                    entry_price: Number(signalForm.entry_price),
                    tp: Number(signalForm.tp),
                    sl: Number(signalForm.sl),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal broadcast signal');
            setMessage('Signal bridge berhasil dikirim.');
            setSignalForm({ pair: 'XAUUSD', type: 'BUY', entry_price: '', tp: '', sl: '' });
            await refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Gagal broadcast signal');
        } finally {
            setSaving(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <section className="min-h-screen bg-[var(--bg-primary)]">
                <CopytradeModuleNav />
            </section>
        );
    }

    const email = session?.user?.email?.toLowerCase() || '';
    if (!isAdminEmail(email)) {
        return (
            <section className="min-h-screen bg-[var(--bg-primary)]">
                <CopytradeModuleNav />
                <div className="mx-auto max-w-3xl px-4 pb-12 pt-8">
                    <div className="rounded-2xl border border-[var(--border-light)] bg-white p-8 text-center">
                        <h1 className="text-2xl font-black text-[var(--text-primary)]">Unauthorized</h1>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">Halaman admin hanya untuk email yang terdaftar.</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen bg-[var(--bg-primary)]">
            <CopytradeModuleNav />
            <div className="mx-auto max-w-7xl px-4 pb-12 pt-8">
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                    {[
                        { label: 'Bridge Users', value: stats.totalUsers },
                        { label: 'Active EA (15m)', value: stats.activeUsers },
                        { label: 'Signals Broadcasted', value: stats.totalSignals },
                        { label: 'Draft Topups', value: stats.pendingTopups },
                        { label: 'Need Review', value: stats.submittedTopups },
                        { label: 'Credited Topups', value: stats.creditedTopups },
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                            <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
                            <p className="mt-1 text-3xl font-black text-[var(--text-primary)]">{item.value.toLocaleString('id-ID')}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-[var(--border-light)] bg-white p-2">
                    {[
                        { id: 'providers', label: `Provider Review (${providerGroups.pending.length} pending)` },
                        { id: 'users', label: `Bridge Users (${users.length})` },
                        { id: 'signals', label: `Bridge Signals (${signals.length})` },
                        { id: 'topups', label: `Topup Orders (${topups.length})` },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id as AdminTab)}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === item.id ? 'bg-blue-600 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                    <button onClick={refresh} className="ml-auto rounded-xl bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
                        Refresh
                    </button>
                </div>

                {tab === 'providers' && (
                    <div className="mt-6 space-y-4">
                        {providers.length === 0 && <div className="rounded-2xl border border-[var(--border-light)] bg-white p-6 text-sm text-[var(--text-secondary)]">Tidak ada provider.</div>}
                        {providers.map((provider) => (
                            <div key={provider.id} className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="font-bold text-[var(--text-primary)]">{provider.display_name}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {provider.user_email} | {provider.user_membership || '-'} | {provider.broker_name || '-'} | Followers {provider.total_followers || 0}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => moderateProvider(provider.id, 'approve')} disabled={saving} className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white">Approve</button>
                                        <button onClick={() => moderateProvider(provider.id, 'reject')} disabled={saving} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white">Reject</button>
                                        <button onClick={() => moderateProvider(provider.id, 'deactivate')} disabled={saving} className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white">Deactivate</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'users' && (
                    <div className="mt-6 space-y-3">
                        {users.map((user) => {
                            const amount = Number(adjustments[user.id] || '10');
                            const reason = String(adjustmentReasons[user.id] || '').trim();
                            return (
                                <div key={user.id} className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="font-semibold text-[var(--text-primary)]">{user.email}</p>
                                            <p className="text-xs text-[var(--text-secondary)] font-mono">{user.license_key || '-'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={adjustments[user.id] || '10'}
                                                onChange={(event) => setAdjustments((current) => ({ ...current, [user.id]: event.target.value }))}
                                                className="w-20 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-2 py-1 text-sm"
                                            />
                                            <input
                                                value={adjustmentReasons[user.id] || ''}
                                                onChange={(event) => setAdjustmentReasons((current) => ({ ...current, [user.id]: event.target.value }))}
                                                placeholder="Reason"
                                                className="w-40 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-2 py-1 text-sm"
                                            />
                                            <button onClick={() => adjustBalance(user.id, -Math.abs(amount), reason)} disabled={saving || reason.length < 3} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">-</button>
                                            <span className="w-12 text-center text-sm font-bold text-[var(--text-primary)]">{user.copytrade_balance}</span>
                                            <button onClick={() => adjustBalance(user.id, Math.abs(amount), reason)} disabled={saving || reason.length < 3} className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">+</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {tab === 'signals' && (
                    <div className="mt-6 space-y-4">
                        <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Broadcast Bridge Signal</h3>
                            <div className="mt-3 grid gap-2 md:grid-cols-5">
                                <input value={signalForm.pair} onChange={(e) => setSignalForm({ ...signalForm, pair: e.target.value })} placeholder="Pair" className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                                <select value={signalForm.type} onChange={(e) => setSignalForm({ ...signalForm, type: e.target.value })} className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm">
                                    {signalTypeOptions.map((orderType) => (
                                        <option key={orderType} value={orderType}>{orderType}</option>
                                    ))}
                                </select>
                                <input value={signalForm.entry_price} onChange={(e) => setSignalForm({ ...signalForm, entry_price: e.target.value })} placeholder="Entry" className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                                <input value={signalForm.tp} onChange={(e) => setSignalForm({ ...signalForm, tp: e.target.value })} placeholder="TP" className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                                <input value={signalForm.sl} onChange={(e) => setSignalForm({ ...signalForm, sl: e.target.value })} placeholder="SL" className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                            </div>
                            <button onClick={broadcastSignal} disabled={saving} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                                Broadcast Signal
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white">
                            <table className="w-full text-sm">
                                <thead className="border-b border-[var(--border-light)] bg-[var(--bg-secondary)]">
                                    <tr>
                                        {['Pair', 'Type', 'Entry', 'TP', 'SL', 'Created'].map((item) => (
                                            <th key={item} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{item}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {signals.map((signal) => (
                                        <tr key={signal.id} className="border-b border-[var(--border-light)] last:border-0">
                                            <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{signal.pair}</td>
                                            <td className="px-4 py-3">{signal.type}</td>
                                            <td className="px-4 py-3">{signal.entry_price}</td>
                                            <td className="px-4 py-3 text-green-600">{signal.tp}</td>
                                            <td className="px-4 py-3 text-red-600">{signal.sl}</td>
                                            <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{new Date(signal.created_at).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'topups' && (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white">
                        <table className="w-full text-sm">
                            <thead className="border-b border-[var(--border-light)] bg-[var(--bg-secondary)]">
                                <tr>
                                    {['Order', 'Email', 'Plan', 'Amount', 'Proof', 'Status', 'Action'].map((item) => (
                                        <th key={item} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{item}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {topups.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-6 text-[var(--text-secondary)]">Belum ada order topup.</td>
                                    </tr>
                                )}
                                {topups.map((row) => (
                                    <tr key={row.id} className="border-b border-[var(--border-light)] last:border-0">
                                        <td className="px-4 py-3 align-top">
                                            <p className="font-mono text-xs">{row.order_id}</p>
                                            <p className="text-[11px] text-[var(--text-secondary)]">{new Date(row.created_at).toLocaleString('id-ID')}</p>
                                        </td>
                                        <td className="px-4 py-3 align-top">{row.email}</td>
                                        <td className="px-4 py-3 align-top">{row.plan_id} ({row.credits})</td>
                                        <td className="px-4 py-3 align-top">
                                            <p>Rp {Number(row.amount_idr || 0).toLocaleString('id-ID')}</p>
                                            {row.paid_amount_idr ? (
                                                <p className="text-[11px] text-[var(--text-secondary)]">Paid: Rp {Number(row.paid_amount_idr || 0).toLocaleString('id-ID')}</p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <p className="text-xs text-[var(--text-secondary)]">Ref: {row.provider_reference || '-'}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">Sender: {row.proof_sender || '-'}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">Channel: {row.proof_channel || '-'}</p>
                                            {row.proof_image_url ? (
                                                <a href={row.proof_image_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600">
                                                    Open proof image
                                                </a>
                                            ) : null}
                                            {row.proof_note ? (
                                                <p className="text-xs text-[var(--text-secondary)]">Note: {row.proof_note}</p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                                row.status === 'credited' ? 'bg-green-100 text-green-700'
                                                    : row.status === 'pending' ? 'bg-amber-100 text-amber-700'
                                                        : row.status === 'paid' ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                                {row.status}
                                            </span>
                                            {row.reviewed_by ? (
                                                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                                                    by {row.reviewed_by}
                                                </p>
                                            ) : null}
                                            {row.review_note ? (
                                                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{row.review_note}</p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            {row.status === 'paid' || row.status === 'pending' ? (
                                                <div className="space-y-2">
                                                    <input
                                                        value={topupReviewNotes[row.order_id] || ''}
                                                        onChange={(event) =>
                                                            setTopupReviewNotes((current) => ({ ...current, [row.order_id]: event.target.value }))
                                                        }
                                                        placeholder="Reason (opsional, wajib untuk reject)"
                                                        className="w-56 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-2 py-1 text-xs"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => reviewTopup(row.order_id, 'approve')}
                                                            disabled={saving}
                                                            className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => reviewTopup(row.order_id, 'reject')}
                                                            disabled={saving}
                                                            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-[var(--text-secondary)]">
                                                    {row.credited_at ? `Credited ${new Date(row.credited_at).toLocaleString('id-ID')}` : '-'}
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {message && <p className="mt-4 text-sm text-[var(--text-secondary)]">{message}</p>}
            </div>
        </section>
    );
}
