'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface ProviderProfile {
    id: string;
    display_name: string;
    is_active: number;
    is_approved: number;
}

export default function BecomeProviderPage() {
    const { status } = useSession();
    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [membership, setMembership] = useState('BASIC');
    const [existingProvider, setExistingProvider] = useState<ProviderProfile | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [brokerName, setBrokerName] = useState('Exness');
    const [brokerAccountId, setBrokerAccountId] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (status === 'authenticated') {
            void fetchStatus();
        }
    }, [status, router]);

    const fetchStatus = async () => {
        setChecking(true);
        try {
            const [membershipRes, providerRes] = await Promise.all([
                fetch('/api/user/membership'),
                fetch('/api/copytrade/providers?myProfile=true'),
            ]);

            const membershipData = await membershipRes.json();
            const providerData = await providerRes.json();

            setMembership((membershipData.membership || 'BASIC') as string);
            setExistingProvider((providerData.provider || null) as ProviderProfile | null);
        } catch (fetchError) {
            console.error('[BecomeProvider] fetch status failed', fetchError);
        } finally {
            setChecking(false);
        }
    };

    const submit = async () => {
        setError('');
        setSubmitting(true);
        try {
            const response = await fetch('/api/copytrade/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName,
                    bio,
                    brokerName,
                    brokerAccountId,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Gagal mendaftar provider');
            }
            await fetchStatus();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Gagal mendaftar provider');
        } finally {
            setSubmitting(false);
        }
    };

    if (status === 'loading' || checking) {
        return <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8" />;
    }

    if (existingProvider) {
        const state = existingProvider.is_active
            ? 'Active'
            : existingProvider.is_approved === -1
                ? 'Rejected'
                : 'Pending Approval';

        return (
            <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8">
                <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--border-light)] bg-white p-8 text-center">
                    <h1 className="text-2xl font-black text-[var(--text-primary)]">Anda sudah terdaftar sebagai provider</h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Provider <strong>{existingProvider.display_name}</strong> saat ini berstatus <strong>{state}</strong>.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Link href="/copytrade/provider" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                            Buka Provider Studio
                        </Link>
                        <Link href="/copytrade/dashboard" className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
                            Buka Dashboard
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    if (membership === 'BASIC') {
        return (
            <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8">
                <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--border-light)] bg-white p-8 text-center">
                    <h1 className="text-2xl font-black text-[var(--text-primary)]">Membership PRO / VVIP diperlukan</h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Provider hanya tersedia untuk akun PRO atau VVIP agar kualitas signal di marketplace tetap terjaga.
                    </p>
                    <Link href="/pricing" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                        Upgrade Membership
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8">
            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5 lg:col-span-2">
                    <h1 className="text-2xl font-black text-[var(--text-primary)]">Join as Signal Provider</h1>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Isi profil provider Anda. Setelah submit, admin akan review sebelum provider bisa tampil di marketplace.
                    </p>

                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Display Name</label>
                            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Bio / Strategy</label>
                            <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Broker Name</label>
                                <input value={brokerName} onChange={(event) => setBrokerName(event.target.value)} className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Broker Account ID</label>
                                <input value={brokerAccountId} onChange={(event) => setBrokerAccountId(event.target.value)} className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm" />
                            </div>
                        </div>
                    </div>

                    {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
                    <button
                        onClick={submit}
                        disabled={submitting}
                        className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? 'Submitting...' : 'Submit Provider Application'}
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Provider Benefit</h3>
                        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-[var(--text-secondary)]">
                            <li>Membangun audiens follower di marketplace.</li>
                            <li>Monetisasi signal lewat koin ARRA.</li>
                            <li>Dashboard performa dan riwayat signal.</li>
                        </ul>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Review Checklist</h3>
                        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-[var(--text-secondary)]">
                            <li>Display name valid dan profesional.</li>
                            <li>Bio menjelaskan strategi secara jelas.</li>
                            <li>Broker dan account ID dapat diverifikasi.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
