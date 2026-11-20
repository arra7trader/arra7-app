'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { SparklesIcon, BoltIcon, CheckIcon, KeyIcon, CrownIcon, RobotIcon, TrendUpIcon } from '@/components/PremiumIcons';

export default function EAPicaNeuralGoldPage() {
    const [inputKey, setInputKey] = useState('');
    const [licenseKey, setLicenseKey] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [activeTab, setActiveTab] = useState<'download' | 'guide' | 'specs'>('download');

    // Auto load key from localStorage if saved
    useEffect(() => {
        const savedKey = localStorage.getItem('pica_ea_license_key');
        if (savedKey) {
            setInputKey(savedKey);
            verifyKey(savedKey, true);
        }
    }, []);

    const verifyKey = async (codeToVerify: string, isSilent = false) => {
        const cleanCode = codeToVerify.trim();
        if (!cleanCode) {
            if (!isSilent) setErrorMsg('Silakan masukkan kode lisensi.');
            return;
        }

        setLoading(true);
        if (!isSilent) setErrorMsg('');

        try {
            const res = await fetch('/api/ea/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: cleanCode }),
            });
            const data = await res.json();

            if (res.ok && data.valid) {
                setIsUnlocked(true);
                setLicenseKey(cleanCode);
                localStorage.setItem('pica_ea_license_key', cleanCode);
                setSuccessMsg(`Lisensi valid! Akses EA PICA Neural Gold (${data.tier || 'PROMO'}) aktif.`);
            } else {
                setIsUnlocked(false);
                if (!isSilent) {
                    setErrorMsg(data.message || 'Kode lisensi tidak valid atau belum diaktifkan.');
                }
            }
        } catch (err: any) {
            if (!isSilent) {
                setErrorMsg('Terjadi kendala saat memeriksa lisensi. Coba lagi beberapa saat.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        verifyKey(inputKey);
    };

    const handleLockAgain = () => {
        setIsUnlocked(false);
        setLicenseKey('');
        localStorage.removeItem('pica_ea_license_key');
        setSuccessMsg('');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-black">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-b from-amber-500/15 via-yellow-500/5 to-transparent blur-3xl rounded-full" />
                <div className="absolute top-1/3 -left-48 w-96 h-96 bg-blue-600/10 blur-3xl rounded-full" />
                <div className="absolute top-2/3 -right-48 w-96 h-96 bg-amber-600/10 blur-3xl rounded-full" />
            </div>

            <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-24">
                {/* Header Badge & Title */}
                <header className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-bold tracking-wide uppercase mb-5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            Expert Advisor MT5 • Deep Learning ONNX
                        </div>

                        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-4 leading-tight">
                            PICA Neural Gold <br />
                            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                                Dual Scalper &amp; Intraday (M1 + M5)
                            </span>
                        </h1>

                        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
                            Sistem trading otomatis (EA) berbasis model AI Deep Learning ONNX native untuk MetaTrader 5 pada pair XAUUSD. Eksekusi cepat, zero-lag neural forecast, dan manajemen risiko terukur.
                        </p>
                    </motion.div>
                </header>

                {/* Status Container: Locked vs Unlocked */}
                <div className="mb-14">
                    {!isUnlocked ? (
                        /* ================= LOCKED STATE ================= */
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-amber-500/5 relative overflow-hidden backdrop-blur-xl"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                {/* Left Side: Promo & Lock Notice */}
                                <div className="lg:col-span-7 space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner shadow-amber-500/30">
                                            🔒
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                                                Akses Terkunci (Member Only)
                                            </span>
                                            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                                                Download Package &amp; Lisensi MT5
                                            </h2>
                                        </div>
                                    </div>

                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        Halaman file binary EA (<code className="text-amber-300">.ex5</code>), model neural (<code className="text-amber-300">.onnx</code>), dan file preset (<code className="text-amber-300">.set</code>) terkunci khusus untuk pembeli resmi paket EA PICA Neural Gold.
                                    </p>

                                    {/* Pricing Box Promo */}
                                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400 line-through">Rp 499.000</span>
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                    Hemat 82%
                                                </span>
                                            </div>
                                            <div className="text-3xl font-black text-amber-400 mt-0.5">
                                                Rp 90.000
                                                <span className="text-xs text-slate-400 font-normal ml-1.5">/ Promo Hari Ini (Lifetime)</span>
                                            </div>
                                        </div>

                                        <Link
                                            href="/payment/transfer?plan=EA_PICA_GOLD&duration=lifetime&days=0"
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-center"
                                        >
                                            <span>Beli Paket EA (Rp 90k)</span>
                                            <span>→</span>
                                        </Link>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <CheckIcon size="sm" className="text-amber-400 shrink-0" />
                                        <span>Pembayaran resmi via <strong>Bank BCA 1392698188 (Arland Pratama Muldiawan)</strong>. Konfirmasi ke Telegram <strong>@arra7trader</strong>.</span>
                                    </div>
                                </div>

                                {/* Right Side: Unlock Key Form */}
                                <div className="lg:col-span-5 bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <KeyIcon size="sm" className="text-amber-400" />
                                        <h3 className="font-bold text-white text-base">Sudah Punya Lisensi?</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-4">
                                        Masukkan kode lisensi yang diberikan admin setelah konfirmasi transfer untuk membuka akses unduhan file &amp; panduan instalasi.
                                    </p>

                                    <form onSubmit={handleFormSubmit} className="space-y-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                                                Kode Lisensi (License Key)
                                            </label>
                                            <input
                                                type="text"
                                                value={inputKey}
                                                onChange={(e) => setInputKey(e.target.value)}
                                                placeholder="Contoh: PICA-EA-XXXXX atau PICA-ADMIN"
                                                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
                                            />
                                        </div>

                                        {errorMsg && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-start gap-2"
                                            >
                                                <span>⚠️</span>
                                                <span>{errorMsg}</span>
                                            </motion.div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-sm tracking-wide transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                                                    <span>Memverifikasi Lisensi...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>🔓 Buka Akses &amp; Download</span>
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    <div className="mt-4 pt-4 border-t border-slate-800/80 text-center">
                                        <p className="text-[11px] text-slate-400">
                                            Butuh bantuan atau belum dapat key?{' '}
                                            <a
                                                href="https://t.me/arra7trader"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-amber-400 font-bold hover:underline"
                                            >
                                                Chat @arra7trader di Telegram
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* ================= UNLOCKED STATE ================= */
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-emerald-500/5 backdrop-blur-xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Header Unlocked Banner */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl">
                                        ✨
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                                                AKSES TERBUKA (MEMBER AKTIF)
                                            </span>
                                            <span className="text-xs font-mono text-slate-400">
                                                Key: <span className="text-amber-300 font-bold">{licenseKey}</span>
                                            </span>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                                            PICA Neural Gold Download Center
                                        </h2>
                                    </div>
                                </div>

                                <button
                                    onClick={handleLockAgain}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                                >
                                    Kunci Kembali / Ganti Key
                                </button>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="flex items-center gap-2 mt-6 border-b border-slate-800 pb-3 overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab('download')}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                                        activeTab === 'download'
                                            ? 'bg-amber-500 text-slate-950 shadow-md'
                                            : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    📦 Pusat Unduhan File Paket
                                </button>
                                <button
                                    onClick={() => setActiveTab('guide')}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                                        activeTab === 'guide'
                                            ? 'bg-amber-500 text-slate-950 shadow-md'
                                            : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    📖 Panduan Instalasi MT5
                                </button>
                                <button
                                    onClick={() => setActiveTab('specs')}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                                        activeTab === 'specs'
                                            ? 'bg-amber-500 text-slate-950 shadow-md'
                                            : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    ⚙️ Parameter Preset &amp; Rekomendasi
                                </button>
                            </div>

                            {/* TAB 1: DOWNLOAD CENTER */}
                            {activeTab === 'download' && (
                                <div className="mt-6 space-y-6">
                                    {/* Main Complete Package Banner */}
                                    <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                                                REKOMENDASI UTAMA
                                            </span>
                                            <h3 className="text-lg font-bold text-white">
                                                Paket Lengkap Dual Engine (M1 Scalper + M5 Intraday ZIP)
                                            </h3>
                                            <p className="text-xs text-slate-300 max-w-xl">
                                                Berisi seluruh file siap pakai: <code className="text-amber-300">.ex5</code> untuk M1 dan M5, model AI <code className="text-amber-300">.onnx</code>, 4 file preset <code className="text-amber-300">.set</code>, serta panduan PDF/teks lengkap.
                                            </p>
                                        </div>

                                        <a
                                            href={`/api/ea/download?file=dual&key=${encodeURIComponent(licenseKey)}`}
                                            download
                                            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                                        >
                                            <span>⬇️ Download Paket Dual ZIP (450 KB)</span>
                                        </a>
                                    </div>

                                    {/* Individual Package Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* M1 Scalper Package */}
                                        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                                        <span>⚡</span> Paket Khusus M1 Scalper
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono">ZIP (370 KB)</span>
                                                </div>
                                                <h4 className="font-bold text-white text-base">PICA Neural Gold M1 Package</h4>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Khusus strategi scalping frekuensi tinggi (~75 trades/hari) di timeframe M1 XAUUSD dengan trailing dinamis.
                                                </p>
                                            </div>

                                            <div className="pt-3 border-t border-slate-900 flex items-center justify-between">
                                                <a
                                                    href={`/api/ea/download?file=m1&key=${encodeURIComponent(licenseKey)}`}
                                                    download
                                                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                                                >
                                                    <span>⬇️ Download M1 ZIP</span>
                                                </a>
                                                <div className="flex gap-1.5">
                                                    <a
                                                        href={`/api/ea/download?file=m1-ex5&key=${encodeURIComponent(licenseKey)}`}
                                                        className="text-[11px] text-amber-400 hover:underline"
                                                    >
                                                        .ex5
                                                    </a>
                                                    <span className="text-slate-600">•</span>
                                                    <a
                                                        href={`/api/ea/download?file=m1-onnx&key=${encodeURIComponent(licenseKey)}`}
                                                        className="text-[11px] text-amber-400 hover:underline"
                                                    >
                                                        .onnx
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        {/* M5 Intraday Package */}
                                        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                                                        <span>📈</span> Paket Khusus M5 Intraday
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono">ZIP (80 KB)</span>
                                                </div>
                                                <h4 className="font-bold text-white text-base">PICA Neural Gold M5 Package</h4>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Khusus strategi intraday presisi (~16 trades/hari) di timeframe M5 XAUUSD dengan filter trend dan SMC confluence.
                                                </p>
                                            </div>

                                            <div className="pt-3 border-t border-slate-900 flex items-center justify-between">
                                                <a
                                                    href={`/api/ea/download?file=m5&key=${encodeURIComponent(licenseKey)}`}
                                                    download
                                                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                                                >
                                                    <span>⬇️ Download M5 ZIP</span>
                                                </a>
                                                <div className="flex gap-1.5">
                                                    <a
                                                        href={`/api/ea/download?file=m5-ex5&key=${encodeURIComponent(licenseKey)}`}
                                                        className="text-[11px] text-blue-400 hover:underline"
                                                    >
                                                        .ex5
                                                    </a>
                                                    <span className="text-slate-600">•</span>
                                                    <a
                                                        href={`/api/ea/download?file=m5-onnx&key=${encodeURIComponent(licenseKey)}`}
                                                        className="text-[11px] text-blue-400 hover:underline"
                                                    >
                                                        .onnx
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: INSTALLATION GUIDE */}
                            {activeTab === 'guide' && (
                                <div className="mt-6 space-y-6 text-sm text-slate-300">
                                    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                                            <span>1️⃣</span> Ekstrak File ke Direktori MetaTrader 5
                                        </h3>
                                        <p className="text-xs leading-relaxed text-slate-300">
                                            Buka MetaTrader 5 Anda, klik menu <strong>File → Open Data Folder</strong> (atau tekan <code>Ctrl + Shift + D</code>).
                                        </p>
                                        <div className="space-y-2 text-xs font-mono bg-slate-900 p-4 rounded-xl border border-slate-800">
                                            <p className="text-amber-400 font-bold">Struktur Direktori yang Diperlukan:</p>
                                            <p>📁 <code>MQL5\Experts\PICA_Neural_Gold_M1_MT5.ex5</code></p>
                                            <p>📁 <code>MQL5\Experts\PICA_Neural_Gold_M5_MT5.ex5</code></p>
                                            <p>📁 <code>MQL5\Files\PICA_Neural_Gold_M1.onnx</code></p>
                                            <p>📁 <code>MQL5\Files\PICA_Neural_Gold_M5.onnx</code></p>
                                            <p>📁 <code>MQL5\Presets\*.set</code> (salin file .set ke folder ini)</p>
                                        </div>
                                        <p className="text-xs text-amber-300/90 italic">
                                            *Penting: File model AI berformat <code>.onnx</code> WAJIB diletakkan di dalam folder <code>MQL5\Files\</code> agar dapat dimuat oleh engine runtime MT5.
                                        </p>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                                            <span>2️⃣</span> Izinkan Algo Trading &amp; Import Eksternal
                                        </h3>
                                        <p className="text-xs leading-relaxed">
                                            Di MT5, buka <strong>Tools → Options → Expert Advisors</strong>:
                                        </p>
                                        <ul className="text-xs space-y-1.5 list-disc list-inside text-slate-300">
                                            <li>Centang <strong>Allow algorithmic trading</strong></li>
                                            <li>Centang <strong>Allow DLL imports</strong> (diperlukan untuk modul ONNX neural accelerator)</li>
                                            <li>Centang <strong>Allow WebRequest for listed URL</strong> dan tambahkan: <code>https://pica.my.id</code></li>
                                            <li>Pastikan tombol <strong>Algo Trading</strong> di toolbar atas berwarna <strong>HIJAU</strong>.</li>
                                        </ul>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                                            <span>3️⃣</span> Pasang ke Chart XAUUSD
                                        </h3>
                                        <p className="text-xs leading-relaxed">
                                            Buka chart pair <strong>XAUUSD / GOLD</strong>. Set timeframe ke <strong>M1</strong> (untuk versi M1 Scalper) atau <strong>M5</strong> (untuk versi M5 Intraday). Drag file EA dari jendela Navigator ke dalam chart, lalu klik <strong>Load</strong> pada tab Inputs dan pilih preset yang sesuai.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: SPECIFICATIONS & PRESETS */}
                            {activeTab === 'specs' && (
                                <div className="mt-6 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-amber-400">⚡ Engine M1 Scalper</h4>
                                                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">High Frequency</span>
                                            </div>
                                            <ul className="text-xs space-y-2 text-slate-300">
                                                <li>• <strong>Rekomendasi Modal:</strong> Min. $100 (Cent) / $500 (Standard)</li>
                                                <li>• <strong>Frekuensi Trade:</strong> ~75 trades per hari</li>
                                                <li>• <strong>Rata-rata Durasi:</strong> 1 - 7 menit per posisi</li>
                                                <li>• <strong>Target Pips:</strong> 15 - 35 pips dengan dynamic trailing</li>
                                                <li>• <strong>Model AI:</strong> Bi-LSTM 128-unit ONNX Native</li>
                                                <li>• <strong>Preset Bawaan:</strong> <code>Aggressive_Scalp.set</code> &amp; <code>Safe_Scalp.set</code></li>
                                            </ul>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-blue-400">📈 Engine M5 Intraday</h4>
                                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Precision Trend</span>
                                            </div>
                                            <ul className="text-xs space-y-2 text-slate-300">
                                                <li>• <strong>Rekomendasi Modal:</strong> Min. $200 (Standard)</li>
                                                <li>• <strong>Frekuensi Trade:</strong> ~16 trades per hari</li>
                                                <li>• <strong>Rata-rata Durasi:</strong> 15 menit - 3 jam per posisi</li>
                                                <li>• <strong>Target Pips:</strong> 50 - 120 pips dengan multi-take-profit</li>
                                                <li>• <strong>Model AI:</strong> Transformer Feature Confluence ONNX</li>
                                                <li>• <strong>Preset Bawaan:</strong> <code>Intraday_Balanced.set</code> &amp; <code>Conservative.set</code></li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>

                {/* Features & Dual Architecture Comparison */}
                <section className="mb-16">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <h2 className="text-2xl sm:text-3xl font-black text-white">
                            Arsitektur Dual Neural Engine
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-2">
                            Mengapa menggabungkan M1 Scalper dan M5 Intraday memberikan diversifikasi maksimal untuk trading Gold (XAUUSD)?
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* M1 Scalper Card */}
                        <div className="p-7 rounded-3xl bg-slate-900/60 border border-amber-500/30 relative overflow-hidden flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold">
                                    ⚡
                                </div>
                                <div>
                                    <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
                                        High Frequency Engine
                                    </span>
                                    <h3 className="text-2xl font-extrabold text-white mt-1">
                                        M1 Neural Scalper
                                    </h3>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                    Dirancang khusus untuk menangkap momentum mikro spread ketat di sesi London &amp; New York. Menganalisis volatilitas order flow detik per detik dengan eksekusi instan tanpa jeda emosi manusia.
                                </p>
                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-300">
                                        <CheckIcon size="sm" className="text-amber-400" />
                                        <span>Rata-rata <strong>~75 transaksi per hari</strong> saat volatilitas aktif</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-300">
                                        <CheckIcon size="sm" className="text-amber-400" />
                                        <span>Multi-Level Trailing Stop dinamis mengamankan cuan cepat</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-300">
                                        <CheckIcon size="sm" className="text-amber-400" />
                                        <span>Auto-News Sentry: Menghindari floating liar saat rilis High-Impact News</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* M5 Intraday Card */}
                        <div className="p-7 rounded-3xl bg-slate-900/60 border border-blue-500/30 relative overflow-hidden flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl font-bold">
                                    📈
                                </div>
                                <div>
                                    <span className="text-[11px] font-black uppercase text-blue-400 tracking-wider">
                                        Precision Trend Filter
                                    </span>
                                    <h3 className="text-2xl font-extrabold text-white mt-1">
                                        M5 Intraday Master
                                    </h3>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                    Menggabungkan Smart Money Concepts (SMC) dengan prediksi arah trend probabilitas tinggi. Hanya mengeksekusi saat konfluensi struktur Order Block dan Liquidity Sweep terkonfirmasi.
                                </p>
                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-300">
                                        <CheckIcon size="sm" className="text-blue-400" />
                                        <span>Rata-rata <strong>~16 transaksi terpilih per hari</strong> dengan win-rate stabil</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-300">
                                        <CheckIcon size="sm" className="text-blue-400" />
                                        <span>Risk-Reward Ratio optimal (1:2 hingga 1:3.5)</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-300">
                                        <CheckIcon size="sm" className="text-blue-400" />
                                        <span>Drawdown rendah dan ramah akun reguler/prop firm</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bottom Call to Action */}
                <section className="text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-amber-950/40 via-slate-900/80 to-slate-950 border border-amber-500/30 shadow-2xl">
                    <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
                        Mulai Trading Otomatis dengan AI Hari Ini
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mb-6">
                        Dapatkan kedua paket EA (M1 Scalper &amp; M5 Intraday), model ONNX native, 4 file preset siap pakai, serta lisensi aktivasi seumur hidup hanya dengan promo Rp 90.000.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/payment/transfer?plan=EA_PICA_GOLD&duration=lifetime&days=0"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
                        >
                            <span>Dapatkan Paket EA (Rp 90.000)</span>
                            <span>→</span>
                        </Link>
                        <a
                            href="https://t.me/arra7trader"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-colors"
                        >
                            <span>💬 Konsultasi via Telegram</span>
                        </a>
                    </div>
                </section>
            </main>
        </div>
    );
}
