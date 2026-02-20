'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function BecomeProviderPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [membership, setMembership] = useState<string | null>(null);
    const [existingProvider, setExistingProvider] = useState<any>(null);
    const [checkingStatus, setCheckingStatus] = useState(true);

    const [formData, setFormData] = useState({
        displayName: '',
        bio: '',
        brokerName: 'Exness',
        brokerAccountId: ''
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (status === 'authenticated') {
            checkProviderStatus();
        }
    }, [status]);

    const checkProviderStatus = async () => {
        try {
            const [memberRes, providerRes] = await Promise.all([
                fetch('/api/user/membership'),
                fetch('/api/copytrade/providers?myProfile=true'),
            ]);
            const memberData = await memberRes.json();
            const providerData = await providerRes.json();
            setMembership(memberData.membership || 'BASIC');
            setExistingProvider(providerData.provider || null);
        } catch (e) {
            console.error(e);
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch('/api/copytrade/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to register');
            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Loading states
    if (status === 'loading' || checkingStatus) {
        return <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>;
    }

    // Already a provider
    if (existingProvider) {
        return (
            <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
                <Navbar />
                <div className="pt-32 pb-20 container mx-auto px-4 flex justify-center">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg text-center">
                        <div className={`w-20 h-20 rounded-full ${existingProvider.is_approved ? 'bg-green-100' : 'bg-yellow-100'} flex items-center justify-center mx-auto mb-6`}>
                            {existingProvider.is_approved
                                ? <span className="text-4xl">✅</span>
                                : <span className="text-4xl">⏳</span>}
                        </div>
                        <h1 className="text-2xl font-bold mb-2">
                            {existingProvider.is_approved ? 'Kamu sudah jadi Provider!' : 'Menunggu Persetujuan Admin'}
                        </h1>
                        <p className="text-gray-500 mb-8">
                            {existingProvider.is_approved
                                ? `Provider "${existingProvider.display_name}" aktif dan bisa ditemukan di marketplace.`
                                : 'Pendaftaranmu sedang ditinjau oleh admin. Biasanya membutuhkan 1×24 jam.'}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Link href="/copytrade/dashboard">
                                <button className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors">
                                    Lihat Dashboard
                                </button>
                            </Link>
                            <Link href="/copytrade">
                                <button className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:border-blue-300 hover:text-blue-600 transition-colors">
                                    Marketplace
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </main>
        );
    }

    // Not PRO/VVIP — show upgrade gate
    if (membership === 'BASIC') {
        return (
            <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
                <Navbar />
                <div className="pt-32 pb-20 container mx-auto px-4 flex justify-center">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg text-center">
                        <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">🔒</span>
                        </div>
                        <h1 className="text-2xl font-bold mb-2">PRO / VVIP Diperlukan</h1>
                        <p className="text-gray-500 mb-4 max-w-sm mx-auto">
                            Untuk mendaftar sebagai Signal Provider, kamu membutuhkan membership <strong>PRO</strong> atau <strong>VVIP</strong>.
                        </p>
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 mb-8">
                            Dengan upgrade ke PRO/VVIP kamu bisa menjadi provider, mendapatkan passive income dari subscription follower, dan komisi profit sharing.
                        </div>
                        <Link href="/pricing">
                            <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                                Upgrade Membership →
                            </button>
                        </Link>
                    </motion.div>
                </div>
            </main>
        );
    }

    // Success state
    if (success) {
        return (
            <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
                <Navbar />
                <div className="pt-32 pb-20 container mx-auto px-4 flex justify-center">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg text-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Pendaftaran Berhasil! 🎉</h1>
                        <p className="text-gray-500 mb-8">Profilmu sedang ditinjau oleh admin. Kamu akan mendapat notifikasi setelah disetujui.</p>
                        <Link href="/copytrade">
                            <button className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors">
                                Kembali ke Marketplace
                            </button>
                        </Link>
                    </motion.div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <Navbar />
            <div className="pt-28 pb-20 container mx-auto px-4 flex justify-center">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-3">
                            {membership} Member
                        </span>
                        <h1 className="text-3xl md:text-4xl font-bold mb-3">
                            Daftar Jadi <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Signal Provider</span>
                        </h1>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Bagikan sinyal trading terbaikmu dan dapatkan <strong className="text-amber-500">Koin ARRA</strong> setiap kali ada follower yang membuka sinyalmu!
                        </p>
                    </div>

                    {/* Benefits */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {[
                            { icon: '🪙', label: 'Dapat Koin', sub: 'Per sinyal yg dibuka' },
                            { icon: '💸', label: 'Tarik Tunai', sub: 'Cairkan koin ke Rupiah' },
                            { icon: '🏆', label: 'Reputasi', sub: 'Bangun track record' },
                        ].map((b, i) => (
                            <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 text-center text-sm">
                                <div className="text-2xl mb-1">{b.icon}</div>
                                <div className="font-semibold text-gray-800 text-xs">{b.label}</div>
                                <div className="text-gray-400 text-[10px]">{b.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Form */}
                    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                        {error && (
                            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Profile */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">📋 Profil Provider</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1.5 font-medium">Display Name *</label>
                                        <input
                                            type="text" required
                                            value={formData.displayName}
                                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                            placeholder="e.g. Master Trader Budi"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1.5 font-medium">Bio / Strategi Trading</label>
                                        <textarea
                                            rows={4}
                                            value={formData.bio}
                                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors resize-none"
                                            placeholder="Jelaskan gaya trading, pair favorit, manajemen risiko kamu..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Broker */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">🏦 Koneksi Broker</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1.5 font-medium">Broker</label>
                                        <select
                                            value={formData.brokerName}
                                            onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                        >
                                            <option>Exness</option>
                                            <option>FBS</option>
                                            <option>XM</option>
                                            <option>IC Markets</option>
                                            <option>OctaFX</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1.5 font-medium">Account ID (Login MT4/5)</label>
                                        <input
                                            type="text" required
                                            value={formData.brokerAccountId}
                                            onChange={(e) => setFormData({ ...formData, brokerAccountId: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                            placeholder="e.g. 8023456"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Monetization Info */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">💸 Ekosistem Koin</h3>
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
                                    <p className="mb-2"><strong>Platform ini menggunakan Pay-Per-Signal!</strong></p>
                                    <ul className="list-disc pl-4 space-y-1 text-xs">
                                        <li>Kamu bisa mengatur harga (Koin) setiap kali mau posting sinyal baru.</li>
                                        <li>Follower membayar Koin untuk melihat Entry, TP, & SL.</li>
                                        <li>Koin akan otomatis masuk ke dompetmu (potongan platform 30%).</li>
                                    </ul>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                            >
                                {isLoading ? 'Mendaftarkan...' : '🚀 Daftar Jadi Provider'}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
