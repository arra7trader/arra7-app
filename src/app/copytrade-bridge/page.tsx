'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import CopytradeModuleNav from '@/components/copytrade/CopytradeModuleNav';
import { COPYTRADE_CREDITS_PER_SIGNAL } from '@/lib/copytrade-credit';

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
    price: number;
    priceLabel: string;
    label: string;
    badge?: string;
}

interface TopupOrder {
    orderId: string;
    planId: string;
    credits: number;
    amountIdr: number;
    paidAmountIdr?: number | null;
    amountLabel?: string;
    status: string;
    providerReference?: string | null;
    proofSender?: string | null;
    proofChannel?: string | null;
    proofNote?: string | null;
    proofImageUrl?: string | null;
    proofSubmittedAt?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    reviewNote?: string | null;
    expiresAt?: string | null;
    paidAt?: string | null;
    creditedAt?: string | null;
    paymentProvider?: string;
    qrisImageUrl?: string;
    merchantName?: string;
    nmid?: string;
}

const topupStatusClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'credited') return 'bg-green-100 text-green-700 border-green-200';
    if (normalized === 'paid') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (normalized === 'expired' || normalized === 'failed') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
};

export default function CopytradeBridgePage() {
    const { data: session, status } = useSession();

    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [creatingTopup, setCreatingTopup] = useState(false);
    const [message, setMessage] = useState('');

    const [licenseKey, setLicenseKey] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [lastActive, setLastActive] = useState<string | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [activeTopup, setActiveTopup] = useState<TopupOrder | null>(null);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [logs, setLogs] = useState<TradeLog[]>([]);
    const [proofForm, setProofForm] = useState({
        providerReference: '',
    });

    const selectedPlan = useMemo(() => {
        if (!plans.length) return null;
        return plans.find((plan) => plan.id === selectedPlanId) || plans[0];
    }, [plans, selectedPlanId]);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [infoRes, signalRes, logRes, planRes] = await Promise.all([
                fetch('/api/copytrade-bridge/user/info'),
                fetch('/api/copytrade-bridge/signals?limit=20'),
                fetch('/api/copytrade-bridge/trade/history?limit=30'),
                fetch('/api/copytrade-bridge/topup'),
            ]);
            const infoData = await infoRes.json();
            const signalData = await signalRes.json();
            const logData = await logRes.json();
            const planData = await planRes.json();

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
            if (planData.success) {
                const nextPlans = (planData.plans || []) as Plan[];
                setPlans(nextPlans);
                setSelectedPlanId((current) => current || nextPlans[0]?.id || '');
            }
        } catch (error) {
            console.error('[Bridge] refresh failed', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated') void refresh();
    }, [status, refresh]);

    useEffect(() => {
        if (!activeTopup?.orderId) return;
        if (!['pending', 'paid'].includes(activeTopup.status)) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/copytrade-bridge/topup/status?orderId=${encodeURIComponent(activeTopup.orderId)}`);
                const data = await res.json();
                if (!res.ok || !data?.success || !data.order) return;
                const nextOrder = data.order as TopupOrder;
                setActiveTopup(nextOrder);

                if (nextOrder.status === 'credited') {
                    setMessage('Topup berhasil dikreditkan otomatis ke balance bridge.');
                    await refresh();
                }
            } catch {
                // silent polling failure
            }
        }, 6000);

        return () => clearInterval(interval);
    }, [activeTopup?.orderId, activeTopup?.status, refresh]);

    useEffect(() => {
        if (!activeTopup) return;
        setProofForm({
            providerReference: activeTopup.providerReference || '',
        });
    }, [activeTopup]);

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
        try {
            await navigator.clipboard.writeText(licenseKey);
            setMessage('License key tersalin ke clipboard.');
        } catch {
            setMessage('Gagal menyalin license key.');
        }
    };

    const createTopupOrder = async () => {
        if (!selectedPlan) return;
        setCreatingTopup(true);
        setMessage('');
        try {
            const response = await fetch('/api/copytrade-bridge/topup/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: selectedPlan.id }),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data.error || 'Gagal membuat order topup');
            }
            setActiveTopup(data.order as TopupOrder);
            setMessage('Order topup dibuat. Scan QRIS lalu kirim bukti pembayaran untuk verifikasi admin.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Gagal membuat order topup');
        } finally {
            setCreatingTopup(false);
        }
    };

    const refreshTopupStatus = async () => {
        if (!activeTopup?.orderId) return;
        try {
            const response = await fetch(`/api/copytrade-bridge/topup/status?orderId=${encodeURIComponent(activeTopup.orderId)}`);
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data.error || 'Gagal refresh status');
            setActiveTopup(data.order as TopupOrder);
            if (data.order?.status === 'credited') {
                await refresh();
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Gagal refresh status topup');
        }
    };

    const submitPaymentProof = async () => {
        if (!activeTopup?.orderId) return;
        setWorking(true);
        setMessage('');
        try {
            const response = await fetch('/api/copytrade-bridge/topup/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: activeTopup.orderId,
                    providerReference: proofForm.providerReference.trim(),
                    proofSender: session?.user?.name || '',
                    proofChannel: 'telegram',
                    paidAmountIdr: Number(activeTopup.amountIdr || 0),
                    proofNote: 'Bukti pembayaran dikirim via Telegram @arra7trader',
                }),
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data.error || 'Gagal mengirim bukti pembayaran');
            }
            setMessage(data.message || 'Bukti pembayaran berhasil dikirim.');
            const telegramText = [
                'Halo Admin ARRA7!',
                '',
                'Saya sudah melakukan pembayaran topup Copytrade Bridge:',
                '',
                `Order ID: ${activeTopup.orderId}`,
                `Email: ${session?.user?.email || '-'}`,
                `Nama: ${session?.user?.name || '-'}`,
                `Paket: ${activeTopup.credits} kredit`,
                `Nominal: Rp ${Number(activeTopup.amountIdr || 0).toLocaleString('id-ID')}`,
                `Reference: ${proofForm.providerReference.trim() || '-'}`,
                '',
                'Berikut bukti screenshot pembayarannya (saya lampirkan di chat ini). Mohon diproses, terima kasih.',
            ].join('\n');
            window.open(`https://t.me/arra7trader?text=${encodeURIComponent(telegramText)}`, '_blank');
            await refreshTopupStatus();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Gagal mengirim bukti pembayaran');
        } finally {
            setWorking(false);
        }
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
                        Pusat kendali integrasi EA MT4/MT5: license key, kredit, signal queue, topup QRIS, dan trade logs.
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
                        <p className="text-xs text-[var(--text-secondary)]">
                            {COPYTRADE_CREDITS_PER_SIGNAL} kredit = 1 trade execution
                        </p>
                        <button onClick={refresh} className="mt-3 rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
                            Refresh balance
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Topup Credit (QRIS)</h3>
                        <div className="mt-3 grid gap-2">
                            {plans.map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlanId(plan.id)}
                                    className={`rounded-xl border px-3 py-2 text-left text-sm ${
                                        selectedPlan?.id === plan.id
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span>{plan.credits} kredit - {plan.priceLabel}</span>
                                        {plan.badge && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">{plan.badge}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={createTopupOrder}
                            disabled={creatingTopup || !selectedPlan}
                            className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            {creatingTopup ? 'Membuat order...' : 'Buat Order Topup'}
                        </button>
                        <p className="mt-2 text-xs text-[var(--text-secondary)]">
                            Payment provider: <span className="font-semibold">qris.id</span>
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white lg:col-span-2">
                        <div className="border-b border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-3">
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Topup Order</h3>
                        </div>
                        {!activeTopup ? (
                            <div className="p-6 text-sm text-[var(--text-secondary)]">
                                Belum ada order topup aktif. Pilih paket lalu klik <strong>Buat Order Topup</strong>.
                            </div>
                        ) : (
                            <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr]">
                                <div className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-white p-2">
                                    <Image
                                        src={activeTopup.qrisImageUrl || '/qris-payment.jpg'}
                                        alt="QRIS Topup"
                                        width={360}
                                        height={360}
                                        className="h-full w-full rounded-lg object-contain"
                                    />
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-[var(--text-primary)]">{activeTopup.orderId}</span>
                                        <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${topupStatusClass(activeTopup.status)}`}>
                                            {activeTopup.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-[var(--text-secondary)]">
                                        Paket <strong>{activeTopup.credits} kredit</strong> - Rp {Number(activeTopup.amountIdr || 0).toLocaleString('id-ID')}
                                    </p>
                                    <p className="text-[var(--text-secondary)]">
                                        Merchant: {activeTopup.merchantName || 'ARRA7'} {activeTopup.nmid ? `| NMID ${activeTopup.nmid}` : ''}
                                    </p>
                                    <p className="text-[var(--text-secondary)]">
                                        Expires: {activeTopup.expiresAt ? new Date(activeTopup.expiresAt).toLocaleString('id-ID') : '-'}
                                    </p>
                                    {activeTopup.providerReference && (
                                        <p className="text-[var(--text-secondary)]">
                                            Ref: <span className="font-mono text-xs">{activeTopup.providerReference}</span>
                                        </p>
                                    )}
                                    {activeTopup.creditedAt && (
                                        <p className="text-green-700">Credited at: {new Date(activeTopup.creditedAt).toLocaleString('id-ID')}</p>
                                    )}
                                    {activeTopup.reviewedAt && (
                                        <p className="text-[var(--text-secondary)]">
                                            Reviewed: {new Date(activeTopup.reviewedAt).toLocaleString('id-ID')}
                                        </p>
                                    )}
                                    {activeTopup.reviewNote && (
                                        <p className={`${activeTopup.status === 'failed' ? 'text-red-600' : 'text-[var(--text-secondary)]'}`}>
                                            Note admin: {activeTopup.reviewNote}
                                        </p>
                                    )}
                                    <div className="pt-2">
                                        <button
                                            onClick={refreshTopupStatus}
                                            className="rounded-lg bg-[var(--bg-secondary)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                                        >
                                            Refresh status order
                                        </button>
                                    </div>
                                    {['pending', 'paid', 'failed'].includes(activeTopup.status) && (
                                        <div className="mt-2 space-y-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-3">
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                Sistem sama seperti pembelian paket pricing: setelah bayar, klik tombol di bawah untuk buka Telegram admin dan kirim screenshot bukti.
                                            </p>
                                            <input
                                                value={proofForm.providerReference}
                                                onChange={(event) => setProofForm((current) => ({ ...current, providerReference: event.target.value }))}
                                                placeholder="Reference transaksi (opsional, contoh: TRX12345)"
                                                className="w-full rounded-lg border border-[var(--border-light)] bg-white px-3 py-2 text-xs"
                                            />
                                            <button
                                                onClick={submitPaymentProof}
                                                disabled={working}
                                                className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                            >
                                                {working ? 'Membuka Telegram...' : 'Konfirmasi & Kirim Bukti via Telegram'}
                                            </button>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                Setelah chat Telegram terbuka, lampirkan screenshot bukti pembayaran di sana.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white lg:col-span-2">
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
                        <li>Isi kredit dengan topup QRIS, lalu kirim bukti bayar di panel topup.</li>
                        <li>Tunggu verifikasi admin sampai status order <code>credited</code>.</li>
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
