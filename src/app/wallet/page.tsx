'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

const KOIN_PACKAGES = [
    {
        id: 'pemula',
        koinCount: 50,
        priceKoin: 50000,
        adminFee: 7000,
        totalStr: 'Rp 57.000',
        label: 'Paket Pemula',
        desc: 'Cocok untuk coba-coba buka 5 sinyal'
    },
    {
        id: 'serius',
        koinCount: 250,
        priceKoin: 250000,
        adminFee: 12000,
        totalStr: 'Rp 262.000',
        label: 'Paket Serius',
        desc: 'Lebih hemat admin fee, tahan lama',
        popular: true
    },
    {
        id: 'paus',
        koinCount: 1000,
        priceKoin: 1000000,
        adminFee: 20000,
        totalStr: 'Rp 1.020.000',
        label: 'Paket Paus',
        desc: 'Untuk follower agresif harian',
        popular: false
    }
];

export default function WalletPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [balance, setBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/wallet');
            return;
        }
        if (status === 'authenticated') {
            fetchWalletData();
        }
    }, [status]);

    const fetchWalletData = async () => {
        try {
            const res = await fetch('/api/wallet/balance');
            const data = await res.json();
            if (res.ok) {
                setBalance(data.balance);
                setTransactions(data.transactions || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleTopUp = (pkg: typeof KOIN_PACKAGES[0]) => {
        const text = `Halo Admin ARRA 7! 🚀\n\nSaya ingin Top-Up Saldo Dompet ARRA:\n\n📧 Email: ${session?.user?.email}\n📦 Paket: ${pkg.label} (${pkg.koinCount} Koin)\n💰 Total Transfer: *${pkg.totalStr}*\n\nMohon dikirimkan instruksi QRIS pembayarannya. Terima kasih!`;
        window.open(`https://t.me/arra7trader?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-20">
            <Navbar />

            <div className="pt-28 container mx-auto px-4 max-w-4xl">
                {/* Header & Balance Card */}
                <div className="flex flex-col md:flex-row gap-6 mb-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-20 text-8xl">🪙</div>
                        <h2 className="text-amber-100 font-medium mb-2 relative z-10">Saldo Koin ARRA</h2>
                        <div className="flex items-baseline gap-3 relative z-10">
                            <span className="text-5xl font-black">{balance?.toLocaleString('id-ID') || 0}</span>
                            <span className="text-lg font-semibold text-amber-200">Koin</span>
                        </div>
                        <p className="mt-4 text-sm text-amber-100/80 relative z-10 max-w-xs">
                            Gunakan koin ini untuk membuka sinyal trading eksklusif dari Master Provider di Marketplace.
                        </p>
                    </motion.div>

                    {/* Quick Stats or Withdraw (if Provider) */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex-1 bg-white/5 border border-[var(--border-light)] rounded-3xl p-8 flex flex-col justify-center">
                        <h3 className="text-lg font-bold mb-4">Pencairan Koin (Withdraw)</h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Jika kamu adalah Signal Provider dan memiliki minimal 200 Koin hasil penjualan sinyal, kamu bisa menukarkannya menjadi Uang Tunai. (1 Koin = Rp 1.000)
                        </p>
                        <Link href="/wallet/withdraw">
                            <button className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-[var(--border-light)] rounded-xl font-semibold transition-colors">
                                Tarik Saldo Menjadi Rupiah 💳
                            </button>
                        </Link>
                    </motion.div>
                </div>

                {/* Top Up Packages */}
                <h2 className="text-2xl font-bold mb-6">Top-Up Koin</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {KOIN_PACKAGES.map((pkg, i) => (
                        <motion.div
                            key={pkg.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.1 }}
                            className={`relative bg-[var(--bg-secondary)] border ${pkg.popular ? 'border-amber-500 shadow-lg shadow-amber-500/10' : 'border-[var(--border-light)]'} rounded-2xl p-6 flex flex-col`}
                        >
                            {pkg.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Paling Laris
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-amber-500 mb-1">{pkg.koinCount} Koin</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">{pkg.desc}</p>

                            <div className="mt-auto pt-6 border-t border-[var(--border-light)]">
                                <div className="flex justify-between text-sm text-[var(--text-secondary)] mb-1">
                                    <span>Harga Nominal</span>
                                    <span>Rp {(pkg.koinCount * 1000).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-3 pb-3 border-b border-white/5">
                                    <span>Admin Fee (QRIS)</span>
                                    <span>Rp {pkg.adminFee.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-end mb-6">
                                    <span className="font-semibold text-[var(--text-primary)]">Total Bayar</span>
                                    <span className="text-2xl font-bold">{pkg.totalStr}</span>
                                </div>
                                <button
                                    onClick={() => handleTopUp(pkg)}
                                    className={`w-full py-3 rounded-xl font-bold transition-all ${pkg.popular ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white/10 hover:bg-white/20 text-[var(--text-primary)]'}`}
                                >
                                    Beli via Admin (QRIS)
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* History */}
                <h2 className="text-2xl font-bold mb-6">Riwayat Transaksi</h2>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-2xl overflow-hidden">
                    {transactions.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text-secondary)]">
                            Belum ada riwayat transaksi koin.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-black/20 border-b border-[var(--border-light)] text-sm uppercase tracking-wider text-[var(--text-muted)]">
                                        <th className="px-6 py-4 font-semibold">Tanggal</th>
                                        <th className="px-6 py-4 font-semibold">Tipe</th>
                                        <th className="px-6 py-4 font-semibold">Keterangan</th>
                                        <th className="px-6 py-4 font-semibold text-right">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((trx) => (
                                        <tr key={trx.id} className="border-b border-[var(--border-light)]/50 last:border-0 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                                                {new Date(trx.created_at).toLocaleString('id-ID')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${trx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {trx.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-[var(--text-primary)] max-w-[200px] truncate">
                                                {trx.description || trx.type}
                                            </td>
                                            <td className={`px-6 py-4 font-bold text-right whitespace-nowrap ${trx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {trx.amount > 0 ? '+' : ''}{trx.amount} Koin
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
