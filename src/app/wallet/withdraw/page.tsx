'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function WithdrawPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        koinAmount: 200,
        bankName: 'BCA',
        accountNumber: '',
        accountName: ''
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/wallet/withdraw');
            return;
        }
        if (status === 'authenticated') {
            fetchBalance();
        }
    }, [status]);

    const fetchBalance = async () => {
        try {
            const res = await fetch('/api/wallet/balance');
            const data = await res.json();
            if (res.ok) {
                setBalance(data.balance || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.koinAmount < 200) {
            setError('Minimal pencairan adalah 200 Koin');
            return;
        }
        if (formData.koinAmount > balance) {
            setError('Saldo Koin tidak mencukupi');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/wallet/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal mengajukan pencairan');

            setSuccess(true);
            setBalance(data.remaining_balance);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Success State
    if (success) {
        return (
            <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
                <Navbar />
                <div className="pt-32 pb-20 container mx-auto px-4 flex justify-center">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg text-center">
                        <div className="w-20 h-20 rounded-full bg-green-500/10 border-green-500/20 flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">💸</span>
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Pencairan Koin Diproses!</h1>
                        <p className="text-[var(--text-secondary)] mb-8 px-4">Admin ARRA 7 telah menerima permintaanmu. Saldo Koin telah dipotong dan rupiah akan ditransfer ke rekeningmu dalam 1x24 jam kerja.</p>

                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-light)] p-5 rounded-2xl text-left mb-8 mx-auto max-w-sm space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Koin Ditarik</span><span className="font-bold">{formData.koinAmount} Koin</span></div>
                            <div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Nilai Tukar</span><span className="font-bold">Rp {(formData.koinAmount * 1000).toLocaleString('id-ID')}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Biaya Transfer Bank</span><span className="text-red-500 font-bold">- Rp 5.000</span></div>
                            <div className="border-t border-[var(--border-light)] mt-2 pt-2 flex justify-between">
                                <span className="font-bold">Total Diterima</span>
                                <span className="font-bold text-green-500 text-lg">Rp {((formData.koinAmount * 1000) - 5000).toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <Link href="/wallet">
                            <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold hover:shadow-lg transition-colors">
                                Kembali ke Dompet
                            </button>
                        </Link>
                    </motion.div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-20">
            <Navbar />

            <div className="pt-28 container mx-auto px-4 flex flex-col items-center">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">

                    <div className="flex items-center gap-4 mb-8">
                        <Link href="/wallet" className="text-slate-400 hover:text-white transition-colors">
                            ← Kembali
                        </Link>
                        <h1 className="text-2xl font-bold">Pencairan Koin</h1>
                    </div>

                    <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl p-6 mb-8 flex justify-between items-center shadow-lg">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Saldo Koin Saat Ini</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-amber-500">{balance.toLocaleString('id-ID')}</span>
                                <span className="text-amber-200/50 font-semibold">Koin</span>
                            </div>
                        </div>
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center relative">
                            <span className="text-3xl relative z-10">💰</span>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-primary)] rounded-3xl p-8 shadow-sm">
                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border-red-500/20 border border-red-100 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-2 font-medium">Berapa koin yang ingin dicairkan?</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={200}
                                        max={Math.max(200, balance)}
                                        value={formData.koinAmount}
                                        onChange={(e) => setFormData({ ...formData, koinAmount: Number(e.target.value) })}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl pl-4 pr-16 py-4 text-[var(--text-primary)] text-xl font-bold focus:outline-none focus:border-amber-500/20 focus:bg-[var(--bg-primary)] transition-colors"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">Koin</span>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-xs text-[var(--text-secondary)]">Minimal 200 Koin</p>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, koinAmount: balance })}
                                        className="text-xs font-bold text-amber-400 hover:text-amber-400"
                                    >
                                        Tarik Semua
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[var(--border-light)]">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">🏦 Rekening Penerima</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Pilih Bank / E-Wallet</label>
                                        <select
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-amber-500/20 focus:bg-[var(--bg-primary)] transition-colors"
                                        >
                                            <option>BCA</option>
                                            <option>Bank Mandiri</option>
                                            <option>BNI</option>
                                            <option>BRI</option>
                                            <option>Jago</option>
                                            <option>BSI</option>
                                            <option>Gopay</option>
                                            <option>OVO</option>
                                            <option>DANA</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Nomor Rekening / HP</label>
                                        <input
                                            type="text" required
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-amber-500/20 focus:bg-[var(--bg-primary)] transition-colors"
                                            placeholder="Misal: 0812345678"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Nama Pemilik Rekening</label>
                                        <input
                                            type="text" required
                                            value={formData.accountName}
                                            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-amber-500/20 focus:bg-[var(--bg-primary)] transition-colors"
                                            placeholder="Sesuai buku tabungan"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-500/10 border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-400 text-sm border border-amber-100 items-start">
                                <span className="text-xl">⚠️</span>
                                <p>Setiap penarikan dikenakan biaya admin antar Bank/SKN sebesar <strong className="font-bold">Rp 5.000</strong> yang dipotong langsung dari total transfer Rupiah Anda.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || balance < 200 || formData.koinAmount > balance}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Memproses...' : `Cairkan Rp ${((formData.koinAmount * 1000) - 5000) > 0 ? ((formData.koinAmount * 1000) - 5000).toLocaleString('id-ID') : 0}`}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
