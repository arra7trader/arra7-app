'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { INSTITUTIONAL_TECHNIQUES, getTechniquesByCategory } from '@/lib/indicator-maker/catalog';
import { PlatformTarget, TechniqueCategory, TechniqueModule } from '@/lib/indicator-maker/types';

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

  // Filtered technique modules
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
        setErrorMessage('Maksimal 5 teknik! Membatasi combo teknik memastikan indikator tidak lag dan sinyal tetap presisi.');
        return;
      }
      setSelectedTechniqueIds(prev => [...prev, id]);
      setErrorMessage(null);
    }
  };

  // Generate Handler
  const handleGenerate = async () => {
    if (selectedTechniqueIds.length === 0) {
      setErrorMessage('Pilih minimal 1 teknik untuk merakit indikator.');
      return;
    }

    if (cooldownSeconds > 0 && !isAdminPasskey) {
      const m = Math.ceil(cooldownSeconds / 60);
      setErrorMessage(`⏳ Cooldown aktif: Silakan tunggu ${m} menit lagi sebelum membuat indikator berikutnya.`);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />

      {/* Top Launchpad Sticky Bar */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 border-b border-emerald-500/30 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-extrabold uppercase tracking-wider text-emerald-400">PICA QUANT FORGE</span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300 font-medium hidden sm:inline">
            50 Institutional Modules • PineScript v5 &amp; MQL5 Engine • Zero-Repaint Lock
          </span>
        </div>

        <div className="flex items-center gap-2">
          {earlyBirdStats.isEarlyBirdActive ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-emerald-300 font-bold text-[11px]">
              <span>🔥 EARLY BIRD: Tersisa {earlyBirdStats.remainingEarlyBirdSlots} dari {earlyBirdStats.maxEarlyBirdSlots} Slot</span>
              <span className="bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-extrabold">175K LIFETIME</span>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-amber-300 font-bold text-[11px]">
              <span>20 Early Bird Terisi Penuh • Harga Normal Rp 175.000 / Bulan</span>
            </div>
          )}

          <button
            onClick={() => setShowBcaModal(true)}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black px-3 py-1 rounded-full transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            Beli Lisensi (BCA)
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-emerald-400 text-xs font-semibold">
            <span>⚡ Institutional Algo Builder</span>
            <span>•</span>
            <span className="text-slate-300">TradingView &amp; MetaTrader 5</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            PICA INDICATOR MAKER
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Rakit indikator Buy/Sell kustom Anda sendiri dengan formula standar institusi dunia (SMC, Order Flow, Volatilitas, &amp; Killzones). Kode terisolasi satu platform, zero-repaint, dan siap pakai.
          </p>

          {/* Early Bird Slot Progress Bar */}
          <div className="max-w-md mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-300">Kuota 20 Orang Perdana (Lifetime):</span>
              <span className="font-extrabold text-emerald-400">{earlyBirdStats.totalSold} / {earlyBirdStats.maxEarlyBirdSlots} Slot</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (earlyBirdStats.totalSold / earlyBirdStats.maxEarlyBirdSlots) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-left">
              💡 20 Pembeli pertama mendapatkan akses <strong>LIFETIME Rp 175.000</strong>. Setelah slot habis, harga otomatis menjadi <strong>Rp 175.000 / Bulan</strong>.
            </p>
          </div>
        </div>

        {/* Platform Selection Tabs (Single Output Enforced) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">LANGKAH 1: PILIH TARGET PLATFORM</span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Platform Mana Yang Ingin Anda Gunakan?</h2>
            <p className="text-xs text-slate-400 mt-1">
              *Compiler akan membuat script khusus sesuai platform yang dipilih (Hanya 1 file yang digenerate).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* TradingView Option */}
            <button
              onClick={() => setSelectedPlatform('tradingview')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                selectedPlatform === 'tradingview'
                  ? 'border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">📈</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                  selectedPlatform === 'tradingview' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  .PINE (v5)
                </span>
              </div>
              <h3 className="font-bold text-white text-base">TradingView (PineScript v5)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Zero-Repaint indicator dengan overlay panah BUY/SELL, dynamic SL/TP box, dan alert trigger TradingView.
              </p>
            </button>

            {/* MetaTrader 5 Option */}
            <button
              onClick={() => setSelectedPlatform('mt5')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                selectedPlatform === 'mt5'
                  ? 'border-blue-500 bg-blue-950/30 shadow-lg shadow-blue-500/10'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🤖</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                  selectedPlatform === 'mt5' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  .MQ5
                </span>
              </div>
              <h3 className="font-bold text-white text-base">MetaTrader 5 (MQL5)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Custom Indicator MT5 dengan dual indicator buffers, arrow wingdings, dan popup alert audio MT5 desktop.
              </p>
            </button>
          </div>
        </div>

        {/* Indicator Customizer & Passkey Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-slate-300">Nama Indikator Anda:</label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Contoh: PICA_Institutional_Sniper"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Kunci Lisensi / Passkey:</label>
                {isAdminPasskey && (
                  <span className="text-[10px] font-black text-amber-400 bg-amber-950/60 border border-amber-600/40 px-2 py-0.2 rounded-full">
                    ⚡ VIP UNLIMITED PASSKEY
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                  placeholder="Masukkan Kunci Lisensi / Passkey"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-emerald-500 transition-colors font-mono"
                />
                <button
                  onClick={() => setShowBcaModal(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer whitespace-nowrap"
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
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  SLOT KOMBINASI TEKNIK:
                </span>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                  selectedTechniqueIds.length === 5 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  [{selectedTechniqueIds.length} / 5]
                </span>
                {selectedTechniqueIds.length === 5 && (
                  <span className="text-xs text-amber-400 font-medium hidden sm:inline">
                    🔒 Maksimal 5 teknik tercapai (Batas aman anti-lag &amp; anti-overfiltering)
                  </span>
                )}
              </div>

              {/* Quota & Cooldown Status */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span>📊 Kuota Hari ini:</span>
                  <span className="font-bold text-white">{isAdminPasskey ? 'Unlimited' : `${dailyRemaining}/5`}</span>
                </div>
                {cooldownSeconds > 0 && !isAdminPasskey && (
                  <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-950/40 border border-amber-600/40 px-2 py-0.5 rounded-lg">
                    <span>⏳ Cooldown:</span>
                    <span>{formatTime(cooldownSeconds)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Pills */}
            <div className="flex flex-wrap gap-2 min-h-[38px] p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs font-medium"
                    >
                      <span>{m?.name || id}</span>
                      <button
                        onClick={() => toggleTechnique(id)}
                        className="hover:text-red-400 ml-1 font-bold text-slate-400 cursor-pointer"
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

        {/* Live Interactive Chart Mockup Canvas */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">SIMULASI ON-CHART PREVIEW</span>
              <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                {selectedPlatform === 'tradingview' ? 'TradingView v5 Canvas' : 'MT5 Chart Canvas'}
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">
              Engine Status: READY ({selectedTechniqueIds.length} Modul Terintegrasi)
            </span>
          </div>

          {/* Futuristic Chart Canvas Mockup */}
          <div className="relative w-full h-64 sm:h-72 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between p-4 font-mono select-none">
            {/* Top Chart Watermark */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-300">XAUUSD</span>
                <span className="text-slate-400">M15</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{customName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400">O: 2914.50</span>
                <span className="text-emerald-400">H: 2928.00</span>
                <span className="text-red-400">L: 2910.20</span>
                <span className="text-emerald-400 font-bold">C: 2924.30</span>
              </div>
            </div>

            {/* SVG Visual Candlesticks & Signal Plots */}
            <svg className="w-full h-40" viewBox="0 0 800 160">
              {/* Background Grid */}
              <line x1="0" y1="40" x2="800" y2="40" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2="800" y2="80" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="800" y2="120" stroke="#1e293b" strokeDasharray="3 3" />

              {/* EMA Ribbon Curve */}
              <path d="M 0 110 Q 200 120 400 80 T 800 50" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeOpacity="0.6" />
              <path d="M 0 125 Q 200 135 400 95 T 800 65" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.4" />

              {/* Candles Simulation */}
              {/* Bar 1 Bear */}
              <line x1="60" y1="95" x2="60" y2="135" stroke="#ef4444" strokeWidth="1" />
              <rect x="54" y="105" width="12" height="20" fill="#ef4444" rx="1" />

              {/* Bar 2 Bear Sweep */}
              <line x1="120" y1="110" x2="120" y2="155" stroke="#ef4444" strokeWidth="1" />
              <rect x="114" y="115" width="12" height="25" fill="#ef4444" rx="1" />

              {/* Order Block Box Highlight */}
              <rect x="100" y="110" width="140" height="40" fill="#10b981" fillOpacity="0.12" stroke="#10b981" strokeDasharray="2 2" strokeWidth="1" />
              <text x="105" y="125" fill="#10b981" fontSize="9" fontWeight="bold">SMC OB MITIGATION</text>

              {/* Bar 3 Bull Reversal */}
              <line x1="180" y1="105" x2="180" y2="148" stroke="#10b981" strokeWidth="1" />
              <rect x="174" y="110" width="12" height="30" fill="#10b981" rx="1" />

              {/* INSTITUTIONAL BUY ARROW */}
              <polygon points="180,158 174,166 186,166" fill="#10b981" />
              <rect x="162" y="168" width="36" height="14" fill="#10b981" rx="3" />
              <text x="180" y="178" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">BUY</text>

              {/* SL / TP Dotted Lines */}
              <line x1="180" y1="150" x2="600" y2="150" stroke="#ef4444" strokeDasharray="3 3" strokeWidth="1" />
              <text x="610" y="153" fill="#ef4444" fontSize="9">SL 2910.00</text>

              <line x1="180" y1="65" x2="600" y2="65" stroke="#10b981" strokeDasharray="3 3" strokeWidth="1" />
              <text x="610" y="68" fill="#10b981" fontSize="9">TP1 2928.00 (1:1.5)</text>

              {/* Bar 4 Bull Impulse */}
              <line x1="240" y1="80" x2="240" y2="120" stroke="#10b981" strokeWidth="1" />
              <rect x="234" y="85" width="12" height="28" fill="#10b981" rx="1" />

              {/* Bar 5 Bull */}
              <line x1="300" y1="65" x2="300" y2="100" stroke="#10b981" strokeWidth="1" />
              <rect x="294" y="70" width="12" height="24" fill="#10b981" rx="1" />

              {/* Bar 6 Bull Breakout */}
              <line x1="360" y1="50" x2="360" y2="85" stroke="#10b981" strokeWidth="1" />
              <rect x="354" y="55" width="12" height="25" fill="#10b981" rx="1" />

              {/* Bar 7 High Top */}
              <line x1="420" y1="35" x2="420" y2="70" stroke="#ef4444" strokeWidth="1" />
              <rect x="414" y="42" width="12" height="18" fill="#ef4444" rx="1" />

              {/* INSTITUTIONAL SELL ARROW */}
              <polygon points="420,28 414,20 426,20" fill="#ef4444" />
              <rect x="402" y="4" width="36" height="14" fill="#ef4444" rx="3" />
              <text x="420" y="14" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">SELL</text>
            </svg>

            {/* Bottom HUD Telemetry Box in Chart */}
            <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">PICA HUD:</span>
                <span>BIAS: <strong className="text-emerald-400">BULLISH</strong></span>
                <span>•</span>
                <span>ATR: <strong className="text-cyan-400">2.85 pts</strong></span>
              </div>
              <div className="text-[10px] text-slate-500">
                Zero-Repaint Confirmed Candle Lock
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills & Search */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>KATALOG FORMULA INSTITUSI</span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                50 Modul
              </span>
            </h2>

            {/* Search Input */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari formula / indikator..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Semua Formula (50)' },
              { id: 'smc', label: 'Smart Money (SMC) (14)' },
              { id: 'orderflow', label: 'Order Flow & Volume (8)' },
              { id: 'volatility', label: 'Volatilitas & Math (8)' },
              { id: 'sessions', label: 'Sessions & Killzones (7)' },
              { id: 'trend', label: 'Trend & Momentum (9)' },
              { id: 'execution', label: 'Risk & Eksekusi (4)' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Technique Modules Grid (50 Visual Cards) */}
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
                    ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10'
                    : isLocked
                    ? 'bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {module.badge}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      TF: {module.recommendedTf}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                    {module.name}
                  </h3>

                  {/* Visual Pattern Diagram Mockup (SVG Preview) */}
                  <div className="my-3 w-full h-20 bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center relative p-2">
                    <DiagramMockup pattern={module.visualPattern} />
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {module.description}
                  </p>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">
                    ID: {module.id}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950'
                      : isLocked
                      ? 'bg-slate-800 text-slate-600'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
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
          <div className="bg-red-950/80 border border-red-500/50 rounded-2xl p-4 text-red-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button 
              onClick={() => setErrorMessage(null)} 
              className="text-red-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Big Action Bar */}
        <div className="sticky bottom-4 z-30 bg-slate-900/95 border border-slate-700 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold">
              ⚡
            </div>
            <div>
              <p className="text-xs font-extrabold text-white">
                Siap Merakit: {selectedPlatform === 'tradingview' ? 'TradingView (Pine v5)' : 'MetaTrader 5 (.mq5)'}
              </p>
              <p className="text-[11px] text-slate-400">
                {selectedTechniqueIds.length} formula institusi dipilih • Kuota: {isAdminPasskey ? 'Unlimited' : `${dailyRemaining}/5 hari ini`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {cooldownSeconds > 0 && !isAdminPasskey ? (
              <div className="flex-1 sm:flex-initial text-center bg-amber-950/50 border border-amber-600/40 text-amber-300 px-4 py-2.5 rounded-2xl text-xs font-bold">
                ⏳ Cooldown aktif: {formatTime(cooldownSeconds)}
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isLoading || selectedTechniqueIds.length === 0}
                className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black px-6 py-3 rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="size-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
          <div id="code-result-section" className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-lg">🎉</span>
                  <h3 className="text-lg font-black text-white">Indikator Berhasil Dirakit!</h3>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  File: <strong className="text-emerald-300">{generatedFilename}</strong> ({generatedPlatform.toUpperCase()})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{copySuccess ? '✓ TERSALIN!' : '📋 Salin Kode'}</span>
                </button>

                <button
                  onClick={handleDownloadFile}
                  className="flex-1 sm:flex-initial bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>💾 Unduh File ({generatedFilename?.split('.').pop()?.toUpperCase()})</span>
                </button>

                <button
                  onClick={() => setShowInstallGuide(true)}
                  className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-bold px-3 py-2 rounded-xl border border-cyan-800 transition-all cursor-pointer"
                >
                  📖 Panduan Pasang
                </button>
              </div>
            </div>

            {/* Syntax Viewer Box */}
            <div className="relative bg-slate-950 rounded-2xl border border-slate-800 p-4 max-h-96 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed">
              <pre className="whitespace-pre">{generatedCode}</pre>
            </div>
          </div>
        )}
      </main>

      {/* BCA Payment Modal */}
      {showBcaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-in zoom-in-95">
            <button
              onClick={() => setShowBcaModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-600/40 px-2 py-0.5 rounded-full">
                LISENSI RESMI PICA INDICATOR MAKER
              </span>
              <h3 className="text-xl font-black text-white">Pembayaran &amp; Aktivasi Instan</h3>
              <p className="text-xs text-slate-400">
                Akses tanpa batas ke 50 modul formula kuantitatif TradingView &amp; MetaTrader 5.
              </p>
            </div>

            {/* Pricing Box */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-400">Paket:</span>
                <span className="text-xs font-extrabold text-emerald-400">
                  {earlyBirdStats.isEarlyBirdActive ? 'Early Bird 20 Slot (LIFETIME)' : 'Reguler Bulanan'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Biaya Investasi:</span>
                <span className="text-lg font-black text-white">
                  Rp 175.000 <span className="text-xs text-slate-400 font-normal">{earlyBirdStats.isEarlyBirdActive ? 'Sekali Bayar (Lifetime)' : '/ Bulan'}</span>
                </span>
              </div>
            </div>

            {/* Bank BCA Account */}
            <div className="bg-gradient-to-br from-blue-950/60 to-slate-950 p-4 rounded-2xl border border-blue-600/30 space-y-2">
              <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">Transfer Bank BCA</p>
              <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-blue-500/20">
                <div>
                  <p className="text-base font-mono font-black text-white tracking-widest">1392698188</p>
                  <p className="text-xs text-slate-400">a.n. ARLAND PRATAMA MULDIAWAN</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('1392698188');
                    alert('Nomor rekening BCA 1392698188 berhasil disalin!');
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
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
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-600/40 px-2 py-0.5 rounded-full">
                TUTORIAL PEMASANGAN
              </span>
              <h3 className="text-xl font-black text-white">Cara Pasang Indikator Hasil Rakitan</h3>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              {/* TradingView Guide */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                  <span>📈</span>
                  <span>Cara Pasang di TradingView:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Buka chart pasangan mata uang / Gold di <strong>TradingView</strong>.</li>
                  <li>Di bagian bawah chart, klik tab <strong>Pine Editor</strong>.</li>
                  <li>Hapus semua teks bawaan, lalu <strong>Paste (Tempel)</strong> seluruh kode yang telah disalin.</li>
                  <li>Klik tombol <strong>Save</strong> lalu klik <strong>Add to Chart</strong>.</li>
                  <li>Sinyal panah BUY &amp; SELL, level SL/TP, serta HUD Telemetry akan langsung muncul di chart!</li>
                </ol>
              </div>

              {/* MT5 Guide */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-blue-400 text-sm flex items-center gap-1.5">
                  <span>🤖</span>
                  <span>Cara Pasang di MetaTrader 5 (MT5):</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
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

// Diagram Mockup Renderer for Visual Cards
function DiagramMockup({ pattern }: { pattern: string }) {
  switch (pattern) {
    case 'order_block':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="20" y="20" width="30" height="25" fill="#ef4444" fillOpacity="0.4" stroke="#ef4444" strokeWidth="1" />
          <path d="M 50 15 L 90 5 L 120 40 L 150 10" fill="none" stroke="#10b981" strokeWidth="2" />
          <rect x="20" y="20" width="100" height="25" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeDasharray="2 2" strokeWidth="1" />
        </svg>
      );
    case 'fvg':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="30" y1="35" x2="30" y2="15" stroke="#ef4444" strokeWidth="3" />
          <line x1="80" y1="45" x2="80" y2="5" stroke="#10b981" strokeWidth="5" />
          <line x1="130" y1="30" x2="130" y2="10" stroke="#10b981" strokeWidth="3" />
          <rect x="35" y="20" width="90" height="15" fill="#facc15" fillOpacity="0.25" stroke="#facc15" strokeDasharray="2 2" />
        </svg>
      );
    case 'bos':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 20 40 L 60 15 L 90 30 L 140 8" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <line x1="60" y1="15" x2="150" y2="15" stroke="#f43f5e" strokeDasharray="3 3" strokeWidth="1" />
          <text x="100" y="12" fill="#38bdf8" fontSize="8" fontWeight="bold">BOS ↑</text>
        </svg>
      );
    case 'choch':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 20 15 L 60 38 L 90 20 L 140 45" fill="none" stroke="#f43f5e" strokeWidth="2" />
          <line x1="60" y1="38" x2="150" y2="38" stroke="#38bdf8" strokeDasharray="3 3" strokeWidth="1" />
          <text x="100" y="35" fill="#f43f5e" fontSize="8" fontWeight="bold">CHoCH ↓</text>
        </svg>
      );
    case 'liq_sweep':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="20" y1="20" x2="150" y2="20" stroke="#fbbf24" strokeDasharray="2 2" strokeWidth="1" />
          <line x1="90" y1="45" x2="90" y2="5" stroke="#ef4444" strokeWidth="1" />
          <rect x="85" y="25" width="10" height="18" fill="#ef4444" />
          <polygon points="90,4 86,10 94,10" fill="#fbbf24" />
        </svg>
      );
    case 'squeeze':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 10 10 Q 80 23 150 5" fill="none" stroke="#a855f7" strokeWidth="1.5" />
          <path d="M 10 40 Q 80 27 150 45" fill="none" stroke="#a855f7" strokeWidth="1.5" />
          <circle cx="80" cy="25" r="3" fill="#ef4444" />
          <circle cx="110" cy="25" r="3" fill="#10b981" />
        </svg>
      );
    case 'asia_sweep':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <rect x="20" y="15" width="60" height="20" fill="#3b82f6" fillOpacity="0.2" stroke="#3b82f6" strokeDasharray="2 2" />
          <text x="25" y="28" fill="#60a5fa" fontSize="8">ASIA RANGE</text>
          <path d="M 80 25 L 105 45 L 125 10 L 150 5" fill="none" stroke="#10b981" strokeWidth="2" />
        </svg>
      );
    case 'triple_ema':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 10 42 Q 80 25 150 8" fill="none" stroke="#10b981" strokeWidth="2" />
          <path d="M 10 45 Q 80 32 150 18" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M 10 48 Q 80 40 150 28" fill="none" stroke="#6366f1" strokeWidth="1" />
        </svg>
      );
    case 'atr_sl':
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <line x1="20" y1="10" x2="140" y2="10" stroke="#10b981" strokeDasharray="3 3" strokeWidth="1.5" />
          <text x="142" y="13" fill="#10b981" fontSize="8">TP</text>
          <line x1="20" y1="25" x2="140" y2="25" stroke="#38bdf8" strokeWidth="1" />
          <text x="142" y="28" fill="#38bdf8" fontSize="8">ENTRY</text>
          <line x1="20" y1="40" x2="140" y2="40" stroke="#ef4444" strokeDasharray="3 3" strokeWidth="1.5" />
          <text x="142" y="43" fill="#ef4444" fontSize="8">SL</text>
        </svg>
      );
    default:
      return (
        <svg className="w-full h-full" viewBox="0 0 160 50">
          <path d="M 20 35 L 60 20 L 100 30 L 140 10" fill="none" stroke="#10b981" strokeWidth="1.5" />
          <circle cx="140" cy="10" r="3" fill="#10b981" />
        </svg>
      );
  }
}
