'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { INSTITUTIONAL_TECHNIQUES, getTechniquesByCategory } from '@/lib/indicator-maker/catalog';
import { PlatformTarget, TechniqueCategory, TechniqueModule } from '@/lib/indicator-maker/types';
import {
  IndicatorMakerIcon,
  CheckCircleSolidIcon,
  ShieldCheckIcon,
  LockIcon,
  ArrowRightIcon,
  SparklesIcon,
  BoltIcon,
  FireIcon,
  ChartIcon,
  ClockIcon,
  TradingViewIcon,
  MetaTraderIcon
} from '@/components/PremiumIcons';

export default function IndicatorMakerPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformTarget>('tradingview');
  const [selectedTechniqueIds, setSelectedTechniqueIds] = useState<string[]>(['smc_ob', 'smc_fvg', 'tr_triple_ema', 'ex_atr_sl']);
  const [customName, setCustomName] = useState('PICA_Institutional_Sniper');
  const [licenseKey, setLicenseKey] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Rate Limit & Stats State
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [dailyRemaining, setDailyRemaining] = useState(5);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [isAdminPasskey, setIsAdminPasskey] = useState(false);
  const [earlyBirdStats, setEarlyBirdStats] = useState({
    totalSold: 12,
    maxEarlyBirdSlots: 20,
    remainingEarlyBirdSlots: 8,
    isEarlyBirdActive: true,
    earlyBirdPrice: 175000,
    regularMonthlyPrice: 175000
  });

  // Generated Result State
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedFilename, setGeneratedFilename] = useState<string | null>(null);
  const [generatedPlatform, setGeneratedPlatform] = useState<PlatformTarget>('tradingview');
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [showBcaModal, setShowBcaModal] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Fetch initial quota & early bird stats
  const fetchStatus = async () => {
    try {
      setIsVerifying(true);
      const res = await fetch(`/api/indicator-maker/verify?license=${encodeURIComponent(licenseKey)}`);
      const json = await res.json();
      if (json.status === 'success') {
        if (json.rateLimit) {
          setCooldownSeconds(json.rateLimit.cooldownRemainingSeconds || 0);
          setDailyRemaining(json.rateLimit.dailyRemaining);
          setDailyUsed(json.rateLimit.dailyUsed || 0);
          setIsAdminPasskey(Boolean(json.rateLimit.isAdmin));
        }
        if (json.earlyBird) {
          setEarlyBirdStats(json.earlyBird);
        }
      }
    } catch (err) {
      console.warn('Failed to verify status:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [licenseKey]);

  // Cooldown countdown tick
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Filtered technique modules (100 total)
  const filteredModules = useMemo(() => {
    let list = activeCategory === 'all' 
      ? INSTITUTIONAL_TECHNIQUES 
      : getTechniquesByCategory(activeCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.description.toLowerCase().includes(q) || 
        m.badge.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, searchQuery]);

  // Toggle technique selection (Max 5)
  const toggleTechnique = (id: string) => {
    if (selectedTechniqueIds.includes(id)) {
      setSelectedTechniqueIds(prev => prev.filter(item => item !== id));
      setErrorMessage(null);
    } else {
      if (selectedTechniqueIds.length >= 5) {
        setErrorMessage('Maksimal 5 teknik! Membatasi combo teknik memastikan indikator zero-lag, tidak repaint, dan sinyal tetap presisi.');
        return;
      }
      setSelectedTechniqueIds(prev => [...prev, id]);
      setErrorMessage(null);
    }
  };

  // Generate Handler
  const handleGenerate = async () => {
    if (!licenseKey.trim()) {
      setErrorMessage('Akses Terkunci: Masukkan Kunci Lisensi resmi atau Passkey VIP Anda untuk merakit indikator. Belum punya lisensi? Klik "Beli Lisensi" (Rp 175.000).');
      setShowBcaModal(true);
      return;
    }

    if (selectedTechniqueIds.length === 0) {
      setErrorMessage('Pilih minimal 1 teknik untuk merakit indikator.');
      return;
    }

    if (cooldownSeconds > 0 && !isAdminPasskey) {
      const m = Math.ceil(cooldownSeconds / 60);
      setErrorMessage(`⏳ Cooldown aktif: Silakan tunggu ${m} menit lagi sebelum membuat indikator berikutnya (Maksimal 1 jam sekali, 5x sehari).`);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setGeneratedCode(null);

    try {
      const res = await fetch('/api/indicator-maker/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          techniqueIds: selectedTechniqueIds,
          customName: customName.trim() || 'PICA_Custom_Strategy',
          licenseCode: licenseKey.trim()
        })
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        if (json.code === 'RATE_LIMIT_EXCEEDED') {
          setCooldownSeconds(json.cooldownRemainingSeconds || 3600);
          setDailyRemaining(json.dailyRemaining || 0);
        }
        throw new Error(json.message || 'Gagal merakit indikator.');
      }

      setGeneratedCode(json.data.code);
      setGeneratedFilename(json.data.filename);
      setGeneratedPlatform(json.data.platform);
      setCooldownSeconds(json.data.cooldownRemainingSeconds || 0);
      setDailyRemaining(json.data.dailyRemaining);
      if (json.data.earlyBird) {
        setEarlyBirdStats(json.data.earlyBird);
      }

      // Scroll to code result
      setTimeout(() => {
        const el = document.getElementById('code-result-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);

    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy code
  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Download File
  const handleDownloadFile = () => {
    if (!generatedCode || !generatedFilename) return;
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generatedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format countdown
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-500 selection:text-white relative">
      {/* Subtle Light Grid Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />

      {/* Top Launchpad Sticky Bar */}
      <div className="bg-white/95 border-b border-slate-200/90 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-slate-800">
            <IndicatorMakerIcon size="xs" className="text-emerald-600" />
            <span>PICA INDICATOR MAKER</span>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-slate-600 font-medium hidden sm:inline">
            100 Modul Standar Institusi • Pine v5 &amp; MT5 Engine • Anti-Repaint Confirmed Lock
          </span>
        </div>

        <div className="flex items-center gap-2">
          {earlyBirdStats.isEarlyBirdActive ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-emerald-800 font-bold text-[11px] shadow-2xs">
              <FireIcon size="xs" className="text-amber-500 inline mr-1" /><span>EARLY BIRD: Tersisa {earlyBirdStats.remainingEarlyBirdSlots} dari {earlyBirdStats.maxEarlyBirdSlots} Slot</span>
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full font-extrabold text-[10px]">
                175K LIFETIME
              </span>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-amber-800 font-bold text-[11px]">
              <span>20 Slot Terisi • Harga Normal Rp 175.000 / Bulan</span>
            </div>
          )}

          <button
            onClick={() => setShowBcaModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black px-3.5 py-1.2 rounded-full transition-all active:scale-95 shadow-sm cursor-pointer text-xs"
          >
            Beli Lisensi (BCA)
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200/90 text-blue-700 text-xs font-semibold shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full bg-blue-600 h-2 w-2" />
            </span>
            <span>INSTITUTIONAL ALGO BUILDER</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">TradingView v5 &amp; MetaTrader 5</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 font-['Space_Grotesk',system-ui,sans-serif]">
            PICA INDICATOR MAKER
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Rakit indikator Buy/Sell kustom Anda sendiri dengan <strong>100 modul formula standar institusi dunia</strong> (SMC, Order Flow, Volatilitas, &amp; Killzones). Kode terisolasi satu platform, anti-repaint terverifikasi, dan siap pakai.
          </p>

          {/* Early Bird Slot Progress Bar */}
          <div className="max-w-md mx-auto bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-700">Kuota 20 Orang Perdana (Eksklusif Lifetime):</span>
              <span className="font-extrabold text-emerald-600">{earlyBirdStats.totalSold} / {earlyBirdStats.maxEarlyBirdSlots} Slot Terisi</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/60">
              <div 
                className="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (earlyBirdStats.totalSold / earlyBirdStats.maxEarlyBirdSlots) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-left">
              💡 20 Pembeli pertama mendapatkan akses <strong>LIFETIME Rp 175.000</strong>. Setelah 20 slot selesai, harga tetap <strong>Rp 175.000 per bulan</strong>.
            </p>
          </div>
        </div>

        {/* Platform Selection Tabs (Single Output Enforced) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">LANGKAH 1: PILIH TARGET PLATFORM</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">Platform Mana Yang Ingin Anda Gunakan?</h2>
            <p className="text-xs text-slate-500 mt-1">
              *Compiler akan membuat script khusus sesuai platform yang dipilih (Hanya 1 file pine atau mq5 yang digenerate).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* TradingView Option */}
            <button
              onClick={() => setSelectedPlatform('tradingview')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                selectedPlatform === 'tradingview'
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <TradingViewIcon size="lg" />
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  selectedPlatform === 'tradingview' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  .PINE (v5)
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base">TradingView (PineScript v5)</h3>
              <p className="text-xs text-slate-600 mt-1">
                Zero-Repaint indicator dengan overlay panah BUY/SELL, dynamic SL/TP box, dan alert trigger TradingView.
              </p>
            </button>

            {/* MetaTrader 5 Option */}
            <button
              onClick={() => setSelectedPlatform('mt5')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                selectedPlatform === 'mt5'
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🤖</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  selectedPlatform === 'mt5' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  .MQ5
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base">MetaTrader 5 (MQL5)</h3>
              <p className="text-xs text-slate-600 mt-1">
                Custom Indicator MT5 dengan dual indicator buffers, arrow wingdings, dan popup alert audio MT5 desktop.
              </p>
            </button>
          </div>
        </div>

        {/* Indicator Customizer & Passkey Box */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-slate-700">Nama Indikator Anda:</label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Contoh: PICA_Institutional_Sniper"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Kunci Lisensi / Passkey:</label>
                {isAdminPasskey ? (
                  <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    ⚡ VIP UNLIMITED PASSKEY
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">
                    Passkey VIP Founder: <strong className="text-blue-600 font-mono">ARLAND77</strong> / <strong className="text-blue-600 font-mono">PICA-ADMIN</strong>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                  placeholder="Masukkan Kunci Lisensi (cth: ARLAND77 atau PICA-EB-xxxx)"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors font-mono"
                />
                <button
                  onClick={() => setShowBcaModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-xs"
                >
                  Beli Lisensi
                </button>
              </div>
            </div>
          </div>

          {/* Combo Slot Counter (Max 5 Techniques Cap) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  SLOT KOMBINASI TEKNIK:
                </span>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                  selectedTechniqueIds.length === 5 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  [{selectedTechniqueIds.length} / 5]
                </span>
                {selectedTechniqueIds.length === 5 && (
                  <span className="text-xs text-amber-700 font-medium hidden sm:inline">
                    🔒 Maksimal 5 teknik tercapai (Batas aman anti-lag &amp; anti-overfiltering)
                  </span>
                )}
              </div>

              {/* Quota & Cooldown Status */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <div className="flex items-center gap-1"><ChartIcon size="xs" className="text-blue-600" /><span>Kuota Hari ini:</span></div>
                  <span className="font-bold text-slate-900">{isAdminPasskey ? 'Unlimited' : `${dailyRemaining}/5`}</span>
                </div>
                {cooldownSeconds > 0 && !isAdminPasskey && (
                  <div className="flex items-center gap-1 text-amber-800 font-bold bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-lg">
                    <ClockIcon size="xs" className="text-amber-600" /><span>Cooldown:</span>
                    <span>{formatTime(cooldownSeconds)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Pills */}
            <div className="flex flex-wrap gap-2 min-h-[42px] p-2 bg-slate-50 rounded-xl border border-slate-200">
              {selectedTechniqueIds.length === 0 ? (
                <span className="text-xs text-slate-500 italic p-1">
                  Belum ada teknik yang dipilih. Silakan pilih 1 hingga 5 teknik di bawah.
                </span>
              ) : (
                selectedTechniqueIds.map(id => {
                  const m = INSTITUTIONAL_TECHNIQUES.find(t => t.id === id);
                  return (
                    <span 
                      key={id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-medium shadow-2xs"
                    >
                      <span>{m?.name || id}</span>
                      <button
                        onClick={() => toggleTechnique(id)}
                        className="hover:text-red-600 ml-1 font-bold text-slate-400 cursor-pointer"
                        title="Hapus teknik"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Live Interactive Chart Mockup Canvas (White/Clean Theme) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">SIMULASI ON-CHART PREVIEW</span>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border border-slate-200">
                {selectedPlatform === 'tradingview' ? 'TradingView v5 Canvas' : 'MT5 Chart Canvas'}
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-mono font-bold">
              Engine Status: READY ({selectedTechniqueIds.length} Modul Terpasang)
            </span>
          </div>

          {/* Clean Light Chart Canvas Mockup */}
          <div className="relative w-full h-64 sm:h-72 bg-slate-50/80 rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between p-4 font-mono select-none">
            {/* Top Chart Watermark */}
            <div className="flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">XAUUSD</span>
                <span className="text-slate-500">M15</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-700">{customName}</span>
              </div>
              <div className="flex items-center gap-3 font-semibold">
                <span className="text-emerald-700">O: 2914.50</span>
                <span className="text-emerald-700">H: 2928.00</span>
                <span className="text-rose-600">L: 2910.20</span>
                <span className="text-emerald-700 font-bold">C: 2924.30</span>
              </div>
            </div>

            {/* SVG Visual Candlesticks & Signal Plots */}
            <svg className="w-full h-40" viewBox="0 0 800 160">
              {/* Background Grid */}
              <line x1="0" y1="40" x2="800" y2="40" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2="800" y2="80" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="800" y2="120" stroke="#e2e8f0" strokeDasharray="3 3" />

              {/* EMA Ribbon Curve */}
              <path d="M 0 110 Q 200 120 400 80 T 800 50" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeOpacity="0.8" />
              <path d="M 0 125 Q 200 135 400 95 T 800 65" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6" />

              {/* Candles Simulation */}
              {/* Bar 1 Bear */}
              <line x1="60" y1="95" x2="60" y2="135" stroke="#ef4444" strokeWidth="1.5" />
              <rect x="54" y="105" width="12" height="20" fill="#ef4444" rx="1" />

              {/* Bar 2 Bear Sweep */}
              <line x1="120" y1="110" x2="120" y2="155" stroke="#ef4444" strokeWidth="1.5" />
              <rect x="114" y="115" width="12" height="25" fill="#ef4444" rx="1" />

              {/* Order Block Box Highlight */}
              <rect x="100" y="110" width="140" height="40" fill="#10b981" fillOpacity="0.12" stroke="#10b981" strokeDasharray="3 3" strokeWidth="1.5" />
              <text x="105" y="125" fill="#047857" fontSize="10" fontWeight="bold">SMC OB MITIGATION</text>

              {/* Bar 3 Bull Reversal */}
              <line x1="180" y1="105" x2="180" y2="148" stroke="#10b981" strokeWidth="1.5" />
              <rect x="174" y="110" width="12" height="30" fill="#10b981" rx="1" />

              {/* INSTITUTIONAL BUY ARROW */}
              <polygon points="180,158 174,166 186,166" fill="#10b981" />
              <rect x="162" y="168" width="36" height="14" fill="#10b981" rx="3" />
              <text x="180" y="178" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">BUY</text>

              {/* SL / TP Dotted Lines */}
              <line x1="180" y1="150" x2="600" y2="150" stroke="#ef4444" strokeDasharray="3 3" strokeWidth="1.5" />
              <text x="610" y="153" fill="#dc2626" fontSize="9" fontWeight="bold">SL 2910.00</text>

              <line x1="180" y1="65" x2="600" y2="65" stroke="#10b981" strokeDasharray="3 3" strokeWidth="1.5" />
              <text x="610" y="68" fill="#047857" fontSize="9" fontWeight="bold">TP1 2928.00 (1:1.5)</text>

              {/* Bar 4 Bull Impulse */}
              <line x1="240" y1="80" x2="240" y2="120" stroke="#10b981" strokeWidth="1.5" />
              <rect x="234" y="85" width="12" height="28" fill="#10b981" rx="1" />

              {/* Bar 5 Bull */}
              <line x1="300" y1="65" x2="300" y2="100" stroke="#10b981" strokeWidth="1.5" />
              <rect x="294" y="70" width="12" height="24" fill="#10b981" rx="1" />

              {/* Bar 6 Bull Breakout */}
              <line x1="360" y1="50" x2="360" y2="85" stroke="#10b981" strokeWidth="1.5" />
              <rect x="354" y="55" width="12" height="25" fill="#10b981" rx="1" />

              {/* Bar 7 High Top */}
              <line x1="420" y1="35" x2="420" y2="70" stroke="#ef4444" strokeWidth="1.5" />
              <rect x="414" y="42" width="12" height="18" fill="#ef4444" rx="1" />

              {/* INSTITUTIONAL SELL ARROW */}
              <polygon points="420,28 414,20 426,20" fill="#ef4444" />
              <rect x="402" y="4" width="36" height="14" fill="#ef4444" rx="3" />
              <text x="420" y="14" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">SELL</text>
            </svg>

            {/* Bottom HUD Telemetry Box in Chart */}
            <div className="flex items-center justify-between bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] text-slate-600 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-blue-700 font-bold">PICA HUD:</span>
                <span>BIAS: <strong className="text-emerald-600">BULLISH</strong></span>
                <span>•</span>
                <span>ATR: <strong className="text-indigo-600">2.85 pts</strong></span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">
                Zero-Repaint Confirmed Candle Lock
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills & Search */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>KATALOG FORMULA INSTITUSI</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                100 Modul Lengkap
              </span>
            </h2>

            {/* Search Input */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari formula / indikator..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Filter Pills for 100 Modules */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Semua Formula (100)' },
              { id: 'smc', label: 'Smart Money (SMC) (25)' },
              { id: 'orderflow', label: 'Order Flow & Volume (20)' },
              { id: 'volatility', label: 'Volatilitas & Math (15)' },
              { id: 'sessions', label: 'Sessions & Killzones (15)' },
              { id: 'trend', label: 'Trend & Momentum (15)' },
              { id: 'execution', label: 'Risk & Eksekusi (10)' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Technique Modules Grid (100 Accurate Visual Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map(module => {
            const isSelected = selectedTechniqueIds.includes(module.id);
            const isLocked = !isSelected && selectedTechniqueIds.length >= 5;

            return (
              <div
                key={module.id}
                onClick={() => !isLocked && toggleTechnique(module.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                  isSelected
                    ? 'bg-emerald-50/40 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500'
                    : isLocked
                    ? 'bg-slate-100/60 border-slate-200 opacity-50 cursor-not-allowed'
                    : 'bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-md shadow-2xs'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                      {module.badge}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-500">
                      TF: {module.recommendedTf}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                    {module.name}
                  </h3>

                  {/* Accurate Visual Pattern Diagram Mockup (SVG Preview on Light Canvas) */}
                  <div className="my-3 w-full h-20 bg-slate-50 rounded-xl border border-slate-200/90 overflow-hidden flex items-center justify-center relative p-2 shadow-inner">
                    <DiagramMockup pattern={module.visualPattern} />
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {module.description}
                  </p>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">
                    ID: {module.id}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : isLocked
                      ? 'bg-slate-200 text-slate-500'
                      : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200'
                  }`}>
                    {isSelected ? '✓ Terpilih' : isLocked ? 'Maksimal 5' : '+ Pilih Teknik'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-300 rounded-2xl p-4 text-red-800 text-xs flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button 
              onClick={() => setErrorMessage(null)} 
              className="text-red-500 hover:text-red-800 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Big Action Bar */}
        <div className="sticky bottom-4 z-30 bg-white/95 border border-slate-200 rounded-3xl p-4 shadow-xl shadow-slate-300/40 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-center shadow-2xs">
              <IndicatorMakerIcon size="md" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">
                Siap Merakit: {selectedPlatform === 'tradingview' ? 'TradingView (Pine v5)' : 'MetaTrader 5 (.mq5)'}
              </p>
              <p className="text-[11px] text-slate-500">
                {selectedTechniqueIds.length} formula institusi dipilih • Kuota: {isAdminPasskey ? 'Unlimited' : `${dailyRemaining}/5 hari ini`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {cooldownSeconds > 0 && !isAdminPasskey ? (
              <div className="flex-1 sm:flex-initial text-center bg-amber-50 border border-amber-300 text-amber-800 px-4 py-2.5 rounded-2xl text-xs font-bold">
                ⏳ Cooldown aktif: {formatTime(cooldownSeconds)}
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isLoading || selectedTechniqueIds.length === 0}
                className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-black px-6 py-3 rounded-2xl text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>MERAKIT SCRIPT...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ RAKIT &amp; GENERATE INDIKATOR</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Code Result Section */}
        {generatedCode && (
          <div id="code-result-section" className="bg-white border border-emerald-400 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-lg">🎉</span>
                  <h3 className="text-lg font-black text-slate-900">Indikator Berhasil Dirakit!</h3>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  File: <strong className="text-emerald-700">{generatedFilename}</strong> ({generatedPlatform.toUpperCase()})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{copySuccess ? '✓ TERSALIN!' : '📋 Salin Kode'}</span>
                </button>

                <button
                  onClick={handleDownloadFile}
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>💾 Unduh File ({generatedFilename?.split('.').pop()?.toUpperCase()})</span>
                </button>

                <button
                  onClick={() => setShowInstallGuide(true)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-2 rounded-xl border border-blue-200 transition-all cursor-pointer"
                >
                  📖 Panduan Pasang
                </button>
              </div>
            </div>

            {/* Syntax Viewer Box */}
            <div className="relative bg-slate-900 rounded-2xl border border-slate-800 p-4 max-h-96 overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed">
              <pre className="whitespace-pre">{generatedCode}</pre>
            </div>
          </div>
        )}
      </main>

      {/* BCA Payment Modal */}
      {showBcaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-in zoom-in-95">
            <button
              onClick={() => setShowBcaModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full">
                LISENSI RESMI PICA INDICATOR MAKER
              </span>
              <h3 className="text-xl font-black text-slate-900">Pembayaran &amp; Aktivasi Instan</h3>
              <p className="text-xs text-slate-500">
                Akses tanpa batas ke 100 modul formula kuantitatif TradingView &amp; MetaTrader 5.
              </p>
            </div>

            {/* Pricing Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs text-slate-600">Paket:</span>
                <span className="text-xs font-extrabold text-emerald-700">
                  {earlyBirdStats.isEarlyBirdActive ? 'Early Bird 20 Slot (LIFETIME)' : 'Reguler Bulanan'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Biaya Investasi:</span>
                <span className="text-lg font-black text-slate-900">
                  Rp 175.000 <span className="text-xs text-slate-500 font-normal">{earlyBirdStats.isEarlyBirdActive ? 'Sekali Bayar (Lifetime)' : '/ Bulan'}</span>
                </span>
              </div>
            </div>

            {/* Bank BCA Account */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-200 space-y-2">
              <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Transfer Bank BCA</p>
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
                <div>
                  <p className="text-base font-mono font-black text-slate-900 tracking-widest">1392698188</p>
                  <p className="text-xs text-slate-500">a.n. ARLAND PRATAMA MULDIAWAN</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('1392698188');
                    alert('Nomor rekening BCA 1392698188 berhasil disalin!');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer shadow-xs"
                >
                  Salin No. Rek
                </button>
              </div>
            </div>

            {/* Confirmation Link */}
            <div className="space-y-2">
              <a
                href={`https://t.me/arra7trader?text=${encodeURIComponent('Halo Bang Arland (@arra7trader), saya mau konfirmasi pembayaran PICA INDICATOR MAKER Rp 175.000 via BCA 1392698188. Mohon kunci lisensinya ya!')}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span>💬 Konfirmasi via Telegram (@arra7trader)</span>
              </a>
              <p className="text-[11px] text-slate-500 text-center">
                Setelah bukti transfer dikirim, Bang Arland akan langsung memberikan Passkey Lisensi untuk dimasukkan di web ini.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Installation Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full">
                TUTORIAL PEMASANGAN
              </span>
              <h3 className="text-xl font-black text-slate-900">Cara Pasang Indikator Hasil Rakitan</h3>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              {/* TradingView Guide */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-emerald-700 text-sm flex items-center gap-2">
                  <TradingViewIcon size="sm" />
                  <span>Cara Pasang di TradingView:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                  <li>Buka chart pasangan mata uang / Gold di <strong>TradingView</strong>.</li>
                  <li>Di bagian bawah chart, klik tab <strong>Pine Editor</strong>.</li>
                  <li>Hapus semua teks bawaan, lalu <strong>Paste (Tempel)</strong> seluruh kode yang telah disalin.</li>
                  <li>Klik tombol <strong>Save</strong> lalu klik <strong>Add to Chart</strong>.</li>
                  <li>Sinyal panah BUY &amp; SELL, level SL/TP, serta HUD Telemetry akan langsung muncul di chart!</li>
                </ol>
              </div>

              {/* MT5 Guide */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-blue-700 text-sm flex items-center gap-2">
                  <MetaTraderIcon size="sm" />
                  <span>Cara Pasang di MetaTrader 5 (MT5):</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                  <li>Buka MetaTrader 5 desktop Anda, lalu tekan tombol <strong>F4</strong> untuk membuka <strong>MetaEditor</strong>.</li>
                  <li>Klik <strong>File &gt; New &gt; Custom Indicator</strong>, beri nama sesuai indikator Anda, lalu klik Finish.</li>
                  <li>Hapus semua isi file template, lalu <strong>Paste</strong> seluruh kode <code>.mq5</code> yang sudah diunduh/disalin.</li>
                  <li>Tekan tombol <strong>F7 (Compile)</strong> sampai tertulis <em>0 errors, 0 warnings</em>.</li>
                  <li>Kembali ke MT5, buka Navigator (Ctrl+N), cari indikator di folder <strong>Indicators</strong>, lalu drag ke chart!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 🎨 ACCURATE SVG DIAGRAM MOCKUP RENDERER FOR ALL 100 MODULES
// Every pattern has a specific, clear vector visualization
// ==============================================================================
function DiagramMockup({ pattern }: { pattern: string }) {
  switch (pattern) {
    // --- 1. Fair Value Gap (FVG) ---
    case 'fvg':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="25" y1="36" x2="25" y2="16" stroke="#ef4444" strokeWidth="2" />
          <rect x="21" y="22" width="8" height="12" fill="#ef4444" rx="1" />
          <line x1="75" y1="46" x2="75" y2="4" stroke="#10b981" strokeWidth="2.5" />
          <rect x="70" y="8" width="10" height="34" fill="#10b981" rx="1" />
          <line x1="125" y1="32" x2="125" y2="12" stroke="#10b981" strokeWidth="2" />
          <rect x="121" y="16" width="8" height="12" fill="#10b981" rx="1" />
          <rect x="29" y="16" width="92" height="16" fill="#facc15" fillOpacity="0.25" stroke="#eab308" strokeDasharray="3 3" />
          <text x="75" y="27" fill="#ca8a04" fontSize="8" fontWeight="bold" textAnchor="middle">FVG IMBALANCE</text>
        </svg>
      );

    // --- 2. Order Block (OB) ---
    case 'order_block':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="15" y="22" width="16" height="20" fill="#ef4444" fillOpacity="0.8" rx="1" />
          <line x1="23" y1="16" x2="23" y2="44" stroke="#ef4444" strokeWidth="1.5" />
          <rect x="15" y="22" width="115" height="20" fill="#10b981" fillOpacity="0.12" stroke="#10b981" strokeDasharray="2 2" />
          <path d="M 31 24 L 60 6 L 90 8 L 115 32 L 145 10" fill="none" stroke="#10b981" strokeWidth="2" />
          <polygon points="115,32 110,26 120,26" fill="#10b981" />
          <text x="70" y="35" fill="#047857" fontSize="7.5" fontWeight="bold">MITIGATION RETEST</text>
        </svg>
      );

    // --- 3. Break of Structure (BOS) ---
    case 'bos':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 15 42 L 55 16 L 85 30 L 145 6" fill="none" stroke="#2563eb" strokeWidth="2" />
          <line x1="55" y1="16" x2="150" y2="16" stroke="#dc2626" strokeDasharray="3 3" strokeWidth="1.5" />
          <polygon points="145,6 137,8 141,14" fill="#2563eb" />
          <rect x="85" y="7" width="34" height="12" fill="#dbeafe" rx="2" />
          <text x="102" y="16" fill="#1d4ed8" fontSize="8" fontWeight="bold" textAnchor="middle">BOS ↑</text>
        </svg>
      );

    // --- 4. Change of Character (CHoCH) ---
    case 'choch':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 15 14 L 55 40 L 85 24 L 145 46" fill="none" stroke="#dc2626" strokeWidth="2" />
          <line x1="55" y1="40" x2="150" y2="40" stroke="#2563eb" strokeDasharray="3 3" strokeWidth="1.5" />
          <polygon points="145,46 137,44 141,38" fill="#dc2626" />
          <rect x="85" y="32" width="40" height="12" fill="#fee2e2" rx="2" />
          <text x="105" y="41" fill="#b91c1c" fontSize="8" fontWeight="bold" textAnchor="middle">CHoCH ↓</text>
        </svg>
      );

    // --- 5. Liquidity Sweep ---
    case 'liq_sweep':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="15" y1="18" x2="150" y2="18" stroke="#f59e0b" strokeDasharray="3 3" strokeWidth="1.5" />
          <text x="25" y="13" fill="#b45309" fontSize="7.5" fontWeight="bold">BUY-SIDE LIQUIDITY (BSL)</text>
          <line x1="85" y1="45" x2="85" y2="4" stroke="#dc2626" strokeWidth="1.5" />
          <rect x="80" y="20" width="10" height="20" fill="#dc2626" rx="1" />
          <polygon points="85,3 81,9 89,9" fill="#f59e0b" />
          <path d="M 95 18 Q 115 22 135 44" fill="none" stroke="#dc2626" strokeWidth="2" />
          <text x="105" y="32" fill="#dc2626" fontSize="7.5" fontWeight="bold">REJECTION</text>
        </svg>
      );

    // --- 6. Breaker Block ---
    case 'breaker_block':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="40" y="20" width="80" height="15" fill="#f43f5e" fillOpacity="0.15" stroke="#f43f5e" strokeDasharray="2 2" />
          <path d="M 15 38 L 45 10 L 80 44 L 115 20 L 145 6" fill="none" stroke="#10b981" strokeWidth="2" />
          <circle cx="115" cy="20" r="3.5" fill="#10b981" />
          <text x="80" y="31" fill="#be123c" fontSize="7.5" fontWeight="bold" textAnchor="middle">BREAKER FLIP</text>
        </svg>
      );

    // --- 7. Mitigation Block ---
    case 'mitigation_block':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="35" y="24" width="85" height="14" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeDasharray="2 2" />
          <path d="M 15 42 L 50 18 L 75 32 L 105 24 L 145 8" fill="none" stroke="#2563eb" strokeWidth="2" />
          <text x="75" y="34" fill="#1d4ed8" fontSize="7.5" fontWeight="bold" textAnchor="middle">UNSWEPT MITIGATION</text>
        </svg>
      );

    // --- 8. Liquidity Void ---
    case 'liquidity_void':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="45" y="6" width="70" height="38" fill="#e0e7ff" stroke="#6366f1" strokeDasharray="2 2" />
          <line x1="20" y1="42" x2="45" y2="42" stroke="#64748b" strokeWidth="2" />
          <path d="M 45 42 L 80 8 L 115 36 L 145 12" fill="none" stroke="#4f46e5" strokeWidth="2" />
          <text x="80" y="26" fill="#4338ca" fontSize="7.5" fontWeight="bold" textAnchor="middle">VOID FILL CORRIDOR</text>
        </svg>
      );

    // --- 9. Judas Swing ---
    case 'judas_swing':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="15" y="16" width="45" height="20" fill="#f1f5f9" stroke="#94a3b8" strokeDasharray="2 2" />
          <text x="37" y="28" fill="#64748b" fontSize="7" textAnchor="middle">ASIA BOX</text>
          <path d="M 60 25 L 85 45 L 105 10 L 145 6" fill="none" stroke="#10b981" strokeWidth="2" />
          <polygon points="85,45 80,38 90,38" fill="#ef4444" />
          <text x="95" y="44" fill="#dc2626" fontSize="7" fontWeight="bold">FAKE DROP</text>
        </svg>
      );

    // --- 10. Premium vs Discount ---
    case 'premium_discount':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="15" y="6" width="130" height="18" fill="#fee2e2" />
          <text x="80" y="18" fill="#dc2626" fontSize="7.5" fontWeight="bold" textAnchor="middle">PREMIUM ARRAY (&gt;50% SELL)</text>
          <line x1="15" y1="24" x2="145" y2="24" stroke="#64748b" strokeDasharray="3 3" strokeWidth="1.5" />
          <rect x="15" y="25" width="130" height="19" fill="#dcfce7" />
          <text x="80" y="37" fill="#15803d" fontSize="7.5" fontWeight="bold" textAnchor="middle">DISCOUNT ARRAY (&lt;50% BUY)</text>
        </svg>
      );

    // --- 11. Inducement (IDM) ---
    case 'inducement':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 15 42 L 45 15 L 70 34 L 95 24 L 115 44 L 145 8" fill="none" stroke="#2563eb" strokeWidth="2" />
          <line x1="60" y1="34" x2="80" y2="34" stroke="#f59e0b" strokeWidth="2" />
          <text x="70" y="44" fill="#b45309" fontSize="7" fontWeight="bold" textAnchor="middle">IDM TRAP</text>
          <rect x="105" y="38" width="20" height="10" fill="#10b981" fillOpacity="0.2" stroke="#10b981" />
        </svg>
      );

    // --- 12. Silver Bullet ---
    case 'silver_bullet':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="35" y="8" width="90" height="34" fill="#f8fafc" stroke="#0ea5e9" strokeWidth="1.5" rx="3" />
          <text x="80" y="18" fill="#0284c7" fontSize="7.5" fontWeight="black" textAnchor="middle">ICT 1-HR WINDOW</text>
          <rect x="55" y="22" width="30" height="12" fill="#fef08a" stroke="#ca8a04" strokeDasharray="2 2" />
          <path d="M 25 36 L 65 24 L 105 12 L 135 14" fill="none" stroke="#10b981" strokeWidth="2" />
          <polygon points="105,12 97,14 101,20" fill="#10b981" />
        </svg>
      );

    // --- 13. Inverted FVG ---
    case 'ifvg':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="25" y="18" width="110" height="14" fill="#ccfbf1" stroke="#0d9488" strokeDasharray="2 2" />
          <path d="M 15 36 L 45 22 L 75 8 L 105 20 L 145 10" fill="none" stroke="#0d9488" strokeWidth="2" />
          <circle cx="105" cy="20" r="3" fill="#0d9488" />
          <text x="80" y="28" fill="#0f766e" fontSize="7.5" fontWeight="bold" textAnchor="middle">iFVG SUPPORT FLIP</text>
        </svg>
      );

    // --- 14. Equal Highs & Lows ---
    case 'equal_hl':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 15 15 L 45 38 L 75 18 L 105 38 L 125 44 L 145 8" fill="none" stroke="#2563eb" strokeWidth="2" />
          <line x1="35" y1="38" x2="115" y2="38" stroke="#f59e0b" strokeDasharray="3 3" strokeWidth="1.5" />
          <text x="75" y="47" fill="#b45309" fontSize="7.5" fontWeight="bold" textAnchor="middle">EQUAL LOWS (SSL SWEEP)</text>
        </svg>
      );

    // --- 15. Balanced Price Delivery (BPR) ---
    case 'bpr':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="30" y="14" width="60" height="12" fill="#dbeafe" stroke="#3b82f6" strokeDasharray="2 2" />
          <rect x="60" y="22" width="60" height="12" fill="#fef3c7" stroke="#f59e0b" strokeDasharray="2 2" />
          <line x1="15" y1="40" x2="145" y2="10" stroke="#10b981" strokeWidth="2" />
          <text x="80" y="23" fill="#1d4ed8" fontSize="7.5" fontWeight="bold" textAnchor="middle">BPR OVERLAP</text>
        </svg>
      );

    // --- 16. Rejection Block ---
    case 'rejection_block':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="80" y1="6" x2="80" y2="44" stroke="#10b981" strokeWidth="2" />
          <rect x="74" y="6" width="12" height="10" fill="#10b981" rx="1" />
          <line x1="20" y1="44" x2="140" y2="44" stroke="#64748b" strokeDasharray="2 2" />
          <text x="80" y="36" fill="#047857" fontSize="7.5" fontWeight="bold" textAnchor="middle">LONG WICK REJECTION</text>
        </svg>
      );

    // --- 17. Propulsion Block ---
    case 'propulsion_block':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="25" y="20" width="30" height="22" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" />
          <rect x="35" y="24" width="16" height="14" fill="#10b981" fillOpacity="0.5" stroke="#10b981" />
          <path d="M 51 28 L 85 8 L 115 10 L 145 4" fill="none" stroke="#10b981" strokeWidth="2.5" />
          <text x="95" y="24" fill="#047857" fontSize="7.5" fontWeight="bold">PROPULSION SPEED</text>
        </svg>
      );

    // --- 18. Vacuum Block ---
    case 'vacuum_block':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="45" y1="36" x2="45" y2="20" stroke="#ef4444" strokeWidth="2" />
          <rect x="40" y="24" width="10" height="12" fill="#ef4444" />
          <line x1="105" y1="16" x2="105" y2="4" stroke="#10b981" strokeWidth="2" />
          <rect x="100" y="6" width="10" height="10" fill="#10b981" />
          <line x1="55" y1="20" x2="95" y2="20" stroke="#8b5cf6" strokeDasharray="2 2" strokeWidth="1.5" />
          <text x="75" y="32" fill="#6d28d9" fontSize="7.5" fontWeight="bold" textAnchor="middle">VACUUM GAP</text>
        </svg>
      );

    // --- 19. Daily Bias SMC ---
    case 'daily_bias':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 15 40 Q 80 32 145 8" fill="none" stroke="#10b981" strokeWidth="3" />
          <path d="M 15 45 Q 80 40 145 18" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3 3" />
          <text x="80" y="24" fill="#047857" fontSize="8" fontWeight="black" textAnchor="middle">HTF BIAS: BULLISH</text>
        </svg>
      );

    // --- 20. Internal BOS ---
    case 'internal_bos':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 15 44 L 45 32 L 65 38 L 95 22 L 115 28 L 145 8" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
          <line x1="45" y1="32" x2="95" y2="32" stroke="#0284c7" strokeDasharray="2 2" />
          <text x="70" y="29" fill="#0369a1" fontSize="7" fontWeight="bold">iBOS ↑</text>
        </svg>
      );

    // --- 21. Dealing Range Projection ---
    case 'dealing_range':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="20" y1="10" x2="140" y2="10" stroke="#10b981" strokeDasharray="2 2" />
          <text x="142" y="13" fill="#047857" fontSize="7">2.0x</text>
          <line x1="20" y1="25" x2="140" y2="25" stroke="#3b82f6" strokeDasharray="2 2" />
          <text x="142" y="28" fill="#1d4ed8" fontSize="7">1.0x</text>
          <line x1="20" y1="40" x2="140" y2="40" stroke="#64748b" strokeDasharray="2 2" />
          <text x="142" y="43" fill="#475569" fontSize="7">0.0x</text>
          <path d="M 25 38 L 65 24 L 110 10" fill="none" stroke="#2563eb" strokeWidth="2" />
        </svg>
      );

    // --- 22. Turtle Soup Plus ---
    case 'turtle_soup':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="15" y1="36" x2="145" y2="36" stroke="#f59e0b" strokeDasharray="3 3" strokeWidth="1.5" />
          <text x="75" y="32" fill="#b45309" fontSize="7" fontWeight="bold" textAnchor="middle">20-DAY LOW LINE</text>
          <path d="M 45 22 L 75 44 L 95 14 L 135 8" fill="none" stroke="#10b981" strokeWidth="2" />
          <circle cx="75" cy="44" r="3" fill="#ef4444" />
        </svg>
      );

    // --- 23. SMT Divergence ---
    case 'smt_divergence':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          {/* Asset 1 Higher High */}
          <path d="M 15 22 L 45 10 L 70 18 L 85 6" fill="none" stroke="#10b981" strokeWidth="1.5" />
          <line x1="45" y1="10" x2="85" y2="6" stroke="#10b981" strokeDasharray="2 2" />
          {/* Asset 2 Lower High */}
          <path d="M 90 14 L 115 10 L 135 18 L 150 14" fill="none" stroke="#ef4444" strokeWidth="1.5" />
          <line x1="115" y1="10" x2="150" y2="14" stroke="#ef4444" strokeDasharray="2 2" />
          <text x="80" y="42" fill="#4338ca" fontSize="7.5" fontWeight="bold" textAnchor="middle">SMT CRACK DIVERGENCE</text>
        </svg>
      );

    // --- 24. OTE Fib ---
    case 'ote_fib':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="20" y="16" width="120" height="14" fill="#fef08a" fillOpacity="0.5" stroke="#ca8a04" strokeDasharray="2 2" />
          <text x="80" y="26" fill="#854d0e" fontSize="7.5" fontWeight="bold" textAnchor="middle">OTE GOLDEN ZONE 62%-79%</text>
          <path d="M 15 42 L 55 10 L 90 24 L 140 6" fill="none" stroke="#10b981" strokeWidth="2" />
        </svg>
      );

    // --- 25. Midnight Open ---
    case 'midnight_open':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="15" y1="25" x2="145" y2="25" stroke="#0284c7" strokeWidth="2" />
          <text x="80" y="21" fill="#0369a1" fontSize="7.5" fontWeight="bold" textAnchor="middle">NY 00:00 MIDNIGHT OPEN</text>
          <path d="M 25 36 L 55 25 L 85 32 L 125 10" fill="none" stroke="#10b981" strokeWidth="2" />
        </svg>
      );

    // --- 26. CVD Divergence ---
    case 'delta_divergence':
    case 'cvd_trend':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          {/* Price Lower Low */}
          <path d="M 15 16 L 45 28 L 75 18 L 105 34" fill="none" stroke="#ef4444" strokeWidth="1.5" />
          <line x1="45" y1="28" x2="105" y2="34" stroke="#ef4444" strokeDasharray="2 2" />
          {/* CVD Delta Higher Low */}
          <path d="M 15 42 L 45 42 L 75 36 L 105 30 L 145 15" fill="none" stroke="#10b981" strokeWidth="2" />
          <line x1="45" y1="42" x2="105" y2="30" stroke="#10b981" strokeDasharray="2 2" />
          <text x="130" y="42" fill="#047857" fontSize="7" fontWeight="bold">DELTA DIV</text>
        </svg>
      );

    // --- 27. Point of Control (POC) ---
    case 'poc_profile':
    case 'value_area':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          {/* Volume Profile Bars on Left */}
          <rect x="15" y="8" width="30" height="5" fill="#cbd5e1" />
          <rect x="15" y="15" width="55" height="5" fill="#cbd5e1" />
          <rect x="15" y="22" width="85" height="6" fill="#ef4444" />
          <rect x="15" y="30" width="45" height="5" fill="#cbd5e1" />
          <rect x="15" y="37" width="25" height="5" fill="#cbd5e1" />
          <line x1="15" y1="25" x2="145" y2="25" stroke="#ef4444" strokeWidth="1.5" />
          <text x="120" y="22" fill="#dc2626" fontSize="7.5" fontWeight="bold">POC LINE</text>
          <path d="M 75 40 L 95 25 L 135 12" fill="none" stroke="#10b981" strokeWidth="2" />
        </svg>
      );

    // --- 28. Volume Absorption ---
    case 'absorption':
    case 'volume_climax':
    case 'volume_exhaustion':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="15" y1="16" x2="145" y2="16" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="2 2" />
          <rect x="65" y="16" width="14" height="24" fill="#ef4444" rx="1" />
          {/* Giant Volume Bar Below */}
          <rect x="67" y="40" width="10" height="9" fill="#2563eb" />
          <path d="M 79 26 Q 105 32 135 44" fill="none" stroke="#dc2626" strokeWidth="2" />
          <text x="110" y="30" fill="#b91c1c" fontSize="7.5" fontWeight="bold">ABSORPTION</text>
        </svg>
      );

    // --- 29. VWAP Bands & Anchored VWAP ---
    case 'vwap_bands':
    case 'anchored_vwap':
    case 'vwap_cross':
    case 'vwap_pinch':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          {/* Center VWAP */}
          <path d="M 15 32 Q 80 20 145 14" fill="none" stroke="#2563eb" strokeWidth="2" />
          {/* Upper +2 Sigma */}
          <path d="M 15 20 Q 80 10 145 4" fill="none" stroke="#0ea5e9" strokeDasharray="2 2" />
          {/* Lower -2 Sigma */}
          <path d="M 15 44 Q 80 30 145 24" fill="none" stroke="#0ea5e9" strokeDasharray="2 2" />
          {/* Bounce Candle */}
          <circle cx="80" cy="20" r="3" fill="#10b981" />
          <text x="80" y="38" fill="#1d4ed8" fontSize="7.5" fontWeight="bold" textAnchor="middle">VWAP BOUNCE</text>
        </svg>
      );

    // --- 30. TTM Squeeze ---
    case 'ttm_squeeze':
    case 'squeeze':
    case 'bb_squeeze':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          {/* Squeeze Bands */}
          <path d="M 15 12 Q 75 22 145 8" fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
          <path d="M 15 38 Q 75 28 145 42" fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
          {/* Squeeze Dots */}
          <circle cx="50" cy="25" r="2.5" fill="#ef4444" />
          <circle cx="65" cy="25" r="2.5" fill="#ef4444" />
          <circle cx="80" cy="25" r="2.5" fill="#10b981" />
          <circle cx="95" cy="25" r="2.5" fill="#10b981" />
          {/* Momentum Histogram Bars */}
          <rect x="78" y="16" width="4" height="9" fill="#06b6d4" />
          <rect x="93" y="12" width="4" height="13" fill="#06b6d4" />
          <rect x="108" y="8" width="4" height="17" fill="#06b6d4" />
          <text x="125" y="30" fill="#0891b2" fontSize="7" fontWeight="bold">FIRED ↑</text>
        </svg>
      );

    // --- 31. Supertrend & Trailing Systems ---
    case 'supertrend':
    case 'chandelier_exit':
    case 'atr_bands':
    case 'trailing_lock':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 15 40 L 45 28 L 75 32 L 115 16 L 145 8" fill="none" stroke="#64748b" strokeWidth="1.5" />
          {/* Stepped Supertrend Line */}
          <path d="M 15 44 H 45 V 34 H 75 V 36 H 115 V 22 H 145" fill="none" stroke="#10b981" strokeWidth="2.5" />
          <polygon points="115,16 111,10 119,10" fill="#10b981" />
          <text x="80" y="47" fill="#047857" fontSize="7.5" fontWeight="bold" textAnchor="middle">ADAPTIVE TRAILING</text>
        </svg>
      );

    // --- 32. Sessions & Killzones ---
    case 'london_killzone':
    case 'ny_killzone':
    case 'asia_range':
    case 'ny_pm_killzone':
    case 'daily_open':
    case 'prev_day_hl':
    case 'prev_week_hl':
    case 'weekend_gap':
    case 'london_fix':
    case 'tokyo_lunch':
    case 'cme_open':
    case 'weekly_open':
    case 'amd_cycle':
    case 'cbdr':
    case 'macro_hours':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="25" y="12" width="65" height="26" fill="#e0f2fe" stroke="#38bdf8" strokeDasharray="2 2" rx="2" />
          <text x="57" y="27" fill="#0284c7" fontSize="7.5" fontWeight="black" textAnchor="middle">KZ WINDOW</text>
          <path d="M 90 25 L 115 10 L 145 6" fill="none" stroke="#10b981" strokeWidth="2.5" />
          <polygon points="145,6 137,8 141,14" fill="#10b981" />
          <text x="125" y="32" fill="#047857" fontSize="7" fontWeight="bold">EXPANSION</text>
        </svg>
      );

    // --- 33. Triple EMA & Ribbon Matrix ---
    case 'triple_ema':
    case 'ema_ribbon':
    case 'hull_ma':
    case 'kama_adaptive':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 15 44 Q 80 26 145 8" fill="none" stroke="#10b981" strokeWidth="2.5" />
          <path d="M 15 46 Q 80 32 145 16" fill="none" stroke="#0ea5e9" strokeWidth="2" />
          <path d="M 15 48 Q 80 38 145 24" fill="none" stroke="#6366f1" strokeWidth="1.5" />
          <text x="80" y="16" fill="#047857" fontSize="7.5" fontWeight="bold" textAnchor="middle">EMA MATRIX EXPANSION</text>
        </svg>
      );

    // --- 34. Dynamic ATR SL/TP & Execution ---
    case 'atr_sl':
    case 'risk_ratio':
    case 'breakeven':
    case 'partial_tp':
    case 'session_close':
    case 'killswitch':
    case 'spread_guard':
    case 'capital_sizing':
    case 'slippage_guard':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="20" y1="12" x2="140" y2="12" stroke="#10b981" strokeDasharray="3 3" strokeWidth="2" />
          <text x="142" y="15" fill="#047857" fontSize="8" fontWeight="bold">TP 1:2</text>
          <line x1="20" y1="26" x2="140" y2="26" stroke="#2563eb" strokeWidth="1.5" />
          <text x="142" y="29" fill="#1d4ed8" fontSize="8" fontWeight="bold">ENTRY</text>
          <line x1="20" y1="40" x2="140" y2="40" stroke="#ef4444" strokeDasharray="3 3" strokeWidth="2" />
          <text x="142" y="43" fill="#dc2626" fontSize="8" fontWeight="bold">SL ATR</text>
        </svg>
      );

    // --- Fallback Dynamic Vector ---
    default:
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 20 38 L 60 22 L 100 30 L 140 10" fill="none" stroke="#10b981" strokeWidth="2" />
          <circle cx="140" cy="10" r="3.5" fill="#10b981" />
          <line x1="20" y1="25" x2="140" y2="25" stroke="#cbd5e1" strokeDasharray="2 2" />
        </svg>
      );
  }
}
