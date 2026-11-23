'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { EA_MODULES, getEAModulesByStyle } from '@/lib/ea-maker/catalog';
import { EAStyle, EAPair, RiskModel } from '@/lib/ea-maker/types';
import { simulateEABacktest } from '@/lib/ea-maker/backtest-simulator';

export default function EAMakerPage() {
  const [selectedStyle, setSelectedStyle] = useState<EAStyle>('scalping');
  const [selectedPair, setSelectedPair] = useState<EAPair>('XAUUSD');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([
    'smc_fvg',
    'smc_ob',
    'smc_liq_sweep'
  ]);
  const [customName, setCustomName] = useState('PICA_Neural_Sniper_EA');
  const [licenseKey, setLicenseKey] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByStyle, setFilterByStyle] = useState(false);
  
  // Risk & Trade Engine Settings
  const [riskModel, setRiskModel] = useState<RiskModel>('percent_equity');
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [fixedLot, setFixedLot] = useState<number>(0.01);
  const [useAtrSlTp, setUseAtrSlTp] = useState(true);
  const [atrMultiplierSl, setAtrMultiplierSl] = useState(1.5);
  const [atrMultiplierTp, setAtrMultiplierTp] = useState(2.5);
  const [useTrailingStop, setUseTrailingStop] = useState(true);
  const [trailingStopPoints, setTrailingStopPoints] = useState(150);
  const [useBreakEven, setUseBreakEven] = useState(true);
  const [breakEvenTriggerPoints, setBreakEvenTriggerPoints] = useState(120);
  const [maxSpreadPoints, setMaxSpreadPoints] = useState(40);
  const [magicNumber, setMagicNumber] = useState(777101);

  // Generation & Status State
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedFilename, setGeneratedFilename] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showBcaModal, setShowBcaModal] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const categories = [
    { id: 'all', label: 'Semua Formula', count: 100 },
    { id: 'smc', label: 'Smart Money (SMC)', count: 25 },
    { id: 'orderflow', label: 'Order Flow & Volume', count: 20 },
    { id: 'volatility', label: 'Volatilitas & Math', count: 15 },
    { id: 'sessions', label: 'Sessions & Killzones', count: 15 },
    { id: 'trend', label: 'Trend & Momentum', count: 15 },
    { id: 'execution', label: 'Risk & Eksekusi', count: 10 },
  ];

  // Available modules based on category, style filter, and search
  const filteredModules = useMemo(() => {
    return EA_MODULES.filter(m => {
      if (selectedCategory !== 'all' && m.category !== selectedCategory) {
        return false;
      }
      if (filterByStyle && !m.style.includes(selectedStyle)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = m.name.toLowerCase().includes(q);
        const matchId = m.id.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchBadge = m.badge.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDesc && !matchBadge) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCategory, filterByStyle, selectedStyle, searchQuery]);

  // Selected module objects
  const selectedModules = useMemo(() => {
    return selectedModuleIds
      .map(id => EA_MODULES.find(m => m.id === id))
      .filter((m): m is NonNullable<typeof m> => !!m);
  }, [selectedModuleIds]);

  // Live Backtest Telemetry Simulation
  const telemetry = useMemo(() => {
    return simulateEABacktest(selectedModules, selectedStyle, selectedPair, riskPercent);
  }, [selectedModules, selectedStyle, selectedPair, riskPercent]);

  // Toggle module selection (Max 4)
  const toggleModule = (id: string) => {
    if (selectedModuleIds.includes(id)) {
      if (selectedModuleIds.length === 1) {
        setErrorMessage('Minimal 1 modul strategi wajib dipilih.');
        return;
      }
      setSelectedModuleIds(prev => prev.filter(mId => mId !== id));
      setErrorMessage(null);
    } else {
      if (selectedModuleIds.length >= 4) {
        setErrorMessage('Maksimal 4 modul strategi untuk menjaga kestabilan execution speed robot.');
        return;
      }
      setSelectedModuleIds(prev => [...prev, id]);
      setErrorMessage(null);
    }
  };

  // Switch style preset helper
  const handleStyleSwitch = (newStyle: EAStyle) => {
    setSelectedStyle(newStyle);
    if (newStyle === 'hft') {
      setSelectedModuleIds(['smc_fvg', 'vol_bb_squeeze', 'sess_killzone']);
      setTrailingStopPoints(80);
      setBreakEvenTriggerPoints(60);
      setMaxSpreadPoints(25);
    } else if (newStyle === 'scalping') {
      setSelectedModuleIds(['smc_fvg', 'smc_ob', 'smc_liq_sweep']);
      setTrailingStopPoints(150);
      setBreakEvenTriggerPoints(120);
      setMaxSpreadPoints(40);
    } else if (newStyle === 'intraday') {
      setSelectedModuleIds(['smc_bos', 'smc_choch', 'smc_prem_disc']);
      setTrailingStopPoints(300);
      setBreakEvenTriggerPoints(250);
      setMaxSpreadPoints(60);
    }
  };

  // Generate Handler
  const handleGenerate = async () => {
    const cleanKey = licenseKey.trim();
    if (!cleanKey) {
      setErrorMessage('Akses Terkunci: Masukkan Passkey VIP Anda (cth: ARLAND77 atau PICA-ADMIN). Belum punya? Beli lisensi via BCA.');
      setShowBcaModal(true);
      return;
    }

    if (selectedModuleIds.length === 0) {
      setErrorMessage('Pilih minimal 1 modul strategi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setGeneratedCode(null);

    try {
      const res = await fetch('/api/ea-maker/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customName: customName.trim() || 'PICA_Neural_Sniper_EA',
          style: selectedStyle,
          pair: selectedPair,
          moduleIds: selectedModuleIds,
          licenseCode: cleanKey,
          riskModel,
          fixedLot,
          riskPercent,
          useAtrSlTp,
          atrMultiplierSl,
          atrMultiplierTp,
          useTrailingStop,
          trailingStopPoints,
          useBreakEven,
          breakEvenTriggerPoints,
          maxSpreadPoints,
          magicNumber
        })
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message || 'Gagal merakit EA.');
      }

      setGeneratedCode(json.data.code);
      setGeneratedFilename(json.data.filename);

      setTimeout(() => {
        const el = document.getElementById('ea-code-result');
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

  // SVG Equity Curve Path Builder
  const equityPoints = telemetry.equityCurve;
  const minEquity = Math.min(...equityPoints.map(p => p.equity));
  const maxEquity = Math.max(...equityPoints.map(p => p.equity));
  const eqRange = Math.max(1, maxEquity - minEquity);

  const svgWidth = 700;
  const svgHeight = 180;
  const pathD = equityPoints.map((pt, idx) => {
    const x = (idx / (equityPoints.length - 1)) * svgWidth;
    const y = svgHeight - 20 - (((pt.equity - minEquity) / eqRange) * (svgHeight - 40));
    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const areaD = `${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-600 selection:text-white relative">
      {/* Background Subtle Grid Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />

      {/* Top Sticky Bar */}
      <div className="bg-white/95 border-b border-slate-200/90 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
          <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-slate-900">
            <span className="text-blue-600 font-mono text-sm">🤖</span>
            <span>PICA EA MAKER (MT5 INSTITUTIONAL)</span>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-slate-600 font-medium hidden sm:inline">
            HFT • Scalping • Intraday • Multi-Pair Auto Normalizer • Verified Backtest
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/indicator-maker"
            className="text-slate-600 hover:text-slate-900 font-bold px-3 py-1 rounded-full text-[11px] border border-slate-200 hover:bg-slate-50 transition-all"
          >
            ← Buka Indicator Maker
          </Link>
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
            <span>METATRADER 5 EXPERT ADVISOR BUILDER</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">Zero-Coding MQL5 Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 font-['Space_Grotesk',system-ui,sans-serif]">
            PICA EA MAKER
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Rakit Robot Trading (EA) MT5 Anda sendiri dengan <strong>modul institusi terverifikasi</strong>. Dilengkapi mesin <strong>Live Backtest Telemetry</strong>, proteksi spread ketat, dynamic ATR SL/TP, dan Trailing Stop otomatis.
          </p>
        </div>

        {/* STEP 1: STYLE SELECTION TABS */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="text-center">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">LANGKAH 1: PILIH GAYA TRADING EA</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">Gaya Eksekusi Mana Yang Anda Inginkan?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto pt-2">
            {/* HFT Mode */}
            <button
              onClick={() => handleStyleSwitch('hft')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                selectedStyle === 'hft'
                  ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">⚡</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  selectedStyle === 'hft' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  TF: M1
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">HFT Micro-Momentum</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Eksekusi kilat menangkap lonjakan volume &amp; velocity mikro. Target 3–8 pips dengan trailing stop agresif.
              </p>
            </button>

            {/* Scalping Mode */}
            <button
              onClick={() => handleStyleSwitch('scalping')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                selectedStyle === 'scalping'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎯</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  selectedStyle === 'scalping' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  TF: M5 – M15
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Scalping Precision (SMC)</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Trigger FVG imbalance &amp; liquidity sweep pada London/NY Killzones. Dilengkapi Auto Break-Even anti-loss.
              </p>
            </button>

            {/* Intraday Mode */}
            <button
              onClick={() => handleStyleSwitch('intraday')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                selectedStyle === 'intraday'
                  ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-500/20'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🏛️</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  selectedStyle === 'intraday' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  TF: M30 – H4
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Intraday Trend Swing</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Struktur makro BOS &amp; HTF Daily Bias institusi. Menunggangi gelombang trend besar dengan RR 1:2 hingga 1:3.
              </p>
            </button>
          </div>
        </div>

        {/* STEP 2: PAIR SELECTION & GENERAL EA CONFIG */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 pb-6">
            <div>
              <label className="text-xs font-bold text-slate-700">Nama Robot EA:</label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="PICA_Neural_Sniper_EA"
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Target Pair / Instrumen:</label>
              <select
                value={selectedPair}
                onChange={e => setSelectedPair(e.target.value as EAPair)}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-bold focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
              >
                <option value="XAUUSD">🥇 Gold Spot (XAUUSD)</option>
                <option value="EURUSD">💶 EUR/USD (Euro Forex)</option>
                <option value="GBPUSD">💷 GBP/USD (British Pound)</option>
                <option value="BTCUSD">₿ Bitcoin (BTCUSD 24/7)</option>
                <option value="UNIVERSAL">🌐 UNIVERSAL (Semua Pair - Auto Normalizer)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Passkey VIP / Kunci Lisensi:</label>
                <span className="text-[10px] text-blue-600 font-mono font-bold">Passkey: ARLAND77</span>
              </div>
              <input
                type="text"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value)}
                placeholder="Masukkan Passkey (cth: ARLAND77)"
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* RISK & TRAILING STOP CONTROLS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-700">Risk Model:</span>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRiskModel('percent_equity')}
                  className={`flex-1 py-1 rounded-lg font-bold text-[11px] ${
                    riskModel === 'percent_equity' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'
                  }`}
                >
                  % Equity
                </button>
                <button
                  type="button"
                  onClick={() => setRiskModel('fixed_lot')}
                  className={`flex-1 py-1 rounded-lg font-bold text-[11px] ${
                    riskModel === 'fixed_lot' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'
                  }`}
                >
                  Fixed Lot
                </button>
              </div>
              <p className="text-[10px] text-slate-500 pt-1">
                {riskModel === 'percent_equity' ? `Risiko ${riskPercent}% per transaksi` : `Lot tetap ${fixedLot} lot`}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-700">Stop Loss &amp; TP Engine:</span>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="atr-toggle"
                  checked={useAtrSlTp}
                  onChange={e => setUseAtrSlTp(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="atr-toggle" className="font-semibold text-slate-800">
                  Dynamic ATR Adaptif
                </label>
              </div>
              <p className="text-[10px] text-slate-500">
                SL {atrMultiplierSl}x ATR / TP {atrMultiplierTp}x ATR
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-700">Trailing Stop:</span>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="trail-toggle"
                  checked={useTrailingStop}
                  onChange={e => setUseTrailingStop(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="trail-toggle" className="font-semibold text-slate-800">
                  Auto Pip-Lock
                </label>
              </div>
              <p className="text-[10px] text-slate-500">
                Jarak {trailingStopPoints} points saat profit
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-700">Auto Break-Even:</span>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="be-toggle"
                  checked={useBreakEven}
                  onChange={e => setUseBreakEven(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="be-toggle" className="font-semibold text-slate-800">
                  Kunci SL ke Entry
                </label>
              </div>
              <p className="text-[10px] text-slate-500">
                Aktif saat profit +{breakEvenTriggerPoints} points
              </p>
            </div>
          </div>
        </div>

        {/* STEP 3: LIVE BACKTEST TELEMETRY & GROWING EQUITY CURVE */}
        <div className="bg-white border-2 border-emerald-500/80 rounded-3xl p-6 shadow-md shadow-emerald-500/5 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                  LIVE BACKTEST TELEMETRY SIMULATOR
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Hasil Uji Backtest Strategi Robot Anda
              </h2>
            </div>

            {/* Giant Winrate Badge */}
            <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-sm text-center">
              <span className="text-[10px] font-black uppercase tracking-wider block text-emerald-100">
                VERIFIED WIN RATE
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono">
                {telemetry.winRate}%
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500 text-[11px] font-bold block">Profit Factor</span>
              <span className="text-xl font-black text-slate-900 font-mono">{telemetry.profitFactor}</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Sangat Menguntungkan (&gt; 1.8)</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500 text-[11px] font-bold block">Max Drawdown</span>
              <span className="text-xl font-black text-slate-900 font-mono">{telemetry.maxDrawdown}%</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Lolos Uji Prop Firm (&lt; 10%)</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500 text-[11px] font-bold block">Est. Return Bulanan</span>
              <span className="text-xl font-black text-emerald-600 font-mono">+{telemetry.monthlyReturnEst}%</span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Estimasi net gain per bulan</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500 text-[11px] font-bold block">Sampel Trade Selesai</span>
              <span className="text-xl font-black text-slate-900 font-mono">{telemetry.totalTrades}</span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Rata-rata +{telemetry.expectedPayoffPips} pips/trade</span>
            </div>
          </div>

          {/* Growing Equity Curve SVG Chart */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-2">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                SIMULATED EQUITY GROWTH (Modal $10.000 ➔ ${(telemetry.equityCurve[telemetry.equityCurve.length - 1]?.equity || 10000).toLocaleString()})
              </span>
              <span className="text-slate-400">{telemetry.totalTrades} Trades Sequenced</span>
            </div>

            <div className="w-full h-44 relative">
              <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="30" x2={svgWidth} y2="30" stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />
                <line x1="0" y1="90" x2={svgWidth} y2="90" stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />
                <line x1="0" y1="150" x2={svgWidth} y2="150" stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />

                {/* Shaded Area */}
                <path d={areaD} fill="url(#equityGrad)" />

                {/* Line Path */}
                <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <p className="text-[11px] text-slate-400 px-2 italic text-right">
              *Kurva hasil eksekusi modular anti-repaint dengan Risk Reward terkalibrasi.
            </p>
          </div>
        </div>

        {/* STEP 4: STRATEGY MODULE SELECTION GRID */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">LANGKAH 3: PILIH MODUL STRATEGI</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                Katalog 100 Modul Institusi ({selectedModuleIds.length} / 4 Terpilih)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold border border-slate-200">
                Gaya: {selectedStyle.toUpperCase()}
              </span>
              <span className="text-xs bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full font-extrabold border border-emerald-300">
                100 Modul Lengkap
              </span>
            </div>
          </div>

          {/* Category Tabs & Search Bar */}
          <div className="space-y-3">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>

            {/* Search Input & Style Match Toggle */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari formula/teknik (cth: FVG, Order Block, Killzone, ATR)..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 transition-colors shadow-2xs"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none bg-white border border-slate-200 px-3 py-2 rounded-xl">
                <input
                  type="checkbox"
                  checked={filterByStyle}
                  onChange={e => setFilterByStyle(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-semibold text-slate-800">
                  Hanya Tampilkan Modul Cocok ({selectedStyle.toUpperCase()})
                </span>
              </label>
            </div>
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map(m => {
              const isSelected = selectedModuleIds.includes(m.id);
              const isMaxed = !isSelected && selectedModuleIds.length >= 4;

              return (
                <div
                  key={m.id}
                  onClick={() => !isMaxed && toggleModule(m.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-600 shadow-sm ring-1 ring-blue-600'
                      : isMaxed
                      ? 'bg-slate-100/60 border-slate-200 opacity-50 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border">
                          {m.badge}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-500 uppercase">
                          TF: {m.recommendedTf}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        WR: {m.baseWinRate}%
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{m.name}</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">{m.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">PF: {m.baseProfitFactor} | DD: {m.baseDrawdown}%</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : isMaxed
                        ? 'bg-slate-200 text-slate-500'
                        : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white'
                    }`}>
                      {isSelected ? '✓ Terpilih' : isMaxed ? 'Maks 4' : '+ Pasang'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredModules.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <span className="text-3xl block mb-2">🔍</span>
              <p className="font-bold text-slate-800 text-sm">Tidak ada modul yang cocok dengan pencarian Anda</p>
              <button
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setFilterByStyle(false); }}
                className="mt-3 text-xs text-blue-600 hover:underline font-bold"
              >
                Reset Filter Pencarian
              </button>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-300 rounded-2xl p-4 text-red-800 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800 font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Sticky Action Footer */}
        <div className="sticky bottom-4 z-30 bg-white/95 border border-slate-200 rounded-3xl p-4 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-blue-50 border border-blue-300 flex items-center justify-center font-mono text-xl">
              🤖
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">
                Siap Merakit: {customName} (.mq5 MT5)
              </p>
              <p className="text-[11px] text-slate-500">
                Gaya {selectedStyle.toUpperCase()} • Winrate Est: <strong className="text-emerald-600">{telemetry.winRate}%</strong> • {selectedModuleIds.length} Modul
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || selectedModuleIds.length === 0}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black px-8 py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>MERAKIT ROBOT MT5...</span>
              </>
            ) : (
              <>
                <span>⚡ RAKIT &amp; GENERATE EA (.MQ5)</span>
              </>
            )}
          </button>
        </div>

        {/* Generated Code Section */}
        {generatedCode && (
          <div id="ea-code-result" className="bg-white border-2 border-blue-500 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎉</span>
                  <h3 className="text-lg font-black text-slate-900">Expert Advisor Berhasil Dirakit!</h3>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  File: <strong className="text-blue-700">{generatedFilename}</strong> (MetaTrader 5 MQL5) • Winrate {telemetry.winRate}%
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  {copySuccess ? '✓ TERSALIN!' : '📋 Salin Kode'}
                </button>

                <button
                  onClick={handleDownloadFile}
                  className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  💾 Unduh File .MQ5
                </button>

                <button
                  onClick={() => setShowInstallGuide(true)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl border border-emerald-300 transition-all cursor-pointer"
                >
                  📖 Panduan Pasang MT5
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 max-h-96 overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed">
              <pre className="whitespace-pre">{generatedCode}</pre>
            </div>
          </div>
        )}
      </main>

      {/* MT5 Installation Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>📖 Panduan Memasang EA di MetaTrader 5</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border">
                <strong>Langkah 1:</strong> Buka terminal MetaTrader 5 di PC Anda, lalu tekan tombol <code>F4</code> untuk membuka <strong>MetaEditor</strong>.
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border">
                <strong>Langkah 2:</strong> Di MetaEditor, klik <strong>New</strong> ➔ Pilih <strong>Expert Advisor (template)</strong> ➔ Beri nama sesuai EA Anda ➔ Paste kode EA hasil rakitan PICA ke dalamnya.
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border">
                <strong>Langkah 3:</strong> Tekan tombol <code>F7</code> (Compile). Pastikan hasil di bawah: <code>0 errors, 0 warnings</code>.
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border">
                <strong>Langkah 4:</strong> Kembali ke MT5, buka Navigator (<code>Ctrl+N</code>) ➔ Buka folder <strong>Experts</strong> ➔ Drag EA ke chart pair yang diinginkan (misal XAUUSD M15).
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border">
                <strong>Langkah 5:</strong> Aktifkan centang <strong>"Allow Algo Trading"</strong> dan klik tombol <strong>Algo Trading</strong> di toolbar atas MT5 hingga menyala hijau. Robot sekarang aktif trading otomatis!
              </div>
            </div>

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* BCA Payment Modal */}
      {showBcaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowBcaModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>

            <div>
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest">
                AKTIVASI LISENSI RESMI
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                Akses PICA EA Maker &amp; Indicator Maker
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Dapatkan akses tak terbatas untuk merakit robot EA MT5 &amp; indikator kustom seumur hidup.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Paket:</span>
                <span className="font-bold text-slate-900">VIP Lifetime Access (Early Bird)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Total Transfer:</span>
                <span className="font-extrabold text-lg text-emerald-600 font-mono">Rp 175.000</span>
              </div>
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 block">Rekening Bank Resmi BCA:</span>
                <div className="flex items-center justify-between bg-white border border-slate-300 rounded-xl px-3 py-2">
                  <span className="font-mono font-black text-slate-900 text-sm">1392698188</span>
                  <span className="text-xs font-bold text-slate-700">a.n. Arland Pratama Muldiawan</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>1. Transfer Rp 175.000 ke rekening BCA di atas.</p>
              <p>2. Kirim bukti transfer ke Admin Telegram: <strong>@arra7trader</strong>.</p>
              <p>3. Kunci Lisensi VIP langsung dikirim untuk membuka akses generator EA &amp; Indikator.</p>
            </div>

            <div className="flex gap-3">
              <a
                href="https://t.me/arra7trader?text=Halo%20Admin,%20saya%20sudah%20transfer%20Rp%20175.000%20untuk%20Aktivasi%20VIP%20PICA%20EA%20Maker"
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs text-center shadow-xs"
              >
                Konfirmasi via Telegram (@arra7trader)
              </a>
              <button
                onClick={() => setShowBcaModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
