'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import { isAdminEmail } from '@/lib/admin-access';
import { FIBO_KYOKO_TRADINGVIEW_SCRIPT } from '@/lib/fibo-kyoko-script';

export default function KursusFiboKyokoPage() {
    const { data: session } = useSession();
    const { tier, daysLeft, openActivation } = usePicaDevice();

    const isUnlocked = 
        tier === 'PRO' || 
        tier === 'VVIP' || 
        session?.user?.tier === 'PRO' || 
        session?.user?.tier === 'VVIP' || 
        isAdminEmail(session?.user?.email);

    const [activeTab, setActiveTab] = useState<'video' | 'mt5' | 'tradingview'>('video');
    const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
    const [copiedScript, setCopiedScript] = useState(false);

    const episodes = [
        {
            id: 1,
            title: 'EPS 1: Basic Fibo Kyoko',
            subtitle: 'Konsep Dasar & Filosofi Fibonacci Modifikasi',
            duration: 'Masterclass Lengkap',
            description: 'Memahami dasar pondasi Fibo Kyoko, perbedaan dengan Fibonacci standar, cara mengidentifikasi Golden Ratio, dan pengenalan zona support & resistance adaptif.',
            highlights: [
                'Logika matematis level Fibo Kyoko',
                'Mengapa Golden Ratio standar sering kena false breakout',
                'Pengenalan Anchor Point 0 dan 1 yang presisi',
            ],
            fileNote: 'EPS 1 Basic Fibo Kyoko.mp4 (Kualitas Full HD)',
        },
        {
            id: 2,
            title: 'EPS 2: Pola Trend Fibo Kyoko',
            subtitle: 'Identifikasi Struktur Trend & Break of Structure (BOS)',
            duration: 'Pola Trend & Konfirmasi',
            description: 'Menganalisis pergerakan trend mayor dan minor menggunakan Fibo Kyoko. Mengetahui kapan trend akan berlanjut dan kapan terjadi reversal ekstrem.',
            highlights: [
                'Validasi BOS (Break of Structure) dengan konfirmasi candle',
                'Menghindari fakeout pada level 0.618 & 0.786',
                'Kombinasi timeframe M15 ke H1 untuk swing sniper',
            ],
            fileNote: 'EPS 2 POLA TREND FIBO KYOKO.mp4 (Kualitas Full HD)',
        },
        {
            id: 3,
            title: 'EPS 3: Cara Tarik Garis yang Benar',
            subtitle: 'Tutorial Praktikal Menarik Garis Swing High-Low',
            duration: 'Praktikal Eksekusi Sniper',
            description: 'Panduan teknikal step-by-step menarik garis Fibo Kyoko secara presisi pada chart live. Menentukan titik entry ideal, letak Stop Loss aman, dan Take Profit bertingkat.',
            highlights: [
                'Aturan baku titik awal (0) dan titik akhir (1)',
                'Filter volatilitas menggunakan ATR agar tidak salah tarik',
                'Manajemen resiko: Rasio Risk to Reward 1:2 hingga 1:5',
            ],
            fileNote: 'EPS 3 CARA TARIK GARIS YANG BENAR.mp4 (Kualitas Full HD)',
        },
    ];

    const currentEp = episodes.find((e) => e.id === selectedEpisode) || episodes[0];

    const handleCopyScript = () => {
        navigator.clipboard.writeText(FIBO_KYOKO_TRADINGVIEW_SCRIPT);
        setCopiedScript(true);
        setTimeout(() => setCopiedScript(false), 2500);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pt-28 pb-20 font-sans">
            {/* Header / Hero Section */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs mb-3 border border-blue-200">
                            <span>📈</span>
                            <span>Masterclass Eksklusif PICA</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-600 text-white">PRO</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                            Kursus Digital Fibo Kyoko
                        </h1>
                        <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                            Panduan lengkap strategi Fibonacci Kyoko, 3 video masterclass berdurasi panjang, file indikator auto MT5 (.ex5), dan script TradingView Pine Script v6.
                        </p>
                    </div>

                    {isUnlocked ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>AKSES PRO AKTIF</span>
                            {daysLeft > 0 && <span className="text-emerald-600 font-medium">({daysLeft} hari lagi)</span>}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={openActivation}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                                🔑 Aktivasi Kode
                            </button>
                            <Link
                                href="/payment/transfer?plan=FIBO_KYOKO&duration=lifetime&days=0"
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                            >
                                Beli Kursus (Rp 169.000)
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* If NOT Unlocked: Show Beautiful Preview / Sales Screen */}
            {!isUnlocked ? (
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl overflow-hidden mb-12">
                        {/* Notice Banner */}
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-2">
                                🔒 Akses Terkunci
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold">
                                Kursus Khusus Member PRO / Pembeli Paket Fibo Kyoko
                            </h2>
                            <p className="text-blue-100 text-sm max-w-xl mx-auto mt-2">
                                Dapatkan akses penuh ke seluruh video panduan teknikal, indikator auto MT5 langsung pasang, dan script TradingView Pine Script v6.
                            </p>
                        </div>

                        {/* Curriculum & Assets Included */}
                        <div className="p-6 sm:p-10">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Materi &amp; Aset yang Anda Dapatkan:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                                    <div className="text-3xl mb-3">🎬</div>
                                    <h4 className="font-bold text-slate-900 text-sm mb-1">3 Video Masterclass HD</h4>
                                    <p className="text-slate-600 text-xs leading-relaxed">
                                        Mulai dari dasar filosofi, pola trend BOS, hingga tutorial teknis cara menarik garis swing high-low yang benar.
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                                    <div className="text-3xl mb-3">⚡</div>
                                    <h4 className="font-bold text-slate-900 text-sm mb-1">Indikator Auto MT5 (.ex5)</h4>
                                    <p className="text-slate-600 text-xs leading-relaxed">
                                        File indikator siap pasang untuk MetaTrader 5 (PC &amp; VPS). Level Fibo Kyoko diplot secara otomatis tanpa repot.
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                                    <div className="text-3xl mb-3">📊</div>
                                    <h4 className="font-bold text-slate-900 text-sm mb-1">Script TradingView Pine Script v6</h4>
                                    <p className="text-slate-600 text-xs leading-relaxed">
                                        Script Pine v6 lengkap siap copy-paste ke Pine Editor TradingView. Mendukung multi-timeframe &amp; ATR dynamic zone.
                                    </p>
                                </div>
                            </div>

                            {/* Price Card & CTA */}
                            <div className="rounded-2xl border-2 border-blue-500/30 bg-blue-50/50 p-6 sm:p-8 text-center max-w-xl mx-auto">
                                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Penawaran Spesial</p>
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <span className="text-slate-400 line-through text-base">Rp 499.000</span>
                                    <span className="text-3xl sm:text-4xl font-extrabold text-blue-600">Rp 169.000</span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold">HEMAT 66%</span>
                                </div>
                                <p className="text-slate-500 text-xs mb-6">
                                    Sekali bayar untuk akses selamanya (Lifetime Access) + Bonus Akses PRO Platform PICA.
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <Link
                                        href="/payment/transfer?plan=FIBO_KYOKO&duration=lifetime&days=0"
                                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
                                    >
                                        Beli Kursus Sekarang (Rp 169.000) →
                                    </Link>
                                    <button
                                        onClick={openActivation}
                                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
                                    >
                                        Aktivasi Kode Lisensi
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Unlocked: Full Course Content Hub */
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    {/* Navigation Tabs */}
                    <div className="flex gap-2 border-b border-slate-200 mb-8 overflow-x-auto pb-1">
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'video'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <span>🎬</span>
                            <span>Video Masterclass (3 Episode)</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('mt5')}
                            className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'mt5'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <span>⚡</span>
                            <span>Indikator Auto MT5 (.ex5)</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('tradingview')}
                            className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'tradingview'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <span>📊</span>
                            <span>Script TradingView Pine Script v6</span>
                        </button>
                    </div>

                    {/* TAB 1: VIDEO MASTERCLASS */}
                    {activeTab === 'video' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Video Viewport & Player */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                                    <div className="relative aspect-video bg-slate-900 flex items-center justify-center p-6 text-center">
                                        <div className="max-w-md">
                                            <div className="w-16 h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg">
                                                ▶
                                            </div>
                                            <h3 className="text-white font-bold text-lg mb-1">{currentEp.title}</h3>
                                            <p className="text-slate-400 text-xs mb-4">{currentEp.subtitle}</p>
                                            <p className="text-xs text-blue-300 font-mono bg-blue-950/70 border border-blue-800 rounded-lg p-2.5 inline-block">
                                                📁 File Master: {currentEp.fileNote}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Video Details */}
                                    <div className="p-6">
                                        <div className="flex items-center justify-between gap-4 mb-3">
                                            <h2 className="text-xl font-extrabold text-slate-900">{currentEp.title}</h2>
                                            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                                                {currentEp.duration}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed mb-6">
                                            {currentEp.description}
                                        </p>

                                        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                                Poin Kunci yang Dipelajari:
                                            </h4>
                                            <ul className="space-y-1.5 text-xs text-slate-600">
                                                {currentEp.highlights.map((h, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className="text-blue-600 font-bold">✓</span>
                                                        <span>{h}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Episode Playlist Sidebar */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 text-base mb-2">Daftar Episode Video:</h3>
                                {episodes.map((ep) => {
                                    const isCurrent = ep.id === selectedEpisode;
                                    return (
                                        <button
                                            key={ep.id}
                                            onClick={() => setSelectedEpisode(ep.id)}
                                            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                                                isCurrent
                                                    ? 'bg-blue-50/70 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isCurrent ? 'text-blue-700' : 'text-slate-500'}`}>
                                                    Episode {ep.id}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                                    HD Video
                                                </span>
                                            </div>
                                            <div className="font-bold text-slate-900 text-sm mb-1">{ep.title.replace(`EPS ${ep.id}: `, '')}</div>
                                            <p className="text-xs text-slate-500 line-clamp-2">{ep.subtitle}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: INDIKATOR AUTO MT5 */}
                    {activeTab === 'mt5' && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 mb-8">
                                    <div>
                                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 inline-block mb-2">
                                            MetaTrader 5 Build 4000+ Compatible
                                        </span>
                                        <h2 className="text-2xl font-extrabold text-slate-900">
                                            Indikator FIBO KYOKO AUTO MT5
                                        </h2>
                                        <p className="text-slate-600 text-xs sm:text-sm mt-1">
                                            File kompilasi siap pakai (.ex5) langsung di-attach ke chart MetaTrader 5.
                                        </p>
                                    </div>
                                    <a
                                        href="/downloads/fibo-kyoko/FIBO_KYOKO_AUTO_MT5.ex5"
                                        download="FIBO_KYOKO_AUTO_MT5.ex5"
                                        className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                                    >
                                        <span>⬇️</span>
                                        <span>Download File .EX5</span>
                                    </a>
                                </div>

                                {/* Step by Step Guide */}
                                <h3 className="font-bold text-slate-900 text-base mb-4">
                                    Panduan Pemasangan di MetaTrader 5:
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                                        <div className="font-bold text-blue-600 mb-1">Langkah 1: Download File</div>
                                        <p className="text-slate-600">
                                            Klik tombol biru <strong>Download File .EX5</strong> di atas untuk menyimpan file <code>FIBO_KYOKO_AUTO_MT5.ex5</code> ke komputer Anda.
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                                        <div className="font-bold text-blue-600 mb-1">Langkah 2: Buka MT5 Data Folder</div>
                                        <p className="text-slate-600">
                                            Di MetaTrader 5, klik menu <strong>File</strong> di pojok kiri atas $\rightarrow$ pilih <strong>Open Data Folder</strong>.
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                                        <div className="font-bold text-blue-600 mb-1">Langkah 3: Paste ke Folder Indicators</div>
                                        <p className="text-slate-600">
                                            Buka folder <strong>MQL5</strong> $\rightarrow$ buka folder <strong>Indicators</strong>. Paste file <code>FIBO_KYOKO_AUTO_MT5.ex5</code> di sini.
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                                        <div className="font-bold text-blue-600 mb-1">Langkah 4: Refresh &amp; Pasang ke Chart</div>
                                        <p className="text-slate-600">
                                            Di panel Navigator MT5, klik kanan pada Indicators $\rightarrow$ klik <strong>Refresh</strong>. Drag <code>FIBO_KYOKO_AUTO_MT5</code> ke chart XAUUSD atau pair pilihan Anda!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: TRADINGVIEW PINE SCRIPT */}
                    {activeTab === 'tradingview' && (
                        <div className="max-w-5xl mx-auto space-y-8">
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
                                    <div>
                                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 inline-block mb-2">
                                            Pine Script v6
                                        </span>
                                        <h2 className="text-2xl font-extrabold text-slate-900">
                                            Script Indikator TradingView
                                        </h2>
                                        <p className="text-slate-600 text-xs sm:text-sm mt-1">
                                            Salin script dan tempelkan langsung ke Pine Editor di TradingView web atau aplikasi desktop.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <a
                                            href="/downloads/fibo-kyoko/Script_Fibo_Kyoko_Tradingview.txt"
                                            download="Script_Fibo_Kyoko_Tradingview.txt"
                                            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                                        >
                                            Download .txt
                                        </a>
                                        <button
                                            onClick={handleCopyScript}
                                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                                        >
                                            {copiedScript ? '✅ Script Tersalin!' : '📋 Salin Script (1-Click)'}
                                        </button>
                                    </div>
                                </div>

                                {/* Tutorial TradingView */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-6 text-xs text-slate-700">
                                    <div className="font-bold text-slate-900 mb-2">Cara Memasang di TradingView:</div>
                                    <ol className="list-decimal list-inside space-y-1 text-slate-600">
                                        <li>Buka chart di <strong>tradingview.com</strong></li>
                                        <li>Klik tab <strong>Pine Editor</strong> di bagian bawah layar.</li>
                                        <li>Hapus kode bawaan, lalu paste kode yang telah Anda salin di bawah.</li>
                                        <li>Klik tombol <strong>Save</strong> lalu klik <strong>Add to chart</strong>.</li>
                                        <li>Selesai! Indikator Fibo Kyoko akan langsung membaca titik swing dan menggambar zona secara otomatis.</li>
                                    </ol>
                                </div>

                                {/* Script Code Box */}
                                <div className="relative rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] overflow-hidden shadow-inner">
                                    <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700 text-[11px] text-slate-400">
                                        <span>FIBO KYOKO AUTO (Pine Script v6)</span>
                                        <button
                                            onClick={handleCopyScript}
                                            className="text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                                        >
                                            {copiedScript ? 'Tersalin!' : 'Copy Code'}
                                        </button>
                                    </div>
                                    <pre className="p-4 max-h-[450px] overflow-y-auto leading-relaxed select-all">
                                        <code>{FIBO_KYOKO_TRADINGVIEW_SCRIPT}</code>
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
