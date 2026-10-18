'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Interface Data Peserta Leaderboard
interface Participant {
    id: string;
    rank: number;
    name: string;
    accountMasked: string;
    broker: string;
    startBalance: number;
    currentEquity: number;
    netProfit: number;
    roi: number; // in percentage
    winRate: number; // in percentage
    tradesCount: number;
    maxDrawdown: number; // in percentage
    status: 'ACTIVE' | 'DISQUALIFIED';
    disqualificationReason?: string;
    country: string;
}

// Data simulasi awal peserta aktif kompetisi
const INITIAL_PARTICIPANTS: Participant[] = [
    {
        id: 'tc-01',
        rank: 1,
        name: 'Rian Pratama (Sniper Gold)',
        accountMasked: 'MT5-8821***',
        broker: 'FBS (Partner IB)',
        startBalance: 25,
        currentEquity: 88.50,
        netProfit: 63.50,
        roi: 254.0,
        winRate: 81.8,
        tradesCount: 22,
        maxDrawdown: 18.4,
        status: 'ACTIVE',
        country: '🇮🇩'
    },
    {
        id: 'tc-02',
        rank: 2,
        name: 'Dimas Wicaksono',
        accountMasked: 'MT5-9014***',
        broker: 'FBS (Partner IB)',
        startBalance: 50,
        currentEquity: 142.20,
        netProfit: 92.20,
        roi: 184.4,
        winRate: 76.5,
        tradesCount: 19,
        maxDrawdown: 22.1,
        status: 'ACTIVE',
        country: '🇮🇩'
    },
    {
        id: 'tc-03',
        rank: 3,
        name: 'Hendrik Tan',
        accountMasked: 'MT5-7734***',
        broker: 'FBS (Partner IB)',
        startBalance: 100,
        currentEquity: 245.00,
        netProfit: 145.00,
        roi: 145.0,
        winRate: 70.0,
        tradesCount: 28,
        maxDrawdown: 19.8,
        status: 'ACTIVE',
        country: '🇮🇩'
    },
    {
        id: 'tc-04',
        rank: 4,
        name: 'Bagus Setyawan',
        accountMasked: 'MT5-6129***',
        broker: 'FBS (Partner IB)',
        startBalance: 25,
        currentEquity: 57.75,
        netProfit: 32.75,
        roi: 131.0,
        winRate: 68.4,
        tradesCount: 16,
        maxDrawdown: 14.5,
        status: 'ACTIVE',
        country: '🇮🇩'
    },
    {
        id: 'tc-05',
        rank: 5,
        name: 'Ahmad Fauzi (SMC Trader)',
        accountMasked: 'MT5-4491***',
        broker: 'FBS (Partner IB)',
        startBalance: 200,
        currentEquity: 432.00,
        netProfit: 232.00,
        roi: 116.0,
        winRate: 72.2,
        tradesCount: 25,
        maxDrawdown: 25.0,
        status: 'ACTIVE',
        country: '🇮🇩'
    },
    {
        id: 'tc-06',
        rank: 6,
        name: 'Putri Maharani',
        accountMasked: 'MT5-5510***',
        broker: 'FBS (Partner IB)',
        startBalance: 25,
        currentEquity: 51.50,
        netProfit: 26.50,
        roi: 106.0,
        winRate: 64.7,
        tradesCount: 17,
        maxDrawdown: 16.2,
        status: 'ACTIVE',
        country: '🇮🇩'
    },
    {
        id: 'tc-07',
        rank: 7,
        name: 'Reza Aditya',
        accountMasked: 'MT5-3312***',
        broker: 'FBS (Partner IB)',
        startBalance: 50,
        currentEquity: 96.00,
        netProfit: 46.00,
        roi: 92.0,
        winRate: 63.6,
        tradesCount: 14,
        maxDrawdown: 28.5,
        status: 'ACTIVE',
        country: '🇮🇩'
    },
    {
        id: 'tc-08',
        rank: 8,
        name: 'Gunawan S.',
        accountMasked: 'MT5-2299***',
        broker: 'FBS (Partner IB)',
        startBalance: 150,
        currentEquity: 271.50,
        netProfit: 121.50,
        roi: 81.0,
        winRate: 60.0,
        tradesCount: 20,
        maxDrawdown: 31.0,
        status: 'ACTIVE',
        country: '🇮🇩'
    },
    {
        id: 'tc-09',
        rank: 9,
        name: 'Kevin Santoso',
        accountMasked: 'MT5-1845***',
        broker: 'FBS (Partner IB)',
        startBalance: 25,
        currentEquity: 43.25,
        netProfit: 18.25,
        roi: 73.0,
        winRate: 58.8,
        tradesCount: 12,
        maxDrawdown: 21.3,
        status: 'ACTIVE',
        country: '🇮🇩'
    },
    {
        id: 'tc-10',
        rank: 10,
        name: 'Fajar Nugroho (Scalper)',
        accountMasked: 'MT5-9931***',
        broker: 'FBS (Partner IB)',
        startBalance: 300,
        currentEquity: 495.00,
        netProfit: 195.00,
        roi: 65.0,
        winRate: 55.6,
        tradesCount: 36,
        maxDrawdown: 33.5,
        status: 'ACTIVE',
        country: '🇮🇩'
    },
    {
        id: 'tc-99',
        rank: 99,
        name: 'Trader All-in (Gugur)',
        accountMasked: 'MT5-1102***',
        broker: 'FBS (Partner IB)',
        startBalance: 25,
        currentEquity: 11.20,
        netProfit: -13.80,
        roi: -55.2,
        winRate: 33.3,
        tradesCount: 6,
        maxDrawdown: 55.2,
        status: 'DISQUALIFIED',
        disqualificationReason: 'Melewati Batas Maksimal Drawdown (40%)',
        country: '🇮🇩'
    }
];

export default function TradingCompetitionPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'DISQUALIFIED'>('ALL');
    const [sortBy, setSortBy] = useState<'roi' | 'profit' | 'winRate'>('roi');

    // Kalkulator ROI State
    const [calcStartBal, setCalcStartBal] = useState<number>(25);
    const [calcTargetProfit, setCalcTargetProfit] = useState<number>(45);

    // Data Peserta Leaderboard (Dynamic state)
    const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);

    // Modal Pendaftaran State
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [registeredData, setRegisteredData] = useState<any>(null);
    const [regSubmitted, setRegSubmitted] = useState(false);
    const [regForm, setRegForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        fbsAccountNumber: '',
        fbsAccountType: 'Standard',
        depositAmount: 25
    });

    // Load pendaftaran lokal saat pertama kali dimuat
    useEffect(() => {
        try {
            const saved = localStorage.getItem('pica_competition_my_registrations');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setParticipants(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const uniqueNew = parsed.filter((p: any) => !existingIds.has(p.id));
                        return [...uniqueNew, ...prev];
                    });
                }
            }
        } catch (e) {
            console.error('Error loading local registrations:', e);
        }
    }, []);

    // Hitung Mundur Periode Kompetisi 1 Bulan (Mulai Besok 19 Okt - Berakhir 19 Nov 2026)
    const [timeLeft, setTimeLeft] = useState({
        days: 29,
        hours: 23,
        minutes: 59,
        seconds: 45
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) {
                    return { ...prev, seconds: prev.seconds - 1 };
                } else if (prev.minutes > 0) {
                    return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                } else if (prev.hours > 0) {
                    return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
                } else if (prev.days > 0) {
                    return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
                }
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Filter & Sort Leaderboard
    const filteredParticipants = useMemo(() => {
        return participants
            .filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.accountMasked.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesFilter = filterStatus === 'ALL' ? true : p.status === filterStatus;
                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => {
                // Yang diskualifikasi selalu di paling bawah
                if (a.status === 'DISQUALIFIED' && b.status !== 'DISQUALIFIED') return 1;
                if (b.status === 'DISQUALIFIED' && a.status !== 'DISQUALIFIED') return -1;

                if (sortBy === 'roi') return b.roi - a.roi;
                if (sortBy === 'profit') return b.netProfit - a.netProfit;
                if (sortBy === 'winRate') return b.winRate - a.winRate;
                return 0;
            });
    }, [participants, searchQuery, filterStatus, sortBy]);

    // Kalkulasi ROI
    const calculatedRoi = useMemo(() => {
        if (!calcStartBal || calcStartBal <= 0) return 0;
        return ((calcTargetProfit / calcStartBal) * 100);
    }, [calcStartBal, calcTargetProfit]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch('/api/kompetisi/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(regForm)
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Gagal mengirim pendaftaran.');
            }

            // Tambahkan langsung peserta baru ke tampilan leaderboard live
            const newParticipant: Participant = {
                id: data.participant?.id || `user-${Date.now()}`,
                rank: participants.length + 1,
                name: `${regForm.fullName} (Anda)`,
                accountMasked: `FBS-${regForm.fbsAccountNumber.substring(0, 4)}***`,
                broker: `FBS (${regForm.fbsAccountType})`,
                startBalance: Number(regForm.depositAmount),
                currentEquity: Number(regForm.depositAmount),
                netProfit: 0,
                roi: 0,
                winRate: 0,
                tradesCount: 0,
                maxDrawdown: 0,
                status: 'ACTIVE',
                country: '🇮🇩'
            };

            setParticipants(prev => [newParticipant, ...prev]);

            // Simpan ke localStorage agar tidak hilang saat refresh
            try {
                const existing = JSON.parse(localStorage.getItem('pica_competition_my_registrations') || '[]');
                localStorage.setItem('pica_competition_my_registrations', JSON.stringify([newParticipant, ...existing]));
            } catch (storageErr) {
                console.error(storageErr);
            }

            setRegisteredData(data.participant);
            setRegSubmitted(true);
        } catch (err: any) {
            setSubmitError(err.message || 'Terjadi kesalahan sistem saat mengirim pendaftaran.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pt-24 pb-20 font-sans selection:bg-amber-200">
            {/* Top Announcement Bar */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6">
                <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-emerald-600 rounded-2xl p-3 sm:p-4 text-white shadow-lg shadow-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-3 border border-amber-400/40">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                        <span className="text-2xl sm:text-3xl">🏆</span>
                        <div>
                            <p className="font-extrabold text-sm sm:text-base leading-tight">
                                PICA × FBS 1-MONTH TRADING CHAMPIONSHIP (19 OKTOBER - 19 NOVEMBER 2026)
                            </p>
                            <p className="text-xs text-amber-100 font-medium">
                                Mulai Besok! Total Hadiah <strong className="text-white underline">$1,500 USD Cash Murni</strong> (Juara 1: $1,000 | Juara 2: $500). Minimal Deposit $25 di Broker FBS!
                            </p>
                        </div>
                    </div>
                    <a
                        href="https://lynk.id/arra7"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 bg-white text-amber-900 hover:bg-amber-50 font-black text-xs px-4 py-2 rounded-xl shadow-md transition-transform active:scale-95 inline-flex items-center gap-1.5"
                    >
                        <span>Daftar FBS via Lynk.id</span>
                        <span>&rarr;</span>
                    </a>
                </div>
            </div>

            {/* HERO SECTION */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 text-center mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs uppercase tracking-wider mb-4 shadow-xs"
                >
                    <span className="animate-pulse">⚡</span>
                    <span>FBS 1-Month Trading Championship</span>
                    <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold">MULAI BESOK</span>
                </motion.div>

                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none mb-4">
                    Kompetisi Trading 1 Bulan: Rebut <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-yellow-600 to-emerald-600">Hadiah Tunai $1,000 USD!</span>
                </h1>

                <p className="text-slate-600 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
                    Ajang pembuktian konsistensi &amp; keahlian trading selama <strong>1 Bulan Penuh (30 Hari)</strong>. Modal mulai <strong>$25 USD di Broker FBS</strong>, penilaian murni berdasarkan <strong>Persentase ROI %</strong>. Verifikasi instan melalui Dashboard IB FBS tanpa ribet!
                </p>

                {/* Countdown Timer */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-xl shadow-slate-200/50 max-w-xl mx-auto mb-8">
                    <p className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-3">
                        ⏳ SISA WAKTU PERIODE KOMPETISI (1 BULAN)
                    </p>
                    <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                            <span className="text-2xl sm:text-4xl font-black text-slate-800 font-mono block">{timeLeft.days}</span>
                            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase">Hari</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                            <span className="text-2xl sm:text-4xl font-black text-slate-800 font-mono block">{String(timeLeft.hours).padStart(2, '0')}</span>
                            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase">Jam</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                            <span className="text-2xl sm:text-4xl font-black text-slate-800 font-mono block">{String(timeLeft.minutes).padStart(2, '0')}</span>
                            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase">Menit</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                            <span className="text-2xl sm:text-4xl font-black text-amber-700 font-mono block">{String(timeLeft.seconds).padStart(2, '0')}</span>
                            <span className="text-[10px] sm:text-xs text-amber-600 font-semibold uppercase">Detik</span>
                        </div>
                    </div>
                </div>

                {/* Action CTA Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                    <a
                        href="https://lynk.id/arra7"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 inline-flex items-center gap-2 cursor-pointer"
                    >
                        <span>🚀</span>
                        <span>Daftar via Lynk.id ($25 Min)</span>
                        <span>&rarr;</span>
                    </a>
                    <button
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-sm sm:text-base shadow-xs transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer"
                    >
                        <span>📝</span>
                        <span>Kirim ID Akun ke Leaderboard</span>
                    </button>
                    <a
                        href="#aturan"
                        className="px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all inline-flex items-center gap-1.5"
                    >
                        <span>📖</span>
                        <span>Baca Aturan Resmi</span>
                    </a>
                </div>
            </section>

            {/* PRIZE PODIUM SECTION (JUARA 1 & 2) */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
                <div className="text-center mb-10">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                        STRUKTUR HADIAH RESMI
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                        Penghargaan Khusus 2 Trader Terbaik
                    </h2>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1">
                        Hadiah langsung dikirim dalam bentuk tunai / USDT / Transfer Bank setelah periode berakhir.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {/* JUARA 1 - GOLD */}
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="relative bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 rounded-3xl p-6 sm:p-8 border-2 border-amber-400 shadow-xl shadow-amber-500/10 flex flex-col justify-between overflow-hidden"
                    >
                        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute top-4 right-4 bg-amber-500 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-xs">
                            🥇 JUARA 1 (CHAMPION)
                        </div>

                        <div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center text-3xl shadow-md mb-4">
                                🏆
                            </div>
                            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                                Hadiah Juara Pertama
                            </span>
                            <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight my-2">
                                $1,000 <span className="text-lg font-bold text-amber-600">USD</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed mb-6">
                                Diberikan kepada peserta dengan Return on Investment (ROI %) tertinggi dan lolos seluruh verifikasi drawdown &amp; transaksi.
                            </p>

                            <div className="space-y-2.5 border-t border-amber-100 pt-4 text-xs font-semibold text-slate-700">
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold text-sm">💵</span>
                                    <span><strong>Uang Tunai $1,000 USD</strong> (Transfer Bank / USDT TRC20)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                                    <span>100% Hadiah Uang Tunai Murni Tanpa Potongan</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                                    <span>Pencairan Maksimal 3×24 Jam Setelah Verifikasi Selesai</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                                    <span>Bukti Transfer Resmi Dipublikasikan Transparan</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4">
                            <a
                                href="https://lynk.id/arra7"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full block text-center py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                            >
                                Daftar Sekarang &rarr;
                            </a>
                        </div>
                    </motion.div>

                    {/* JUARA 2 - SILVER */}
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="relative bg-gradient-to-b from-slate-50/80 via-white to-slate-50/30 rounded-3xl p-6 sm:p-8 border-2 border-slate-300 shadow-xl shadow-slate-200/50 flex flex-col justify-between overflow-hidden"
                    >
                        <div className="absolute -top-12 -right-12 w-36 h-36 bg-slate-300/30 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute top-4 right-4 bg-slate-700 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-xs">
                            🥈 JUARA 2 (RUNNER-UP)
                        </div>

                        <div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-600 text-white flex items-center justify-center text-3xl shadow-md mb-4">
                                🥈
                            </div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Hadiah Juara Kedua
                            </span>
                            <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight my-2">
                                $500 <span className="text-lg font-bold text-slate-600">USD</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed mb-6">
                                Diberikan kepada peserta urutan ke-2 dengan persentase ROI tertinggi yang memenuhi kualifikasi aturan kompetisi.
                            </p>

                            <div className="space-y-2.5 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-700">
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold text-sm">💵</span>
                                    <span><strong>Uang Tunai $500 USD</strong> (Transfer Bank / USDT TRC20)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                                    <span>100% Hadiah Uang Tunai Murni Tanpa Potongan</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                                    <span>Pencairan Maksimal 3×24 Jam Setelah Verifikasi Selesai</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                                    <span>Bukti Transfer Resmi Dipublikasikan Transparan</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4">
                            <a
                                href="https://lynk.id/arra7"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full block text-center py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                            >
                                Rebut Peringkat 2 &rarr;
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* CARA MENANG DENGAN SALDO BERBEDA (EDUKASI FAIR SCORING) */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
                <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10 max-w-3xl">
                        <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider inline-block mb-3">
                            💡 Mengapa Saldo $25 Bisa Menang Melawan Saldo $500?
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-4">
                            Sistem Penilaian Adil: <span className="text-amber-400">Return on Investment (ROI %)</span>
                        </h2>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                            Banyak trader pemula mengira kompetisi trading hanya bisa dimenangkan oleh trader bermodal raksasa. Di <strong>PICA Trading Championship</strong>, pemenang ditentukan murni dari <strong>persentase pelipatgandaan modal</strong>, bukan nominal dolar!
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/10 mb-6">
                            <div className="border-b sm:border-b-0 sm:border-r border-white/10 pb-4 sm:pb-0 sm:pr-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-amber-400">Peserta A (Modal Kecil)</span>
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">MENANG 🥇</span>
                                </div>
                                <ul className="text-xs space-y-1.5 text-slate-200">
                                    <li>• Modal Awal: <strong>$25</strong></li>
                                    <li>• Keuntungan: <strong>+$50</strong></li>
                                    <li>• Saldo Akhir: $75</li>
                                    <li className="text-sm font-extrabold text-emerald-400 mt-2">
                                        📈 ROI = +200%
                                    </li>
                                </ul>
                            </div>

                            <div className="pt-4 sm:pt-0 sm:pl-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-300">Peserta B (Modal Besar)</span>
                                    <span className="text-[10px] bg-slate-500/30 text-slate-300 px-2 py-0.5 rounded font-bold">POSISI BAWAH</span>
                                </div>
                                <ul className="text-xs space-y-1.5 text-slate-300">
                                    <li>• Modal Awal: <strong>$500</strong></li>
                                    <li>• Keuntungan: <strong>+$100</strong> (Nominal lebih besar)</li>
                                    <li>• Saldo Akhir: $600</li>
                                    <li className="text-sm font-extrabold text-amber-300 mt-2">
                                        📊 ROI = +20%
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <p className="text-xs text-blue-200/90 italic">
                            *Dengan sistem ini, trader dengan modal minimal $25 yang disiplin memiliki peluang mutlak untuk membawa pulang hadiah utama $1,000 USD!
                        </p>
                    </div>
                </div>
            </section>

            {/* LIVE LEADERBOARD SECTION */}
            <section id="leaderboard" className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">📊</span>
                                <h2 className="text-2xl font-black text-slate-900">
                                    Live Leaderboard Klasemen
                                </h2>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    REALTIME
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Peringkat diperbarui secara berkala berdasarkan kalkulasi persentase ROI &amp; audit resiko.
                            </p>
                        </div>

                        {/* Search and Filters */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Cari trader / akun..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white w-44 sm:w-56 transition-all"
                                />
                                <span className="absolute left-2.5 top-2.5 text-xs text-slate-400">🔍</span>
                            </div>

                            <select
                                value={sortBy}
                                onChange={(e: any) => setSortBy(e.target.value)}
                                className="text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-amber-500 font-semibold text-slate-700 cursor-pointer"
                            >
                                <option value="roi">Urutkan: ROI Terbesar</option>
                                <option value="profit">Urutkan: Net Profit ($)</option>
                                <option value="winRate">Urutkan: Win Rate (%)</option>
                            </select>

                            <select
                                value={filterStatus}
                                onChange={(e: any) => setFilterStatus(e.target.value)}
                                className="text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-amber-500 font-semibold text-slate-700 cursor-pointer"
                            >
                                <option value="ALL">Semua Status</option>
                                <option value="ACTIVE">Hanya Aktif</option>
                                <option value="DISQUALIFIED">Diskualifikasi</option>
                            </select>
                        </div>
                    </div>

                    {/* Table Leaderboard */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                                    <th className="py-3 px-3">Rank</th>
                                    <th className="py-3 px-3">Peserta &amp; Akun</th>
                                    <th className="py-3 px-3 text-right">Modal Awal</th>
                                    <th className="py-3 px-3 text-right">Equity Terkini</th>
                                    <th className="py-3 px-3 text-right">Profit ($)</th>
                                    <th className="py-3 px-3 text-right">ROI (%)</th>
                                    <th className="py-3 px-3 text-center">Trades / Win Rate</th>
                                    <th className="py-3 px-3 text-right">Max DD</th>
                                    <th className="py-3 px-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredParticipants.map((p, idx) => {
                                    const isChampion = p.rank === 1 && p.status === 'ACTIVE';
                                    const isRunnerUp = p.rank === 2 && p.status === 'ACTIVE';
                                    const isDisqualified = p.status === 'DISQUALIFIED';

                                    return (
                                        <tr
                                            key={p.id}
                                            className={`transition-colors hover:bg-slate-50/80 ${
                                                isChampion ? 'bg-amber-50/40 font-semibold' :
                                                isRunnerUp ? 'bg-slate-50/70 font-semibold' :
                                                isDisqualified ? 'bg-rose-50/20 text-slate-400 opacity-75' : ''
                                            }`}
                                        >
                                            {/* Rank Badge */}
                                            <td className="py-3.5 px-3">
                                                {isChampion ? (
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-extrabold shadow-xs">
                                                        🥇 1
                                                    </span>
                                                ) : isRunnerUp ? (
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-300 text-slate-800 font-extrabold shadow-xs">
                                                        🥈 2
                                                    </span>
                                                ) : p.rank === 3 ? (
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-700/20 text-amber-900 font-bold">
                                                        🥉 3
                                                    </span>
                                                ) : isDisqualified ? (
                                                    <span className="text-rose-500 font-bold px-1.5 py-0.5 bg-rose-50 rounded">
                                                        ✕
                                                    </span>
                                                ) : (
                                                    <span className="font-bold text-slate-500 pl-2">
                                                        #{p.rank}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Name & Account */}
                                            <td className="py-3.5 px-3">
                                                <div className="flex items-center gap-2">
                                                    <span>{p.country}</span>
                                                    <div>
                                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                            <span>{p.name}</span>
                                                            {isChampion && (
                                                                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-extrabold">
                                                                    POTENSI $1,000
                                                                </span>
                                                            )}
                                                            {isRunnerUp && (
                                                                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-extrabold">
                                                                    POTENSI $500
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {p.accountMasked} • {p.broker}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Start Balance */}
                                            <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-600">
                                                ${p.startBalance.toFixed(2)}
                                            </td>

                                            {/* Current Equity */}
                                            <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800">
                                                ${p.currentEquity.toFixed(2)}
                                            </td>

                                            {/* Net Profit */}
                                            <td className="py-3.5 px-3 text-right font-mono font-bold">
                                                <span className={p.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                                    {p.netProfit >= 0 ? `+$${p.netProfit.toFixed(2)}` : `-$${Math.abs(p.netProfit).toFixed(2)}`}
                                                </span>
                                            </td>

                                            {/* ROI */}
                                            <td className="py-3.5 px-3 text-right font-mono">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                                                    isDisqualified ? 'bg-slate-100 text-slate-400' :
                                                    p.roi >= 100 ? 'bg-emerald-100 text-emerald-800 font-extrabold' :
                                                    p.roi >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                                }`}>
                                                    {p.roi >= 0 ? `+${p.roi.toFixed(1)}%` : `${p.roi.toFixed(1)}%`}
                                                </span>
                                            </td>

                                            {/* Trades / Win Rate */}
                                            <td className="py-3.5 px-3 text-center">
                                                <span className="text-[11px] font-bold text-slate-700">{p.tradesCount} trades</span>
                                                <span className="text-[10px] text-slate-400 block">({p.winRate}% WR)</span>
                                            </td>

                                            {/* Drawdown */}
                                            <td className="py-3.5 px-3 text-right font-mono">
                                                <span className={`text-[11px] font-bold ${
                                                    p.maxDrawdown > 40 ? 'text-rose-600 font-black' :
                                                    p.maxDrawdown > 30 ? 'text-amber-600' : 'text-slate-600'
                                                }`}>
                                                    {p.maxDrawdown.toFixed(1)}%
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="py-3.5 px-3 text-center">
                                                {p.status === 'ACTIVE' ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span
                                                        title={p.disqualificationReason}
                                                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
                                                    >
                                                        Gugur (DD &gt; 40%)
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom CTA on Leaderboard */}
                    <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                        <p>
                            Menampilkan <strong>{filteredParticipants.length}</strong> peserta terverifikasi. Ingin nama Anda tercantum di sini?
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsRegisterModalOpen(true)}
                                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer"
                            >
                                Kirim Data Akun Saya &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* INTERACTIVE ROI SIMULATOR / CALCULATOR */}
            <section id="kalkulator" className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-3xl p-6 sm:p-10 border border-amber-200 shadow-lg">
                    <div className="max-w-3xl mb-8">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                            🧮 SIMULASI SKOR
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                            Kalkulator Persentase Kemenangan (ROI)
                        </h2>
                        <p className="text-slate-600 text-xs sm:text-sm mt-1">
                            Uji sendiri peluang Anda. Masukkan saldo deposit rencana Anda (minimal $25) dan target profit untuk melihat ROI yang akan Anda peroleh di papan klasemen!
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        {/* Input 1: Modal Awal */}
                        <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs">
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                                1. Saldo Modal Awal ($)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    min="25"
                                    step="5"
                                    value={calcStartBal}
                                    onChange={(e) => setCalcStartBal(Math.max(1, Number(e.target.value)))}
                                    className="w-full pl-8 pr-3 py-2.5 text-lg font-black text-slate-800 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:border-amber-500"
                                />
                            </div>
                            <span className="text-[11px] text-slate-400 mt-2 block">
                                Minimal deposit: $25 USD
                            </span>
                        </div>

                        {/* Input 2: Target Profit */}
                        <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs">
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                                2. Target Profit Bersih ($)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    step="5"
                                    value={calcTargetProfit}
                                    onChange={(e) => setCalcTargetProfit(Number(e.target.value))}
                                    className="w-full pl-8 pr-3 py-2.5 text-lg font-black text-emerald-600 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:border-amber-500"
                                />
                            </div>
                            <span className="text-[11px] text-slate-400 mt-2 block">
                                Saldo akhir perkiraan: ${(calcStartBal + calcTargetProfit).toFixed(2)}
                            </span>
                        </div>

                        {/* Result: Output ROI */}
                        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 text-center flex flex-col justify-center">
                            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 mb-1">
                                Hasil Perolehan ROI
                            </span>
                            <div className="text-3xl sm:text-4xl font-black text-white font-mono my-1">
                                {calculatedRoi >= 0 ? `+${calculatedRoi.toFixed(1)}%` : `${calculatedRoi.toFixed(1)}%`}
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1">
                                {calculatedRoi >= 254 ? (
                                    <span className="text-amber-400 font-bold">🥇 Berpotensi Rebut Juara 1 ($1,000)!</span>
                                ) : calculatedRoi >= 184 ? (
                                    <span className="text-slate-300 font-bold">🥈 Berpotensi Rebut Juara 2 ($500)!</span>
                                ) : calculatedRoi >= 100 ? (
                                    <span className="text-emerald-400 font-bold">🔥 Masuk Top 6 Klasemen Sementara</span>
                                ) : (
                                    <span>Tingkatkan profit untuk menembus 2 Besar!</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CARA DAFTAR & BERGABUNG (4 LANGKAH MUDAH) */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
                <div className="text-center mb-10">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500 bg-slate-200/60 px-3 py-1 rounded-full">
                        LANGKAH BERGABUNG
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                        Cara Mudah Mengikuti Kompetisi
                    </h2>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1">
                        Ikuti 4 langkah cepat di bawah ini untuk mengunci posisi Anda di turnamen.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-black text-lg flex items-center justify-center mb-4">
                            1
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mb-2">Daftar di Lynk.id</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Buka halaman resmi <a href="https://lynk.id/arra7" target="_blank" rel="noopener noreferrer" className="text-amber-600 font-bold underline">https://lynk.id/arra7</a> dan pilih menu pendaftaran kompetisi trading.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-black text-lg flex items-center justify-center mb-4">
                            2
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mb-2">Deposit Min. $25 USD</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Lakukan deposit akun trading minimal $25 USD. Anda bebas menyetor nominal lebih tinggi sesuai kesiapan modal Anda.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-black text-lg flex items-center justify-center mb-4">
                            3
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mb-2">Kirim ID Akun ke Admin</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Kirimkan nomor akun MT5 Anda ke admin melalui form registrasi atau WhatsApp untuk disambungkan ke Live Leaderboard.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-black text-lg flex items-center justify-center mb-4">
                            4
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mb-2">Trading &amp; Raih Hadiah</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Mulai trading dengan strategi andalan Anda. Jaga drawdown di bawah 40% dan raih posisi 1 atau 2 teratas!
                        </p>
                    </div>
                </div>
            </section>

            {/* SISTEM MONITORING & PENGAWASAN KOMPETISI */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
                <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
                    <div className="max-w-3xl mb-8">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                            🔍 TRANSPARANSI &amp; AUDIT SISTEM FBS
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black mt-2">
                            Bagaimana Cara Panitia Memantau Akun Peserta di FBS?
                        </h2>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1">
                            Karena Anda mendaftar melalui tautan kemitraan resmi ARRA 7, sistem menggunakan integrasi langsung dengan portal broker:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Cara Utama: Dashboard IB FBS */}
                        <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-5 hover:bg-emerald-500/15 transition-colors relative">
                            <span className="absolute top-3 right-3 text-[10px] font-extrabold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase">
                                METODE UTAMA
                            </span>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl mb-3">
                                🏢
                            </div>
                            <h3 className="font-bold text-sm text-white mb-2">1. Dashboard Mitra / IB Broker FBS</h3>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Peserta mendaftar melalui <a href="https://lynk.id/arra7" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline font-semibold">https://lynk.id/arra7</a>. Nomor akun FBS Anda otomatis terhubung ke sistem IB ARRA 7. Panitia langsung memvalidasi deposit awal $25, equity live, dan histori closed trade dari server resmi FBS tanpa repot.
                            </p>
                        </div>

                        {/* Cara 2 */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl mb-3">
                                🔐
                            </div>
                            <h3 className="font-bold text-sm text-white mb-2">2. Password Investor Read-Only (Opsional)</h3>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Jika diperlukan audit tambahan saat penentuan Juara 1 dan 2, peserta dapat menyertakan Password Investor MT4/MT5. Hak akses ini 100% aman (hanya bisa melihat grafik dan riwayat, tidak bisa menyentuh order atau penarikan saldo).
                            </p>
                        </div>

                        {/* Cara 3 */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl mb-3">
                                📈
                            </div>
                            <h3 className="font-bold text-sm text-white mb-2">3. Audit Myfxbook Independen</h3>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Peserta juga dapat menautkan akun FBS mereka ke Myfxbook untuk verifikasi publik independen, yang mencatat persentase keuntungan (Gain %), profit factor, dan kurva drawdown secara transparan.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ATURAN RESMI KOMPETISI (OFFICIAL RULEBOOK & TERMS) */}
            <section id="aturan" className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl">
                    <div className="border-b border-slate-200 pb-4 mb-6">
                        <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            TERMS &amp; CONDITIONS
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                            Aturan Resmi &amp; Regulasi Kompetisi Trading
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1">
                            Harap membaca seluruh klausul aturan dengan seksama demi menjamin kompetisi yang adil, transparan, dan profesional.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
                        {/* Pasal 1 */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                            <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">1</span>
                                Ketentuan Pendaftaran &amp; Saldo Awal
                            </h4>
                            <p className="leading-relaxed">
                                Peserta wajib mendaftar melalui tautan afiliasi resmi di <a href="https://lynk.id/arra7" target="_blank" rel="noopener noreferrer" className="text-amber-600 underline font-bold">https://lynk.id/arra7</a>. Saldo deposit awal minimal adalah <strong>$25 USD</strong>. Peserta diperkenankan mendepositkan nominal lebih besar (misal $50, $100, $500), namun penilaian tetap berbasis persentase keuntungan.
                            </p>
                        </div>

                        {/* Pasal 2 */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                            <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">2</span>
                                Rumus Penentuan Pemenang (ROI %)
                            </h4>
                            <p className="leading-relaxed">
                                Penentuan peringkat 1 dan 2 didasarkan pada <strong>Return on Investment (ROI)</strong> dengan rumus resmi:
                            </p>
                            <div className="bg-white p-2 rounded-lg font-mono text-center font-bold text-slate-800 my-2 border border-slate-200">
                                ROI (%) = (Profit Bersih / Total Deposit) × 100%
                            </div>
                            <p className="leading-relaxed text-[11px] text-slate-500">
                                Jika terjadi perolehan ROI yang persis sama, penentuan pemenang diutamakan pada peserta dengan Maximum Drawdown terkecil.
                            </p>
                        </div>

                        {/* Pasal 3 */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                            <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">3</span>
                                Batas Resiko (Maksimal Drawdown 40%)
                            </h4>
                            <p className="leading-relaxed">
                                Untuk menjaga standar manajemen risiko dan mencegah praktek judi serampangan (*all-in/reckless gambling*), akun yang mengalami <strong>penurunan saldo (*drawdown*) melebihi 40%</strong> dari titik saldo tertinggi otomatis terdiskualifikasi dari perebutan hadiah.
                            </p>
                        </div>

                        {/* Pasal 4 */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                            <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">4</span>
                                Syarat Minimum Aktivitas (10 Closed Trades)
                            </h4>
                            <p className="leading-relaxed">
                                Peserta wajib menyelesaikan minimal <strong>10 kali transaksi tertutup (*closed trades*)</strong> selama periode kompetisi. Hal ini untuk memastikan peserta membuktikan konsistensi trading aktif, bukan sekadar melakukan 1 transaksi untung-untungan lalu pasif hingga akhir periode.
                            </p>
                        </div>

                        {/* Pasal 5 */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                            <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">5</span>
                                Instrumen Trading &amp; Gaya Bebas
                            </h4>
                            <p className="leading-relaxed">
                                Peserta diperbolehkan mentradingkan seluruh instrumen yang tersedia di broker (Gold/XAUUSD, Forex Major/Cross, Crypto, Indeks). Diperbolehkan menggunakan teknik manual, Scalping, Day Trading, Swing Trading, maupun Expert Advisor (EA/Robot).
                            </p>
                        </div>

                        {/* Pasal 6 */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                            <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">6</span>
                                Larangan Kecurangan &amp; Integritas Fair Play
                            </h4>
                            <p className="leading-relaxed">
                                Dilarang keras melakukan praktek curang seperti:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px] text-slate-600">
                                <li>Multi-account opposite hedging (membuka Buy di Akun 1 dan Sell di Akun 2 secara berlawanan).</li>
                                <li>Penyalahgunaan latency arbitrage atau eksploitasi bug harga broker.</li>
                                <li>Setiap pelanggaran akan langsung menggugurkan hak kepesertaan.</li>
                            </ul>
                        </div>

                        {/* Pasal 7 */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                            <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">7</span>
                                Ketentuan Penarikan (Withdrawal) Dana
                            </h4>
                            <p className="leading-relaxed">
                                Peserta berhak menarik (*withdraw*) modal atau profit mereka kapan saja dari broker. Namun, penarikan dana di tengah kompetisi akan dihitung mengurangi equity akhir dan mempengaruhi kalkulasi ROI sesuai standar Time-Weighted Return resmi.
                            </p>
                        </div>

                        {/* Pasal 8 */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                            <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">8</span>
                                Verifikasi &amp; Distribusi Hadiah
                            </h4>
                            <p className="leading-relaxed">
                                Pemenang Juara 1 ($1,000) dan Juara 2 ($500) wajib memberikan password investor / statement resmi untuk diverifikasi oleh tim juri ARRA 7. Hadiah dicairkan maksimal dalam 3×24 jam kerja melalui Transfer Bank Indonesia atau USDT (TRC-20/BEP-20) tanpa potongan biaya.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ SECTION */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-16">
                <div className="text-center mb-8">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500 bg-slate-200/60 px-3 py-1 rounded-full">
                        FAQ
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 mt-2">
                        Pertanyaan yang Sering Diajukan
                    </h2>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                    <details className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs open:bg-slate-50/50">
                        <summary className="font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between">
                            <span>Apakah saya harus deposit lebih dari $25 untuk bisa menang?</span>
                            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <p className="text-slate-600 mt-3 leading-relaxed text-xs">
                            Tidak. Pemenang dinilai dari persentase keuntungan (ROI %). Trader dengan deposit $25 yang berhasil melipatgandakan modal menjadi $75 (ROI +200%) akan berada di atas trader dengan deposit $500 yang menghasilkan profit $100 (ROI +20%).
                        </p>
                    </details>

                    <details className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs open:bg-slate-50/50">
                        <summary className="font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between">
                            <span>Bagaimana cara mendaftarkan nomor akun saya ke Leaderboard?</span>
                            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <p className="text-slate-600 mt-3 leading-relaxed text-xs">
                            Setelah melakukan pendaftaran melalui <a href="https://lynk.id/arra7" target="_blank" rel="noopener noreferrer" className="text-amber-600 underline font-bold">https://lynk.id/arra7</a> dan mendepositkan minimal $25, klik tombol "Kirim ID Akun ke Leaderboard" di website ini atau hubungi WhatsApp admin untuk verifikasi nama dan alias Anda di klasemen.
                        </p>
                    </details>

                    <details className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs open:bg-slate-50/50">
                        <summary className="font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between">
                            <span>Berapa lama periode kompetisi berlangsung?</span>
                            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <p className="text-slate-600 mt-3 leading-relaxed text-xs">
                            Kompetisi berlangsung selama 30 hari kalender. Anda dapat memantau sisa waktu secara langsung melalui timer hitung mundur di bagian atas halaman ini.
                        </p>
                    </details>

                    <details className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs open:bg-slate-50/50">
                        <summary className="font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between">
                            <span>Bagaimana hadiah Juara 1 dan Juara 2 dibayarkan?</span>
                            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <p className="text-slate-600 mt-3 leading-relaxed text-xs">
                            Hadiah \$1,000 untuk Juara 1 dan \$500 untuk Juara 2 akan dibayarkan secara langsung melalui rekening Bank BCA/Mandiri/BRI atau transfer USDT (kripto) dalam kurun waktu 3×24 jam setelah sesi audit selesai.
                        </p>
                    </details>
                </div>
            </section>

            {/* BOTTOM CALL TO ACTION */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-2xl sm:text-4xl font-black mb-3">
                            Siap Membuktikan Diri sebagai Trader Terbaik?
                        </h2>
                        <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto mb-8">
                            Daftarkan akun trading Anda sekarang dengan modal mulai dari $25 USD dan menangkan total hadiah $1,500 USD!
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <a
                                href="https://lynk.id/arra7"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/30 transition-transform active:scale-95 inline-flex items-center gap-2"
                            >
                                <span>🏆</span>
                                <span>Daftar Kompetisi via Lynk.id</span>
                                <span>&rarr;</span>
                            </a>
                            <button
                                onClick={() => setIsRegisterModalOpen(true)}
                                className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all active:scale-95 cursor-pointer"
                            >
                                Submit ID Akun
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* MODAL REGISTRASI / SUBMIT AKUN */}
            <AnimatePresence>
                {isRegisterModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative"
                        >
                            <button
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm cursor-pointer"
                            >
                                ✕
                            </button>

                            <div className="mb-6">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                                    VERIFIKASI LEADERBOARD
                                </span>
                                <h3 className="text-xl font-black text-slate-900 mt-1">
                                    Daftarkan Akun Trading Anda
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Pastikan Anda sudah mendaftar via Lynk.id (<a href="https://lynk.id/arra7" target="_blank" rel="noopener noreferrer" className="text-amber-600 underline font-bold">https://lynk.id/arra7</a>) dan deposit minimal $25.
                                </p>
                            </div>

                            {regSubmitted ? (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-md">
                                        ✓
                                    </div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                                        PENDAFTARAN BERHASIL DITERIMA
                                    </span>
                                    <h4 className="font-black text-slate-900 text-lg mt-3">Selamat, Akun Anda Terdaftar!</h4>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                        Akun FBS <strong>#{registeredData?.fbsAccountNumber || regForm.fbsAccountNumber}</strong> berhasil dimasukkan ke sistem turnamen ARRA 7.
                                    </p>

                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 my-4 text-left text-xs space-y-2">
                                        <div className="flex justify-between items-center text-slate-600">
                                            <span>Nama Peserta:</span>
                                            <strong className="text-slate-900">{regForm.fullName}</strong>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-600">
                                            <span>Tipe Akun:</span>
                                            <span className="font-semibold text-slate-800">FBS {regForm.fbsAccountType}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-600">
                                            <span>Modal Deposit:</span>
                                            <strong className="text-emerald-600 font-mono">${regForm.depositAmount} USD</strong>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-600 border-t border-slate-200 pt-2">
                                            <span>Status Verifikasi:</span>
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                TERHUBUNG KE LEADERBOARD
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-[11px] text-slate-500 mb-5 leading-relaxed">
                                        Akun Anda sekarang sudah aktif dan tampil di <strong>Live Leaderboard</strong> di bawah. Siapkan strategi Anda untuk bertanding mulai besok!
                                    </p>

                                    <button
                                        onClick={() => {
                                            setIsRegisterModalOpen(false);
                                            setRegSubmitted(false);
                                            const el = document.getElementById('leaderboard');
                                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                                    >
                                        Lihat Posisi Saya di Leaderboard &rarr;
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                                    {submitError && (
                                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                                            {submitError}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">Nama Lengkap / Alias</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Contoh: Rian Sniper"
                                            value={regForm.fullName}
                                            onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:border-amber-500 font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">Nomor WhatsApp Aktif</label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="Contoh: 081234567890"
                                            value={regForm.phone}
                                            onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:border-amber-500 font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="email@example.com"
                                            value={regForm.email}
                                            onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:border-amber-500 font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">No. Akun FBS (MT4/MT5)</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Contoh: 31029481"
                                                value={regForm.fbsAccountNumber}
                                                onChange={(e) => setRegForm({ ...regForm, fbsAccountNumber: e.target.value })}
                                                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:border-amber-500 font-mono font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Tipe Akun FBS</label>
                                            <select
                                                value={regForm.fbsAccountType}
                                                onChange={(e) => setRegForm({ ...regForm, fbsAccountType: e.target.value })}
                                                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:border-amber-500 font-semibold text-slate-700"
                                            >
                                                <option value="Standard">FBS Standard</option>
                                                <option value="Cent">FBS Cent (Mikro)</option>
                                                <option value="Pro">FBS Pro</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">Saldo Deposit Awal ($)</label>
                                        <input
                                            type="number"
                                            min="25"
                                            required
                                            value={regForm.depositAmount}
                                            onChange={(e) => setRegForm({ ...regForm, depositAmount: Number(e.target.value) })}
                                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:border-amber-500 font-mono font-bold"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Minimal deposit $25 USD di akun FBS Anda.
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] leading-relaxed">
                                        <div className="font-bold flex items-center gap-1.5 mb-1">
                                            <span>✓</span>
                                            <span>Verifikasi Otomatis Langsung di Web</span>
                                        </div>
                                        <p className="text-emerald-700">
                                            Pendaftaran langsung diproses secara instan di sistem web ini dan dicocokkan dengan <strong>Dashboard IB FBS ARRA 7</strong> tanpa perlu konfirmasi manual lewat WhatsApp.
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 disabled:opacity-60 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Mendaftarkan Akun ke Sistem...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>🏆</span>
                                                    <span>Daftarkan Akun ke Leaderboard Sekarang &rarr;</span>
                                                </>
                                            )}
                                        </button>
                                        <p className="text-[10px] text-slate-400 text-center mt-2">
                                            Proses instan langsung di website, tanpa perlu membuka aplikasi WhatsApp.
                                        </p>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
