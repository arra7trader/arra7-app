'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface ProviderProfile {
    id: string;
    display_name: string;
    bio?: string | null;
    is_active: number;
    is_approved: number;
    total_followers?: number | null;
    win_rate?: number | null;
    total_profit_usd?: number | null;
    subscription_fee?: number | null;
    profit_sharing_percent?: number | null;
}

export default function ProviderStudioPage() {
    const { data: session, status } = useSession();
    const [profile, setProfile] = useState<ProviderProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const [bio, setBio] = useState('');
    const [subscriptionFee, setSubscriptionFee] = useState('0');
    const [profitShare, setProfitShare] = useState('0');

    useEffect(() => {
        if (status !== 'authenticated') return;
        void fetchProfile();
    }, [status]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/copytrade/providers?myProfile=true');
            const data = await response.json();
            const provider = (data.provider || null) as ProviderProfile | null;
            setProfile(provider);
            if (provider) {
                setBio(provider.bio || '');
                setSubscriptionFee(String(Number(provider.subscription_fee || 0)));
                setProfitShare(String(Number(provider.profit_sharing_percent || 0)));
            }
        } catch (error) {
            console.error('[ProviderStudio] fetch failed', error);
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async () => {
        if (!profile) return;
        setSaving(true);
        setMessage('');
        try {
            const response = await fetch(`/api/copytrade/providers/${profile.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bio,
                    subscriptionFee: Number(subscriptionFee || '0'),
                    profitSharingPercent: Number(profitShare || '0'),
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Gagal menyimpan profil');
            }
            setMessage('Profil provider berhasil disimpan.');
            await fetchProfile();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Gagal menyimpan profil');
        } finally {
            setSaving(false);
        }
    };

    if (status === 'loading' || loading) {
        return <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8" />;
    }

    if (!session?.user?.email) {
        return (
            <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8">
                <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--border-light)] bg-white p-8 text-center">
                    <h1 className="text-2xl font-black text-[var(--text-primary)]">Provider Studio membutuhkan login</h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Login dulu untuk mengelola profil provider dan signal Anda.</p>
                </div>
            </section>
        );
    }

    if (!profile) {
        return (
            <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8">
                <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-[var(--border-light)] bg-white p-8 text-center">
                    <h1 className="text-2xl font-black text-[var(--text-primary)]">Akun Anda belum terdaftar sebagai provider</h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Daftar provider untuk membuka fitur post signal, follower analytics, dan monetisasi pay-per-signal.
                    </p>
                    <Link href="/copytrade/become-provider" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                        Daftar Sekarang
                    </Link>
                </div>
            </section>
        );
    }

    const providerStatus = profile.is_active
        ? 'Active'
        : profile.is_approved === -1
            ? 'Rejected'
            : 'Pending Approval';

    return (
        <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8">
            <div className="mx-auto max-w-6xl">
                <div className="grid gap-4 md:grid-cols-4">
                    {[
                        { label: 'Provider Status', value: providerStatus },
                        { label: 'Followers', value: Number(profile.total_followers || 0).toString() },
                        { label: 'Win Rate', value: `${Number(profile.win_rate || 0).toFixed(1)}%` },
                        { label: 'Total Profit', value: `$${Number(profile.total_profit_usd || 0).toFixed(2)}` },
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
                            <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
                            <p className="mt-1 text-lg font-black text-[var(--text-primary)]">{item.value}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5 lg:col-span-2">
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Provider Profile</h2>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Display name ditetapkan saat registrasi. Data di bawah bisa disesuaikan untuk strategi monetisasi.
                        </p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Display Name</label>
                                <input
                                    value={profile.display_name}
                                    readOnly
                                    className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Bio / Strategy</label>
                                <textarea
                                    value={bio}
                                    onChange={(event) => setBio(event.target.value)}
                                    rows={4}
                                    className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Subscription Fee (IDR / month)</label>
                                    <input
                                        value={subscriptionFee}
                                        onChange={(event) => setSubscriptionFee(event.target.value)}
                                        className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Profit Share (%)</label>
                                    <input
                                        value={profitShare}
                                        onChange={(event) => setProfitShare(event.target.value)}
                                        className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {message && <p className="mt-3 text-xs text-[var(--text-secondary)]">{message}</p>}
                        <button
                            onClick={saveProfile}
                            disabled={saving}
                            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? 'Saving...' : 'Save Provider Profile'}
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Quick Actions</h3>
                            <div className="mt-3 grid gap-2">
                                <Link href="/copytrade/dashboard" className="rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                    Open Provider Workspace
                                </Link>
                                <Link href="/copytrade/provider" className="rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                    Refresh Provider Data
                                </Link>
                                <Link href="/copytrade/system" className="rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                    Operational Guide
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Operational Notes</h3>
                            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-[var(--text-secondary)]">
                                <li>Signal hanya bisa diposting saat status provider aktif.</li>
                                <li>Gunakan price koin = 0 untuk signal gratis (lead magnet).</li>
                                <li>Review performa harian untuk menjaga win rate.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
