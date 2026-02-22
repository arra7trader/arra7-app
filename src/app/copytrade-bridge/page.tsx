'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import CopytradeModuleNav from '@/components/copytrade/CopytradeModuleNav';

interface Signal {
    id: string;
    pair: string;
    type: string;
    entry_price: number;
    tp: number;
    sl: number;
    created_at: string;
}

interface TradeLog {
    id: string;
    status: string;
    profit: number;
    timestamp: string;
}

interface Plan {
    id: string;
    credits: number;
    priceLabel: string;
}

const plans: Plan[] = [
    { id: 'CT_50', credits: 50, priceLabel: 'Rp 50.000' },
    { id: 'CT_100', credits: 100, priceLabel: 'Rp 90.000' },
    { id: 'CT_200', credits: 200, priceLabel: 'Rp 160.000' },
];

export default function CopytradeBridgePage() {
    const { data: session, status } = useSession();

    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState('');

    const [licenseKey, setLicenseKey] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [lastActive, setLastActive] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<Plan>(plans[0]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [logs, setLogs] = useState<TradeLog[]>([]);

    useEffect(() => {
        if (status === 'authenticated') void refresh();
    }, [status]);

    const refresh = async () => {
        setLoading(true);
        try {
            const [infoRes, signalRes, logRes] = await Promise.all([
                fetch('/api/copytrade-bridge/user/info'),
                fetch('/api/copytrade-bridge/signals?limit=20'),
                fetch('/api/copytrade-bridge/trade/history?limit=30'),
            ]);
            const infoData = await infoRes.json();
            const signalData = await signalRes.json();
            const logData = await logRes.json();

            if (infoData.success) {
                setLicenseKey(infoData.licenseKey || null);
                setBalance(Number(infoData.balance || 0));
                setIsConnected(Boolean(infoData.isConnected));
                setLastActive(infoData.lastActive || null);
            }
            if (signalData.success) {
                setSignals((signalData.signals || []) as Signal[]);
            }
            if (logData.success) {
                setLogs((logData.logs || []) as TradeLog[]);
            }
        } catch (error) {
            console.error('[Bridge] refresh failed', error);
        } finally {
            setLoading(false);
        }
    };

    const generateKey = async () => {
        setWorking(true);
        setMessage('');
        try {
            const response = await fetch('/api/copytrade-bridge/user/generate-key', { method: 'POST' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal generate key');
            setLicenseKey(data.licenseKey);
            setMessage('License key berhasil dibuat.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Gagal generate key');
        } finally {
            setWorking(false);
        }
    };

    const copyLicense = async () => {
        if (!licenseKey) return;
        await navigator.clipboard.writeText(licenseKey);
        setMessage('License key tersalin ke clipboard.');
    };

    const confirmTopup = () => {
        const text = [
            'Halo Admin ARRA7, saya ingin topup kredit bridge.',
            `Email: ${session?.user?.email || '-'}`,
            `Paket: ${selectedPlan.credits} kredit`,
            `Nominal: ${selectedPlan.priceLabel}`,
            'Bukti transfer sudah siap, mohon diproses.',
        ].join('\n');
        window.open(`https://t.me/arra7trader?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading || status === 'loading') {
        return (
            <section className="min-h-screen bg-[var(--bg-primary)]">
                <CopytradeModuleNav />
            </section>
        );
    }

    if (!session?.user?.email) {
        return (
            <section className="min-h-screen bg-[var(--bg-primary)]">
                <CopytradeModuleNav />
                <div className="mx-auto max-w-3xl px-4 pb-12 pt-8">
                    <div className="rounded-2xl border border-[var(--border-light)] bg-white p-8 text-center">
                        <h1 className="text-2xl font-black text-[var(--text-primary)]">Bridge Console membutuhkan login</h1>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">Login untuk mengelola license key dan sinkronisasi EA.</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen bg-[var(--bg-primary)]">
            <CopytradeModuleNav />

            <div className="mx-auto max-w-7xl px-4 pb-12 pt-8">
                <div className="rounded-3xl border border-[var(--border-light)] bg-white p-6">
                    <h1 className="text-3xl font-black text-[var(--text-primary)]">Copytrade Bridge Console</h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Pusat kendali integrasi EA MT4/MT5: license key, kredit, signal queue, dan trade logs.
                    </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5 md:col-span-2">
                        <h2 className="text-sm font-bold text-[var(--text-primary)]">License & Connection</h2>
                        {licenseKey ? (
                            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                                <input
                                    readOnly
                                    value={licenseKey}
                                    className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-mono"
                                />
                                <button onClick={copyLicense} className="rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                    Copy
                                </button>
                                <button onClick={generateKey} disabled={working} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                                    Regenerate
                                </button>
                            </div>
                        ) : (
                            <button onClick={generateKey} disabled={working} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                                Generate License Key
                            </button>
                        )}

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-3">
                                <p className="text-xs text-[var(--text-muted)]">EA Connection</p>
                                <p className={`mt-1 text-sm font-bold ${isConnected ? 'text-green-600' : 'text-amber-600'}`}>
                                    {isConnected ? 'Connected' : 'Offline'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-3">
                                <p className="text-xs text-[var(--text-muted)]">Last Active</p>
                                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                                    {lastActive ? new Date(lastActive).toLocaleString('id-ID') : '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                        <h2 className="text-sm font-bold text-[var(--text-primary)]">Credit Balance</h2>
                        <p className="mt-2 text-4xl font-black text-green-600">{balance}</p>
                        <p className="text-xs text-[var(--text-secondary)]">1 kredit = 1 trade execution</p>
                        <button onClick={refresh} className="mt-3 rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
                            Refresh balance
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Topup Credit</h3>
                        <div className="mt-3 grid gap-2">
                            {plans.map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan)}
                                    className={`rounded-xl border px-3 py-2 text-left text-sm ${selectedPlan.id === plan.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}
                                >
                                    {plan.credits} kredit - {plan.priceLabel}
                                </button>
                            ))}
                        </div>
                        <button onClick={confirmTopup} className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                            Konfirmasi Topup via Telegram
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white lg:col-span-2">
                        <div className="border-b border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-3">
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Latest Bridge Signals</h3>
                        </div>
                        {signals.length === 0 ? (
                            <div className="p-6 text-sm text-[var(--text-secondary)]">Belum ada signal bridge.</div>
                        ) : (
                            <div className="max-h-[320px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--border-light)]">
                                            {['Pair', 'Type', 'Entry', 'TP', 'SL', 'Created'].map((item) => (
                                                <th key={item} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                                    {item}
                                                </th>
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
                                                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                                                    {new Date(signal.created_at).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white">
                    <div className="border-b border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-3">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">My EA Trade Logs</h3>
                    </div>
                    {logs.length === 0 ? (
                        <div className="p-6 text-sm text-[var(--text-secondary)]">Belum ada trade log dari EA Anda.</div>
                    ) : (
                        <div className="max-h-[300px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-light)]">
                                        {['Status', 'Profit', 'Timestamp'].map((item) => (
                                            <th key={item} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                                {item}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} className="border-b border-[var(--border-light)] last:border-0">
                                            <td className="px-4 py-3">{log.status}</td>
                                            <td className={`px-4 py-3 font-semibold ${Number(log.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {Number(log.profit || 0) >= 0 ? '+' : ''}
                                                {Number(log.profit || 0).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{new Date(log.timestamp).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="mt-6 rounded-2xl border border-[var(--border-light)] bg-white p-5">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Setup EA (Quick SOP)</h3>
                    <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-[var(--text-secondary)]">
                        <li>Generate license key dari panel di atas.</li>
                        <li>Pasang EA bridge di folder <code>MQL5/Experts</code>.</li>
                        <li>Aktifkan WebRequest URL ARRA7 di MT4/MT5 options.</li>
                        <li>Isi license key di parameter EA dan jalankan.</li>
                        <li>Pantau status koneksi dan trade log secara berkala.</li>
                    </ol>
                </div>

                {message && <p className="mt-4 text-sm text-[var(--text-secondary)]">{message}</p>}
            </div>
        </section>
    );
}
