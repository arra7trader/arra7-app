'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyIcon,
  BoltIcon,
  RefreshIcon,
  CheckIcon,
  SparklesIcon,
  AcademicCapIcon,
  RobotIcon,
  CrownIcon,
  StarIcon,
  SignalIcon,
  CheckCircleIcon,
  ClipboardIcon,
  TelegramIcon
} from '@/components/PremiumIcons';

export interface LicenseKey {
  id?: number;
  code: string;
  tier: 'PRO' | 'VVIP';
  durationDays: number;
  isUsed: boolean;
  usedByDeviceId?: string;
  createdAt: string;
  activatedAt?: string;
  expiresAt?: string;
  notes?: string;
}

export interface DeviceUser {
  deviceId: string;
  tier: 'BASIC' | 'PRO' | 'VVIP';
  tierExpiresAt?: string;
  activeLicenseCode?: string;
  firstSeenAt: string;
  lastActiveAt: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  totalPredictions: number;
  totalVisits: number;
}

type ProductType = 'FIBO_KYOKO' | 'TELEBOT' | 'VVIP' | 'PRO' | 'COPYTRADE' | 'CUSTOM';

interface ProductPreset {
  id: ProductType;
  title: string;
  badge: string;
  priceDisplay: string;
  tagColor: string;
  borderActive: string;
  description: string;
  tier: 'PRO' | 'VVIP';
  durations: { label: string; days: number; price?: string }[];
  notePrefix: string;
  generateText: (code: string, buyerName: string, durationLabel: string) => string;
}

const PRODUCT_PRESETS: Record<ProductType, ProductPreset> = {
  FIBO_KYOKO: {
    id: 'FIBO_KYOKO',
    title: 'Kursus Digital Fibo Kyoko',
    badge: '🎓 KURSUS FIBO',
    priceDisplay: 'Rp 169.000 (Lifetime)',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    borderActive: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40',
    description: '3 Video Masterclass HD, File Indikator Auto MT5 (.ex5), dan Script TradingView Pine Script v6. Akses Selamanya.',
    tier: 'PRO',
    durations: [{ label: 'Lifetime (Selamanya)', days: 9999, price: 'Rp 169.000' }],
    notePrefix: '[FIBO_KYOKO]',
    generateText: (code, buyerName, _) => {
      const greeting = buyerName ? `Halo Kak ${buyerName}!` : 'Halo Kak!';
      return `${greeting} Terima kasih, pembayaran Kursus Digital Fibo Kyoko telah kami verifikasi. ✅

Berikut Kode Lisensi Aktivasi Anda:
🔑 Kode: ${code}
⏳ Akses: Lifetime (Selamanya)

Cara Membuka Materi Kursus:
1. Buka https://pica.my.id/kursus-fibo-kyoko
2. Klik tombol "Aktivasi Kode Lisensi" di bagian atas halaman
3. Tempel kode di atas lalu klik Aktifkan

Materi 3 Video Masterclass HD, File Indikator Auto MT5 (.ex5), dan Script TradingView Pine Script v6 akan langsung terbuka seketika! Selamat belajar dan salam cuan konsisten!`;
    },
  },
  TELEBOT: {
    id: 'TELEBOT',
    title: 'TELEBOT AI Trader',
    badge: '🤖 TELEBOT',
    priceDisplay: 'Mulai Rp 175.000',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40',
    description: 'Signal AI otomatis Telegram + Bonus Akses Web PICA PRO & materi analisa eksklusif.',
    tier: 'PRO',
    durations: [
      { label: '1 Bulan (30 Hari)', days: 30, price: 'Rp 175.000' },
      { label: 'Lifetime Promo (Selamanya)', days: 9999, price: 'Rp 375.000' },
    ],
    notePrefix: '[TELEBOT]',
    generateText: (code, buyerName, durationLabel) => {
      const greeting = buyerName ? `Halo Kak ${buyerName}!` : 'Halo Kak!';
      return `${greeting} Pembayaran TELEBOT AI Trader Anda telah diverifikasi. ✅

Berikut Kode Lisensi Member Anda:
🔑 Kode: ${code}
⏳ Akses: ${durationLabel}

Langkah Aktivasi:
1. Buka https://pica.my.id/telebot-bonus
2. Klik tombol "Aktivasi Kode" di pojok atas & masukkan kode lisensi di atas
3. Hubungi Admin Telegram @arra7trader untuk approve akun Telegram bot Anda

Bonus akses akun PRO website dan channel VIP Anda langsung aktif!`;
    },
  },
  VVIP: {
    id: 'VVIP',
    title: 'PICA VVIP All Access',
    badge: '👑 VVIP ALL ACCESS',
    priceDisplay: 'Mulai Rp 249.000',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
    borderActive: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40',
    description: 'Akses penuh seluruh fitur AI Doctor, Scanner Signal Real-time, DOM, & Analisa Saham/Crypto.',
    tier: 'VVIP',
    durations: [
      { label: '1 Bulan (30 Hari)', days: 30, price: 'Rp 249.000' },
      { label: '3 Bulan (90 Hari)', days: 90, price: 'Rp 740.000' },
      { label: '6 Bulan (180 Hari)', days: 180, price: 'Rp 1.490.000' },
      { label: '1 Tahun (365 Hari)', days: 365, price: 'Rp 2.800.000' },
      { label: 'Lifetime (Selamanya)', days: 9999 },
    ],
    notePrefix: '[VVIP]',
    generateText: (code, buyerName, durationLabel) => {
      const greeting = buyerName ? `Halo Kak ${buyerName}!` : 'Halo Kak!';
      return `${greeting} Akses PICA VVIP All Access Anda telah diaktifkan! 👑

Berikut Kode Lisensi VVIP Anda:
🔑 Kode: ${code}
⏳ Masa Aktif: ${durationLabel}

Cara Aktivasi:
1. Buka https://pica.my.id
2. Klik tombol "Aktivasi Kode" di pojok kanan atas
3. Tempel kode di atas lalu klik Aktifkan

Semua fitur VVIP, AI Doctor, Scanner Realtime, dan Neural Lab langsung terbuka seketika tanpa perlu login!`;
    },
  },
  PRO: {
    id: 'PRO',
    title: 'PICA PRO Web Access',
    badge: '⭐ PICA PRO',
    priceDisplay: 'Mulai Rp 99.000',
    tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    borderActive: 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40',
    description: 'Akses Scanner & Indikator Web Trading PICA dengan akurasi tinggi.',
    tier: 'PRO',
    durations: [
      { label: '1 Bulan (30 Hari)', days: 30, price: 'Rp 99.000' },
      { label: '3 Bulan (90 Hari)', days: 90, price: 'Rp 290.000' },
      { label: '6 Bulan (180 Hari)', days: 180, price: 'Rp 590.000' },
      { label: '1 Tahun (365 Hari)', days: 365, price: 'Rp 1.000.000' },
    ],
    notePrefix: '[PRO]',
    generateText: (code, buyerName, durationLabel) => {
      const greeting = buyerName ? `Halo Kak ${buyerName}!` : 'Halo Kak!';
      return `${greeting} Akses PICA PRO Web Anda telah aktif! ⭐

Berikut Kode Lisensi PRO Anda:
🔑 Kode: ${code}
⏳ Masa Aktif: ${durationLabel}

Cara Aktivasi:
1. Buka https://pica.my.id
2. Klik tombol "Aktivasi Kode" di pojok kanan atas
3. Tempel kode di atas lalu klik Aktifkan`;
    },
  },
  COPYTRADE: {
    id: 'COPYTRADE',
    title: 'Copytrade Arra77',
    badge: '📈 COPYTRADE',
    priceDisplay: 'Mulai Rp 49.000',
    tagColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    borderActive: 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/40',
    description: 'Koneksi MetaTrader 5 Bridge Arra-Copytrade (Follower / Provider).',
    tier: 'PRO',
    durations: [
      { label: 'Follower 1 Bulan', days: 30, price: 'Rp 49.000' },
      { label: 'Follower 1 Tahun', days: 365, price: 'Rp 449.000' },
      { label: 'Provider 1 Bulan', days: 30, price: 'Rp 99.000' },
      { label: 'Provider 1 Tahun', days: 365, price: 'Rp 899.000' },
    ],
    notePrefix: '[COPYTRADE]',
    generateText: (code, buyerName, durationLabel) => {
      const greeting = buyerName ? `Halo Kak ${buyerName}!` : 'Halo Kak!';
      return `${greeting} Lisensi Copytrade Arra77 Anda telah dikonfirmasi. 📈

Berikut Kode Lisensi Anda:
🔑 Kode: ${code}
⏳ Masa Aktif: ${durationLabel}

Cara Aktivasi:
1. Buka https://pica.my.id/copytrade-arra77
2. Masukkan kode lisensi ini untuk menghubungkan akun MT5 Bridge Anda`;
    },
  },
  CUSTOM: {
    id: 'CUSTOM',
    title: 'Mode Manual / Kustom',
    badge: '🛠️ MANUAL',
    priceDisplay: 'Custom',
    tagColor: 'bg-slate-100 text-slate-700 border-slate-300',
    borderActive: 'border-slate-600 ring-2 ring-slate-600/20 bg-slate-50',
    description: 'Tentukan paket, durasi hari, dan catatan secara bebas sesuai kebutuhan.',
    tier: 'VVIP',
    durations: [
      { label: '7 Hari', days: 7 },
      { label: '30 Hari', days: 30 },
      { label: '90 Hari', days: 90 },
      { label: '365 Hari', days: 365 },
      { label: '9999 Hari (Lifetime)', days: 9999 },
    ],
    notePrefix: '[MANUAL]',
    generateText: (code, buyerName, durationLabel) => {
      const greeting = buyerName ? `Halo Kak ${buyerName}!` : 'Halo!';
      return `${greeting} Berikut kode lisensi PICA Anda:

🔑 Kode: ${code}
⏳ Masa Aktif: ${durationLabel}

Cara Aktivasi:
1. Buka https://pica.my.id
2. Klik tombol "Aktivasi Kode" di pojok atas
3. Tempel kode di atas lalu klik Aktifkan.`;
    },
  },
};

export default function LicenseKeyManager() {
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [devices, setDevices] = useState<DeviceUser[]>([]);
  const [activeTab, setActiveTab] = useState<'keys' | 'devices'>('keys');
  const [loading, setLoading] = useState(true);

  // Active Product Selection for 1-Click Activation
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('FIBO_KYOKO');
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<number>(0);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [customTier, setCustomTier] = useState<'PRO' | 'VVIP'>('PRO');
  const [customDays, setCustomDays] = useState<number>(30);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [genCount, setGenCount] = useState<number>(1);

  // Generation state & feedback
  const [generating, setGenerating] = useState(false);
  const [latestGenerated, setLatestGenerated] = useState<{
    product: ProductType;
    codes: string[];
    durationLabel: string;
    buyerName: string;
    buyerPhone: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Table filter
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'USED'>('ALL');
  const [filterProduct, setFilterProduct] = useState<string>('ALL');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resKeys, resDevs] = await Promise.all([
        fetch('/api/admin/license').then((r) => r.json()),
        fetch('/api/admin/devices').then((r) => r.json()),
      ]);

      if (resKeys.status === 'success') {
        setKeys(resKeys.data || []);
      }
      if (resDevs.status === 'success') {
        setDevices(resDevs.data || []);
      }
    } catch (e) {
      console.error('Failed to load licenses or devices', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset duration index when product changes
  useEffect(() => {
    setSelectedDurationIndex(0);
  }, [selectedProduct]);

  const currentPreset = PRODUCT_PRESETS[selectedProduct];
  const currentDuration = currentPreset.durations[selectedDurationIndex] || currentPreset.durations[0];

  const handle1ClickGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGenerating(true);

    try {
      let tierToUse: 'PRO' | 'VVIP' = currentPreset.tier;
      let durationDaysToUse = currentDuration.days;
      let noteToUse = '';

      if (selectedProduct === 'CUSTOM') {
        tierToUse = customTier;
        durationDaysToUse = customDays;
        noteToUse = customNotes.trim() ? `[MANUAL] ${customNotes.trim()}` : '[MANUAL]';
      } else {
        const contactDetail = buyerPhone.trim() ? ` (${buyerPhone.trim()})` : '';
        const nameDetail = buyerName.trim() ? ` ${buyerName.trim()}${contactDetail}` : '';
        noteToUse = `${currentPreset.notePrefix}${nameDetail}`;
      }

      const res = await fetch('/api/admin/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tierToUse,
          durationDays: durationDaysToUse,
          count: genCount,
          notes: noteToUse,
        }),
      });

      const json = await res.json();
      if (json.status === 'success') {
        const generatedCodes: string[] = json.data || [];
        setLatestGenerated({
          product: selectedProduct,
          codes: generatedCodes,
          durationLabel: selectedProduct === 'CUSTOM' ? `${customDays} Hari` : currentDuration.label,
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
        });

        // Reset buyer inputs for next order
        setBuyerName('');
        setBuyerPhone('');
        setCustomNotes('');
        await fetchData();
      } else {
        alert(json.message || 'Gagal generate kode lisensi');
      }
    } catch (err: any) {
      alert('Error saat generate: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(code);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyChatTemplate = (
    code: string,
    prodType: ProductType,
    name: string,
    durationLabel: string
  ) => {
    const preset = PRODUCT_PRESETS[prodType] || PRODUCT_PRESETS.CUSTOM;
    const text = preset.generateText(code, name, durationLabel);
    navigator.clipboard.writeText(text);
    setCopiedKey(code + '_chat');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSendWhatsApp = (phone: string, text: string) => {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Helper to parse product from note
  const getProductFromNote = (note?: string): ProductType => {
    if (!note) return 'CUSTOM';
    if (note.includes('[FIBO_KYOKO]') || note.toLowerCase().includes('fibo')) return 'FIBO_KYOKO';
    if (note.includes('[TELEBOT]') || note.toLowerCase().includes('telebot')) return 'TELEBOT';
    if (note.includes('[VVIP]')) return 'VVIP';
    if (note.includes('[PRO]')) return 'PRO';
    if (note.includes('[COPYTRADE]') || note.toLowerCase().includes('copytrade')) return 'COPYTRADE';
    return 'CUSTOM';
  };

  // Filter keys
  const filteredKeys = keys.filter((k) => {
    if (filterStatus === 'AVAILABLE' && k.isUsed) return false;
    if (filterStatus === 'USED' && !k.isUsed) return false;
    if (filterProduct !== 'ALL') {
      const prod = getProductFromNote(k.notes);
      if (prod !== filterProduct) return false;
    }
    return true;
  });

  const availableCount = keys.filter((k) => !k.isUsed).length;
  const usedCount = keys.filter((k) => k.isUsed).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 inline-flex items-center justify-center">
              <BoltIcon size="md" />
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-['Space_Grotesk']">
              Pusat Aktivasi Produk &amp; Lisensi PICA
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Tinggal pilih produk &amp; klik 1 kali untuk langsung generate kode lisensi dan template pesan WhatsApp / Telegram siap kirim ke pembeli.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200/80 shrink-0">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'keys' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Kode ({keys.length})
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'devices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Perangkat Terlacak ({devices.length})
          </button>
        </div>
      </div>

      {activeTab === 'keys' && (
        <div className="space-y-8">
          {/* ══════ 1-CLICK PRODUCT ACTIVATION GENERATOR ══════ */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-50/80 border-2 border-slate-200/90 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                  <SparklesIcon size="xs" className="text-blue-600" />
                  <span>Pilih Produk yang Di-Order Pembeli:</span>
                </span>
                <span className="text-[11px] text-slate-500">Klik produk di bawah untuk aktivasi instan</span>
              </div>

              {/* Product Selector Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {(Object.keys(PRODUCT_PRESETS) as ProductType[]).map((pKey) => {
                  const preset = PRODUCT_PRESETS[pKey];
                  const isSelected = selectedProduct === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => setSelectedProduct(pKey)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? `${preset.borderActive} shadow-sm ring-2`
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${preset.tagColor}`}>
                            {preset.badge}
                          </span>
                          {isSelected && <CheckCircleIcon size="xs" className="text-blue-600" />}
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs line-clamp-1 mb-1">{preset.title}</h4>
                      </div>
                      <p className="text-[10px] font-semibold text-slate-500">{preset.priceDisplay}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product Execution Panel */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">{currentPreset.title}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${currentPreset.tagColor}`}>
                      Tier Akses: {currentPreset.tier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{currentPreset.description}</p>
                </div>
              </div>

              <form onSubmit={handle1ClickGenerate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Durations (if multiple) */}
                  {selectedProduct !== 'CUSTOM' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Pilihan Paket / Durasi
                      </label>
                      <select
                        value={selectedDurationIndex}
                        onChange={(e) => setSelectedDurationIndex(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                      >
                        {currentPreset.durations.map((d, idx) => (
                          <option key={idx} value={idx}>
                            {d.label} {d.price ? `(${d.price})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tier</label>
                        <select
                          value={customTier}
                          onChange={(e) => setCustomTier(e.target.value as any)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                        >
                          <option value="PRO">PRO Access</option>
                          <option value="VVIP">VVIP Access</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Durasi Hari</label>
                        <input
                          type="number"
                          value={customDays}
                          onChange={(e) => setCustomDays(Number(e.target.value))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900"
                        />
                      </div>
                    </>
                  )}

                  {/* Buyer Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Nama Pembeli (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Budi Santoso"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Buyer WhatsApp / Phone */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      No. WhatsApp Pembeli (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 08123456789"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Generate Button */}
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={generating}
                      className="w-full py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <BoltIcon size="sm" />
                      <span>{generating ? 'Membuat Lisensi...' : `⚡ 1-Klik Buat Lisensi ${currentPreset.badge}`}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* ══════ LATEST GENERATED SUCCESS CARD ══════ */}
            <AnimatePresence>
              {latestGenerated && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-5 rounded-2xl bg-emerald-50/90 border border-emerald-300 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                      <h4 className="font-extrabold text-emerald-950 text-sm">
                        Lisensi Berhasil Dibuat untuk {PRODUCT_PRESETS[latestGenerated.product].title} ({latestGenerated.durationLabel})
                      </h4>
                    </div>
                    <span className="text-[11px] text-emerald-800 font-semibold">
                      Tinggal kirim ke pembeli via WhatsApp atau Telegram!
                    </span>
                  </div>

                  <div className="space-y-3">
                    {latestGenerated.codes.map((code) => {
                      const chatText = PRODUCT_PRESETS[latestGenerated.product].generateText(
                        code,
                        latestGenerated.buyerName,
                        latestGenerated.durationLabel
                      );

                      return (
                        <div
                          key={code}
                          className="p-4 bg-white rounded-2xl border border-emerald-300 space-y-3 shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500 uppercase">Kode:</span>
                              <span className="font-mono font-extrabold text-base text-slate-900 tracking-wider bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 select-all">
                                {code}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopy(code)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
                              >
                                {copiedKey === code ? (
                                  <>
                                    <CheckIcon size="xs" className="text-emerald-600" />
                                    <span className="text-emerald-600">Kode Tersalin!</span>
                                  </>
                                ) : (
                                  <>
                                    <ClipboardIcon size="xs" />
                                    <span>Salin Kode</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyChatTemplate(
                                    code,
                                    latestGenerated.product,
                                    latestGenerated.buyerName,
                                    latestGenerated.durationLabel
                                  )
                                }
                                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer flex items-center gap-1.5 shadow-xs transition-all"
                              >
                                {copiedKey === code + '_chat' ? (
                                  <>
                                    <CheckIcon size="xs" />
                                    <span>Pesan WA Tersalin!</span>
                                  </>
                                ) : (
                                  <>
                                    <TelegramIcon size="xs" />
                                    <span>Salin Format Pesan WA / Telegram</span>
                                  </>
                                )}
                              </button>

                              {latestGenerated.buyerPhone && (
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsApp(latestGenerated.buyerPhone, chatText)}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer flex items-center gap-1 transition-colors"
                                >
                                  <span>Kirim ke WhatsApp</span>
                                  <span>&rarr;</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Message Preview Box */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-line font-sans leading-relaxed select-all">
                            {chatText}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ══════ FILTER & TABLE ══════ */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              {/* Product Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setFilterProduct('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    filterProduct === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Produk
                </button>
                <button
                  onClick={() => setFilterProduct('FIBO_KYOKO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    filterProduct === 'FIBO_KYOKO' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  🎓 Fibo Kyoko
                </button>
                <button
                  onClick={() => setFilterProduct('TELEBOT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    filterProduct === 'TELEBOT' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  🤖 TELEBOT
                </button>
                <button
                  onClick={() => setFilterProduct('VVIP')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    filterProduct === 'VVIP' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  👑 VVIP
                </button>
                <button
                  onClick={() => setFilterProduct('PRO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    filterProduct === 'PRO' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  ⭐ PRO
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    filterStatus === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-600'
                  }`}
                >
                  Semua ({keys.length})
                </button>
                <button
                  onClick={() => setFilterStatus('AVAILABLE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    filterStatus === 'AVAILABLE' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                  }`}
                >
                  Ready ({availableCount})
                </button>
                <button
                  onClick={() => setFilterStatus('USED')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    filterStatus === 'USED' ? 'bg-slate-600 text-white' : 'text-slate-600'
                  }`}
                >
                  Terpakai ({usedCount})
                </button>

                <button
                  onClick={fetchData}
                  className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1 ml-2"
                >
                  <RefreshIcon size="xs" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Kode Lisensi</th>
                    <th className="p-3">Produk / Paket</th>
                    <th className="p-3">Durasi</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Perangkat Pengguna</th>
                    <th className="p-3">Catatan / Pembeli</th>
                    <th className="p-3 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKeys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        Belum ada kode lisensi di kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredKeys.map((k) => {
                      const detectedProd = getProductFromNote(k.notes);
                      const preset = PRODUCT_PRESETS[detectedProd];
                      const durationLabel = k.durationDays >= 999 ? 'Lifetime' : `${k.durationDays} Hari`;

                      return (
                        <tr key={k.code} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900 select-all">
                            {k.code}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${preset.tagColor}`}>
                              {preset.badge}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-700">
                            {durationLabel}
                          </td>
                          <td className="p-3">
                            {k.isUsed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                Terpakai
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Ready (Tersedia)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {k.usedByDeviceId ? (
                              <span title={k.usedByDeviceId} className="truncate max-w-[140px] inline-block">
                                {k.usedByDeviceId}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-3 text-slate-600 max-w-[180px] truncate" title={k.notes || ''}>
                            {k.notes || '-'}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopy(k.code)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer text-[11px]"
                              >
                                {copiedKey === k.code ? <CheckIcon size="xs" className="text-emerald-600 inline" /> : 'Salin'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyChatTemplate(k.code, detectedProd, '', durationLabel)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold cursor-pointer text-[11px]"
                                title="Salin template chat WA/Telegram khusus produk ini"
                              >
                                {copiedKey === k.code + '_chat' ? 'Tersalin!' : 'Format Chat'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════ DEVICES TAB ══════ */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Setiap pengunjung yang membuka web otomatis terdaftar di sini tanpa perlu login.
            </p>
            <button
              onClick={fetchData}
              className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
            >
              <RefreshIcon size="xs" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Device ID</th>
                  <th className="p-3">Status Tier</th>
                  <th className="p-3">Lokasi (IP/Negara)</th>
                  <th className="p-3">Total Kunjungan</th>
                  <th className="p-3">Kode Lisensi Aktif</th>
                  <th className="p-3">Terakhir Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Belum ada data perangkat yang terekam.
                    </td>
                  </tr>
                ) : (
                  devices.map((d) => (
                    <tr key={d.deviceId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900 select-all">{d.deviceId}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.tier === 'VVIP'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : d.tier === 'PRO'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {d.tier}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {d.city || d.country ? `${d.city || ''} ${d.country || ''}` : d.ipAddress || '-'}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{d.totalVisits} kali</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">{d.activeLicenseCode || '-'}</td>
                      <td className="p-3 text-slate-500">
                        {new Date(d.lastActiveAt).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
