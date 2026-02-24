'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Tab = 'overview' | 'providers' | 'provider-system' | 'topup' | 'setup';
type DashboardPanel = 'activity' | 'wallet' | 'operations';

interface TabCard {
  key: Tab;
  title: string;
  short: string;
  desc: string;
  gradient: string;
}

interface DashboardPanelCard {
  key: DashboardPanel;
  title: string;
  short: string;
  desc: string;
}

interface FollowDraft {
  riskMode: 'FIXED_LOT' | 'MULTIPLIER' | 'RISK_PERCENT';
  fixedLot: number;
  lotMultiplier: number;
  riskPercent: number;
  oneTradeAtATime: boolean;
  maxConcurrentPositions: number;
}

function fmtDate(v?: string | null) {
  if (!v) return '-';
  try {
    return new Date(v).toLocaleString('id-ID');
  } catch {
    return v;
  }
}

function fmtIdr(v: number) {
  return `Rp ${v.toLocaleString('id-ID')}`;
}

function fmtNum(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return '-';
  return Number(v).toLocaleString('id-ID');
}

function fmtProviderWinrate(provider: any) {
  const raw = Number(provider?.stats?.winRatePct || 0);
  const safe = Number.isFinite(raw) ? raw : 0;
  const isArra7 = String(provider?.slug || '').toLowerCase().startsWith('arra7');
  const value = isArra7 ? Math.max(80, safe) : safe;
  const formatted = Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  return isArra7 ? `${formatted}%+` : `${formatted}%`;
}

function riskBadgeClass(riskLevel: string | undefined) {
  const risk = String(riskLevel || 'MEDIUM').toUpperCase();
  if (risk === 'LOW') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (risk === 'HIGH') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-amber-50 text-amber-700 border border-amber-200';
}

function followBadgeClass(followStatus: string | undefined) {
  const status = String(followStatus || '').toUpperCase();
  if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'PAUSED') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (status === 'STOPPED') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-slate-100 text-slate-600 border border-slate-200';
}

function providerStatusBadgeClass(providerStatus: string | undefined) {
  const status = String(providerStatus || '').toUpperCase();
  if (status === 'APPROVED' || status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (status === 'SUSPENDED' || status === 'REJECTED') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-slate-100 text-slate-600 border border-slate-200';
}

export default function CopytradeArra77Page() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>('overview');
  const [dashboardPanel, setDashboardPanel] = useState<DashboardPanel>('activity');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [providerMeta, setProviderMeta] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [followDrafts, setFollowDrafts] = useState<Record<string, FollowDraft>>({});

  const [amountIdr, setAmountIdr] = useState(100000);
  const [terminalLabel, setTerminalLabel] = useState('');
  const [terminalFollowId, setTerminalFollowId] = useState('');
  const [newCreds, setNewCreds] = useState<{ key: string; secret: string } | null>(null);
  const [providerName, setProviderName] = useState('');
  const [providerBio, setProviderBio] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=/copytrade-arra77');
    if (status === 'authenticated') refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const rows = Array.isArray(data?.follows) ? data.follows : [];
    const nextDrafts: Record<string, FollowDraft> = {};
    for (const follow of rows) {
      const id = String(follow?.id || '').trim();
      if (!id) continue;
      const riskRaw = String(follow?.riskMode || 'FIXED_LOT').toUpperCase();
      const riskMode: FollowDraft['riskMode'] =
        riskRaw === 'MULTIPLIER' || riskRaw === 'RISK_PERCENT' ? riskRaw : 'FIXED_LOT';
      nextDrafts[id] = {
        riskMode,
        fixedLot: Number(follow?.fixedLot || 0.01),
        lotMultiplier: Number(follow?.lotMultiplier || 1),
        riskPercent: Number(follow?.riskPercent || 1),
        oneTradeAtATime: Boolean(follow?.oneTradeAtATime ?? true),
        maxConcurrentPositions: Math.max(1, Number(follow?.maxConcurrentPositions || 1)),
      };
    }
    setFollowDrafts(nextDrafts);
  }, [data?.follows]);

  async function refresh() {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const [a, b, c, d] = await Promise.all([
        fetch('/api/copytrade-arra77/dashboard').then((r) => r.json()),
        fetch('/api/copytrade-arra77/providers').then((r) => r.json()),
        fetch('/api/copytrade-arra77/topup').then((r) => r.json()),
        fetch('/api/copytrade-arra77/terminals').then((r) => r.json()),
      ]);
      if (a.status !== 'success') throw new Error(a.message || 'Gagal load Copytrade ARRA77');
      setData(a);
      setProviders(b.status === 'success' ? b.providers || [] : []);
      setProviderMeta(
        b.status === 'success'
          ? {
              myProvider: b.myProvider || null,
              providerRules: b.providerRules || null,
            }
          : null
      );
      setOrders(c.status === 'success' ? c.orders || [] : []);
      setTerminals(d.status === 'success' ? d.terminals || [] : []);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat data copytrade.');
    } finally {
      setLoading(false);
    }
  }

  async function act(url: string, body: any, successMsg: string, method: 'POST' | 'PATCH' = 'POST') {
    setError('');
    setMsg('');
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json();
    if (j.status !== 'success') throw new Error(j.message || 'Action failed');
    setMsg(j.message || successMsg);
    return j;
  }

  function updateFollowDraft(followId: string, patch: Partial<FollowDraft>) {
    setFollowDrafts((prev) => {
      const current = prev[followId];
      if (!current) return prev;
      const next: FollowDraft = { ...current, ...patch };
      if (next.oneTradeAtATime) next.maxConcurrentPositions = 1;
      if (!Number.isFinite(next.maxConcurrentPositions) || next.maxConcurrentPositions < 1) {
        next.maxConcurrentPositions = 1;
      }
      return { ...prev, [followId]: next };
    });
  }

  async function saveFollowSettings(followId: string) {
    const draft = followDrafts[followId];
    if (!draft) return;

    try {
      await act(
        '/api/copytrade-arra77/follow',
        {
          followId,
          riskMode: draft.riskMode,
          fixedLot: draft.fixedLot,
          lotMultiplier: draft.lotMultiplier,
          riskPercent: draft.riskPercent,
          oneTradeAtATime: draft.oneTradeAtATime,
          maxConcurrentPositions: draft.oneTradeAtATime ? 1 : draft.maxConcurrentPositions,
        },
        'Follow settings tersimpan',
        'PATCH'
      );
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function setFollowAction(followId: string, action: 'PAUSE' | 'RESUME' | 'STOP') {
    try {
      await act('/api/copytrade-arra77/follow', { followId, action }, 'Status follow diperbarui', 'PATCH');
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function followProvider(providerId: string) {
    try {
      await act('/api/copytrade-arra77/follow', { providerId, fixedLot: 0.01, oneTradeAtATime: true }, 'Follow berhasil');
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function openTelegramTopupConfirmation(order: { id: string; amount_idr: number; credit_amount: number }) {
    const merchantName = data?.qris?.merchantName || 'ARRA7 FULLSTACK DEVELOPER';
    const nmid = data?.qris?.nmid || '-';
    const username = 'arra7trader';
    const text = [
      'Halo Admin ARRA7!',
      '',
      'Saya sudah transfer topup Copytrade ARRA77 via QRIS:',
      `Order ID: ${order.id}`,
      `Email: ${session?.user?.email || '-'}`,
      `Nama: ${session?.user?.name || '-'}`,
      `Nominal: ${fmtIdr(Number(order.amount_idr || 0))}`,
      `Credit: ${Number(order.credit_amount || 0)} cr`,
      `Merchant: ${merchantName}`,
      `NMID: ${nmid}`,
      '',
      'Mohon diproses. Berikut bukti pembayarannya saya lampirkan di chat ini.',
    ].join('\n');
    const link = `https://t.me/${username}?text=${encodeURIComponent(text)}`;
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  if (status === 'loading' || loading) return <div className="min-h-screen pt-32 text-center">Loading Copytrade ARRA77...</div>;

  const myProvider = providerMeta?.myProvider || data?.provider || null;
  const providerRules = providerMeta?.providerRules || null;
  const providerCreditRate = Number(providerRules?.creditRateIdr || data?.topupPricing?.creditRateIdr || 1000);
  const myChallenge = myProvider?.challenge || null;
  const challengeProgressPct = myChallenge
    ? Math.min(100, Math.round((Number(myChallenge.totalTrades || 0) / Math.max(1, Number(myChallenge.targetTrades || 1))) * 100))
    : 0;
  const activeProviders = (providers || []).filter((p) => String(p?.status || '').toUpperCase() === 'APPROVED');
  const activeFollowProviders = activeProviders.filter((p) => String(p?.myFollowStatus || '').toUpperCase() === 'ACTIVE');
  const onlineTerminals = (terminals || []).filter((t) => String(t?.status || '').toUpperCase() === 'ONLINE');
  const pendingTopups = (orders || []).filter((o) => ['DRAFT', 'SUBMITTED'].includes(String(o?.status || '').toUpperCase()));
  const renderProviderCard = (p: any, context: 'overview' | 'providers') => {
    const followStatus = String(p?.myFollowStatus || '').toUpperCase();
    const isFollowed = followStatus !== '';
    const providerStatus = String(p?.status || 'ACTIVE').toUpperCase();
    const ctaLabel = isFollowed ? 'Kelola di Setup EA' : 'Follow Provider';

    return (
      <div key={p.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500" />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">@{p.slug}</p>
            </div>
            <span className={`text-[11px] px-2 py-1 rounded-lg font-medium ${riskBadgeClass(p.riskLevel)}`}>
              {String(p.riskLevel || 'MEDIUM').toUpperCase()}
            </span>
          </div>

          <p className="text-sm text-slate-600 mt-3 min-h-[42px] leading-relaxed">
            {p.bio || 'Provider tanpa bio.'}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-2">
              <p className="text-[10px] uppercase tracking-wide text-blue-700">Winrate</p>
              <p className="text-sm font-semibold text-blue-900">{fmtProviderWinrate(p)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Followers</p>
              <p className="text-sm font-semibold text-slate-900">{p.followers || 0}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2">
              <p className="text-[10px] uppercase tracking-wide text-emerald-700">Status</p>
              <p className="text-sm font-semibold text-emerald-900">{providerStatus}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <span className={`text-[11px] px-2 py-1 rounded-lg font-medium ${followBadgeClass(isFollowed ? followStatus : '')}`}>
              {isFollowed ? `Follow: ${followStatus}` : 'Belum Follow'}
            </span>
            <span className={`text-[11px] px-2 py-1 rounded-lg font-medium ${providerStatusBadgeClass(providerStatus)}`}>
              Marketplace: {providerStatus}
            </span>
          </div>

          <button
            onClick={() => (isFollowed ? setTab('setup') : followProvider(String(p.id)))}
            className={`mt-3 w-full rounded-xl px-3 py-2 text-sm font-medium transition ${
              isFollowed
                ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {context === 'overview' && isFollowed ? 'Kelola Provider Ini' : ctaLabel}
          </button>
        </div>
      </div>
    );
  };
  const dashboardPanels: DashboardPanelCard[] = [
    {
      key: 'activity',
      title: 'Aktivitas Trade',
      short: 'AT',
      desc: 'Open trade dan history eksekusi.',
    },
    {
      key: 'wallet',
      title: 'Wallet & Topup',
      short: 'WL',
      desc: 'Ledger credit dan status topup.',
    },
    {
      key: 'operations',
      title: 'Bridge & Follow',
      short: 'OP',
      desc: 'Terminal MT5 dan relasi follow.',
    },
  ];
  const tabCards: TabCard[] = [
    {
      key: 'overview',
      title: 'Dashboard',
      short: 'DB',
      desc: 'Pantau posisi, history, dan credit.',
      gradient: 'from-blue-600 to-cyan-500',
    },
    {
      key: 'providers',
      title: 'Provider',
      short: 'PR',
      desc: 'Follow provider dan cek performa.',
      gradient: 'from-indigo-600 to-blue-500',
    },
    {
      key: 'provider-system',
      title: 'Sistem Provider',
      short: 'SP',
      desc: 'Alur challenge dan pembagian hasil.',
      gradient: 'from-emerald-600 to-teal-500',
    },
    {
      key: 'topup',
      title: 'Topup',
      short: 'TP',
      desc: 'Isi saldo credit via QRIS.',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      key: 'setup',
      title: 'Setup EA',
      short: 'EA',
      desc: 'Generate key bridge dan pasang EA.',
      gradient: 'from-slate-700 to-slate-900',
    },
  ];

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 p-6">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-700">Copytrade ARRA77</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">AI Signal + EA MT5 + Credit Wallet</h1>
          <p className="text-sm text-slate-600 mt-2">1 signal = 3 credits, 1 credit = Rp1.000, one-trade lock aktif by default.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Saldo</p>
              <p className="font-semibold">{data?.summary?.balanceCredits ?? 0} cr</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Open Trades</p>
              <p className="font-semibold">{data?.summary?.openPositions ?? 0}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Follows</p>
              <p className="font-semibold">{data?.summary?.activeFollows ?? 0}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Terminal Online</p>
              <p className="font-semibold">{data?.summary?.onlineTerminals ?? 0}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Spent Hari Ini</p>
              <p className="font-semibold">{data?.summary?.todaySpentCredits ?? 0} cr</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3 col-span-2 md:col-span-1">
              <p className="text-xs text-slate-500">Earning Provider</p>
              <p className="font-semibold">{data?.summary?.providerRevenueCredits ?? 0} cr</p>
            </div>
          </div>
        </div>

        {msg && <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{msg}</div>}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>}

        <div className="rounded-2xl bg-white border border-slate-200 p-3 sm:p-4">
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-500">Menu Fitur Copytrade</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {tabCards.map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-300 ${
                    active
                      ? 'border-transparent text-white shadow-lg -translate-y-0.5'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-90'}`} />
                  <div className="relative z-10">
                    <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {item.short}
                    </div>
                    <p className={`mt-2 text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>{item.title}</p>
                    <p className={`mt-1 text-xs leading-relaxed ${active ? 'text-white/85' : 'text-slate-500'}`}>{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-semibold">Provider Aktif Marketplace</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Aktif: {activeProviders.length} provider | Kamu follow aktif: {activeFollowProviders.length}
                  </p>
                </div>
                <button
                  onClick={() => setTab('providers')}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs hover:bg-slate-100"
                >
                  Kelola Provider
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {activeProviders.length === 0 && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
                    Belum ada provider aktif.
                  </div>
                )}
                {activeProviders.slice(0, 6).map((p) => renderProviderCard(p, 'overview'))}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-500">Sub Menu Dashboard</p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {dashboardPanels.map((item) => {
                  const active = dashboardPanel === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setDashboardPanel(item.key)}
                      className={`rounded-xl border p-3 text-left transition ${
                        active ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {item.short}
                      </div>
                      <p className="text-sm font-semibold mt-2">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {dashboardPanel === 'activity' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <h3 className="font-semibold mb-2">Open Trades</h3>
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {(data?.openPositions || []).length === 0 && <p className="text-sm text-slate-500">Belum ada posisi aktif.</p>}
                    {(data?.openPositions || []).map((p: any) => (
                      <div key={p.id} className="border border-slate-100 rounded-xl p-2 text-sm">
                        <p className="font-medium">{p.symbol} | {p.side}</p>
                        <p className="text-slate-600 text-xs">Lot {fmtNum(p.volume_lots)} | Entry {fmtNum(p.entry_price)} | SL {fmtNum(p.stop_loss)} | TP {fmtNum(p.take_profit)}</p>
                        <p className="text-slate-500 text-xs">{fmtDate(p.opened_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <h3 className="font-semibold mb-2">Riwayat Trade</h3>
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {(data?.recentTrades || []).length === 0 && <p className="text-sm text-slate-500">Belum ada trade closed.</p>}
                    {(data?.recentTrades || []).map((p: any) => (
                      <div key={p.id} className="border border-slate-100 rounded-xl p-2 text-sm">
                        <p className="font-medium">{p.symbol} | {p.side} | {p.status}</p>
                        <p className="text-slate-600 text-xs">
                          Entry {fmtNum(p.entry_price)} | Close {fmtNum(p.close_price)} | Pips {fmtNum(p.pips_result)} | PnL {fmtNum(p.pnl_value)}
                        </p>
                        <p className="text-slate-500 text-xs">{fmtDate(p.closed_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dashboardPanel === 'wallet' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
                  <h3 className="font-semibold">Ringkasan Wallet</h3>
                  <p className="text-sm text-slate-700">Saldo: <span className="font-semibold">{data?.wallet?.balance_credits || 0} cr</span></p>
                  <p className="text-sm text-slate-700">Total Topup: <span className="font-semibold">{data?.wallet?.total_topup_credits || 0} cr</span></p>
                  <p className="text-sm text-slate-700">Total Spent: <span className="font-semibold">{data?.wallet?.total_spent_credits || 0} cr</span></p>
                  <button onClick={() => setTab('topup')} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs">
                    Buka Menu Topup
                  </button>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <h3 className="font-semibold mb-2">Order Topup Pending</h3>
                  <div className="space-y-2 max-h-72 overflow-auto">
                    {pendingTopups.length === 0 && <p className="text-sm text-slate-500">Tidak ada topup pending.</p>}
                    {pendingTopups.map((o) => (
                      <div key={o.id} className="border border-slate-100 rounded-xl p-2 text-sm">
                        <p className="font-medium">{fmtIdr(o.amount_idr)} ({o.credit_amount} cr)</p>
                        <p className="text-xs text-slate-500">Status {o.status} | {fmtDate(o.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <h3 className="font-semibold mb-2">Credit Ledger</h3>
                  <div className="space-y-2 max-h-72 overflow-auto">
                    {(data?.ledger || []).length === 0 && <p className="text-sm text-slate-500">Belum ada transaksi.</p>}
                    {(data?.ledger || []).map((l: any) => (
                      <div key={l.id} className="border border-slate-100 rounded-xl p-2 text-sm">
                        <p className="font-medium">{l.direction === 'CREDIT' ? '+' : '-'}{l.amount_credits} cr | {l.entry_type}</p>
                        <p className="text-slate-500 text-xs">{fmtDate(l.created_at)} | {l.description || '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dashboardPanel === 'operations' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <h3 className="font-semibold mb-2">Follow Relations</h3>
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {(data?.follows || []).length === 0 && <p className="text-sm text-slate-500">Belum ada relasi follow.</p>}
                    {(data?.follows || []).map((f: any) => (
                      <div key={f.id} className="border border-slate-100 rounded-xl p-2 text-sm space-y-2">
                        <p className="font-medium">{f.provider?.name || 'Provider'} | {f.status}</p>
                        <p className="text-xs text-slate-500">
                          @{f.provider?.slug || '-'} | Risk {f.riskMode || 'FIXED_LOT'} | Lot {fmtNum(f.fixedLot)} | One-trade {f.oneTradeAtATime ? 'ON' : 'OFF'}
                        </p>

                        {(() => {
                          const draft = followDrafts[String(f.id)];
                          if (!draft) return null;
                          return (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <select
                                  value={draft.riskMode}
                                  onChange={(e) =>
                                    updateFollowDraft(String(f.id), {
                                      riskMode: e.target.value as FollowDraft['riskMode'],
                                    })
                                  }
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs bg-white"
                                >
                                  <option value="FIXED_LOT">FIXED_LOT</option>
                                  <option value="MULTIPLIER">MULTIPLIER</option>
                                  <option value="RISK_PERCENT">RISK_PERCENT</option>
                                </select>

                                {draft.riskMode === 'FIXED_LOT' && (
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={draft.fixedLot}
                                    onChange={(e) =>
                                      updateFollowDraft(String(f.id), {
                                        fixedLot: Number(e.target.value || 0),
                                      })
                                    }
                                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs bg-white"
                                    placeholder="Fixed lot"
                                  />
                                )}

                                {draft.riskMode === 'MULTIPLIER' && (
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={draft.lotMultiplier}
                                    onChange={(e) =>
                                      updateFollowDraft(String(f.id), {
                                        lotMultiplier: Number(e.target.value || 0),
                                      })
                                    }
                                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs bg-white"
                                    placeholder="Lot multiplier"
                                  />
                                )}

                                {draft.riskMode === 'RISK_PERCENT' && (
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={draft.riskPercent}
                                    onChange={(e) =>
                                      updateFollowDraft(String(f.id), {
                                        riskPercent: Number(e.target.value || 0),
                                      })
                                    }
                                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs bg-white"
                                    placeholder="Risk percent"
                                  />
                                )}

                                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={draft.oneTradeAtATime}
                                    onChange={(e) =>
                                      updateFollowDraft(String(f.id), {
                                        oneTradeAtATime: e.target.checked,
                                      })
                                    }
                                  />
                                  One-trade lock
                                </label>

                                <input
                                  type="number"
                                  step="1"
                                  min="1"
                                  disabled={draft.oneTradeAtATime}
                                  value={draft.oneTradeAtATime ? 1 : draft.maxConcurrentPositions}
                                  onChange={(e) =>
                                    updateFollowDraft(String(f.id), {
                                      maxConcurrentPositions: Number(e.target.value || 1),
                                    })
                                  }
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                  placeholder="Max concurrent"
                                />
                              </div>

                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => saveFollowSettings(String(f.id))}
                                  className="rounded-lg bg-blue-600 text-white px-2.5 py-1 text-xs"
                                >
                                  Simpan Settings
                                </button>
                                {String(f.status || '').toUpperCase() === 'ACTIVE' && (
                                  <button onClick={() => setFollowAction(String(f.id), 'PAUSE')} className="rounded-lg bg-amber-500 text-white px-2.5 py-1 text-xs">
                                    Pause
                                  </button>
                                )}
                                {String(f.status || '').toUpperCase() !== 'ACTIVE' && (
                                  <button onClick={() => setFollowAction(String(f.id), 'RESUME')} className="rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-xs">
                                    Resume
                                  </button>
                                )}
                                {String(f.status || '').toUpperCase() !== 'STOPPED' && (
                                  <button onClick={() => setFollowAction(String(f.id), 'STOP')} className="rounded-lg bg-rose-600 text-white px-2.5 py-1 text-xs">
                                    Stop
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">Terminal Bridge</h3>
                    <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Online {onlineTerminals.length}</span>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-auto mt-2">
                    {terminals.length === 0 && <p className="text-sm text-slate-500">Belum ada terminal.</p>}
                    {terminals.map((t) => (
                      <div key={t.id} className="border border-slate-100 rounded-xl p-2 text-sm">
                        <p className="font-medium">{t.terminal_label} | {t.status}</p>
                        <p className="text-slate-500 text-xs">Broker: {t.broker_name || '-'} | Server: {t.server_name || '-'}</p>
                        <p className="text-slate-500 text-xs">Heartbeat: {fmtDate(t.last_heartbeat_at)}</p>
                        {t.last_error && <p className="text-red-600 text-xs">Error: {t.last_error}</p>}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setTab('setup')} className="mt-3 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs">
                    Kelola Setup EA
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'providers' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-semibold">Status Provider Saya</h3>
                  {myProvider ? (
                    <>
                      <p className="text-sm text-slate-700 mt-1">
                        <span className="font-medium">{myProvider.name}</span> @{myProvider.slug}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Status: <span className="font-medium">{myProvider.status}</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">Belum terdaftar sebagai provider.</p>
                  )}
                </div>
                <button onClick={refresh} className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs">
                  Refresh Progress
                </button>
              </div>

              {myProvider && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Total Earning Provider</p>
                    <p className="font-semibold">{myProvider.earnings?.totalProviderRevenueCredits || 0} cr</p>
                    <p className="text-xs text-slate-500">{fmtIdr(Number(myProvider.earnings?.totalProviderRevenueIdr || 0))}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Saldo Wallet</p>
                    <p className="font-semibold">{myProvider.earnings?.walletBalanceCredits || 0} cr</p>
                    <p className="text-xs text-slate-500">
                      Setara {fmtIdr((Number(myProvider.earnings?.walletBalanceCredits || 0) || 0) * providerCreditRate)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Update Revenue Terakhir</p>
                    <p className="font-semibold text-sm">{fmtDate(myProvider.earnings?.lastProviderRevenueAt)}</p>
                  </div>
                </div>
              )}

              {myChallenge && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <div className="flex justify-between gap-3 flex-wrap">
                    <p className="text-sm text-blue-900 font-medium">
                      Challenge: {myChallenge.totalTrades}/{myChallenge.targetTrades} trade | Winrate {myChallenge.winRatePct}%
                    </p>
                    <p className="text-xs text-blue-700">Min winrate {myChallenge.minWinRatePct}%</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-blue-100 overflow-hidden">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${challengeProgressPct}%` }} />
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Wins {myChallenge.wins} | Loss {myChallenge.losses} | BE {myChallenge.breakevenCount} | Status {myChallenge.status}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {providers.length === 0 && <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-500">Belum ada provider aktif.</div>}
              {providers.map((p) => renderProviderCard(p, 'providers'))}
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
              <h3 className="font-semibold">Daftar jadi Provider</h3>
              <p className="text-xs text-slate-500">
                Challenge otomatis: {providerRules?.challengeTargetTrades || 50} trade demo, winrate minimal {providerRules?.challengeMinWinRatePct || 60}%.
              </p>
              <input value={providerName} onChange={(e) => setProviderName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Nama provider" />
              <textarea value={providerBio} onChange={(e) => setProviderBio(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[90px]" placeholder="Bio trading style" />
              <button
                onClick={async () => {
                  try {
                    await act('/api/copytrade-arra77/provider/apply', { displayName: providerName, bio: providerBio, riskLevel: 'MEDIUM' }, 'Pengajuan provider terkirim');
                    setProviderName('');
                    setProviderBio('');
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
                className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm"
              >
                Ajukan Provider
              </button>
              <p className="text-xs text-slate-500">
                Broker bebas. Setelah approve, bagi hasil per signal: admin {providerRules?.adminShareCredits || 1} credit,
                provider {providerRules?.providerShareCredits || 2} credit.
              </p>
            </div>
          </div>
        )}

        {tab === 'provider-system' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
              <h3 className="font-semibold">Alur Menjadi Provider</h3>
              <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1">
                <li>Ajukan provider dari tab Provider.</li>
                <li>Generate terminal bridge dan pasang EA di akun demo broker apa pun.</li>
                <li>Kirim trade close ke endpoint challenge provider.</li>
                <li>Sistem validasi otomatis saat mencapai target trade.</li>
                <li>Jika lolos winrate minimum, provider auto-approve.</li>
              </ol>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                <p>Target challenge: <span className="font-medium">{providerRules?.challengeTargetTrades || 50} trade closed</span></p>
                <p>Winrate minimum: <span className="font-medium">{providerRules?.challengeMinWinRatePct || 60}%</span></p>
                <p>Support broker: <span className="font-medium">Broker bebas (asal EA aktif)</span></p>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
              <h3 className="font-semibold">Sistem Bagi Hasil & Endpoint</h3>
              <p className="text-sm text-slate-700">
                1 signal menelan {providerRules?.signalCostCredits || 3} credit dari follower. Distribusi otomatis:
                admin {providerRules?.adminShareCredits || 1} credit, provider {providerRules?.providerShareCredits || 2} credit.
              </p>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900 break-all">
                Endpoint challenge close trade:
                <br />
                <code>/api/copytrade-arra77/bridge/provider/challenge/trade</code>
              </div>
              <p className="text-xs text-slate-500">
                Payload minimal: <code>tradeId/ticket</code>, <code>symbol</code>, <code>side</code>, <code>entryPrice</code>, <code>closePrice</code>, <code>pnlValue/pipsResult</code>.
              </p>
              <p className="text-xs text-slate-500">
                Akumulasi hasil provider bisa dipantau di tab Provider pada bagian <span className="font-medium">Total Earning Provider</span>.
              </p>
            </div>
          </div>
        )}

        {tab === 'topup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
              <h3 className="font-semibold">Topup QRIS Manual</h3>
              <p className="text-sm text-slate-600">{data?.qris?.merchantName || 'ARRA7'} | NMID {data?.qris?.nmid || '-'}</p>
              <p className="text-sm text-slate-600">Rate: {fmtIdr(data?.topupPricing?.creditRateIdr || 1000)} / credit</p>
              <p className="text-sm text-slate-600">Minimal topup: {fmtIdr(data?.topupPricing?.minTopupIdr || 25000)}</p>
              {data?.qris?.imageUrl && (
                <img src={String(data.qris.imageUrl)} alt="QRIS Payment" className="w-full max-w-sm rounded-xl border border-slate-200" />
              )}
              <input
                type="number"
                min={Number(data?.topupPricing?.minTopupIdr || 25000)}
                value={amountIdr}
                onChange={(e) => setAmountIdr(Number(e.target.value || 0))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nominal transfer"
              />
              <button
                onClick={async () => {
                  try {
                    const r = await act('/api/copytrade-arra77/topup', { amountIdr }, 'Topup terkirim');
                    if (r?.order?.id) {
                      openTelegramTopupConfirmation(r.order);
                    }
                    await refresh();
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
                className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm"
              >
                Konfirmasi Topup via Telegram
              </button>
              <p className="text-xs text-slate-500">Flow sama seperti pricing: scan QRIS, lalu kirim bukti pembayaran ke Telegram admin.</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <h3 className="font-semibold mb-2">Riwayat Topup</h3>
              <div className="space-y-2 max-h-96 overflow-auto">
                {orders.length === 0 && <p className="text-sm text-slate-500">Belum ada order topup.</p>}
                {orders.map((o) => (
                  <div key={o.id} className="border border-slate-100 rounded-xl p-2 text-sm">
                    <p className="font-medium">{fmtIdr(o.amount_idr)} ({o.credit_amount} cr)</p>
                    <p className="text-slate-500 text-xs">Status: {o.status} | {fmtDate(o.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
              <h3 className="font-semibold">Setup EA MT5</h3>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900">
                <p className="font-medium">Panduan follower (wajib):</p>
                <ol className="list-decimal ml-5 mt-1 space-y-1">
                  <li>Download EA `.ex5`, lalu copy ke folder MT5: <code>MQL5/Experts</code>.</li>
                  <li>Restart MT5, buka chart gold broker kamu (contoh <code>XAUUSD.m</code>) di M15, lalu attach EA.</li>
                  <li>Di panel ini klik <b>Generate Key &amp; Secret</b>, lalu simpan datanya.</li>
                  <li>Isi endpoint di EA: <code>https://arra7-app.vercel.app/api/copytrade-arra77/bridge</code>.</li>
                  <li>Isi <code>Bridge Key</code> dan <code>Bridge Secret</code> persis dari panel ini (jangan ada spasi).</li>
                  <li>Set input <code>Symbol</code> EA sama persis dengan simbol broker di Market Watch (contoh <code>XAUUSD.m</code>, <code>GOLD</code>, dll).</li>
                  <li>Aktifkan <b>Algo Trading</b>. Jika benar, EA akan polling otomatis setiap beberapa detik.</li>
                </ol>
                <p className="mt-2 text-xs text-blue-800">
                  Khusus calon provider challenge: kirim closed trade ke endpoint
                  {' '}<code>/api/copytrade-arra77/bridge/provider/challenge/trade</code>.
                </p>
              </div>

              <a href="/downloads/Arra-Copytrade-Bridge.ex5" className="inline-flex rounded-lg bg-slate-900 text-white px-3 py-2 text-sm" download>
                Download EA MT5 (.ex5)
              </a>
              <p className="text-xs text-slate-500">Source EA tidak ditampilkan di web. Gunakan file `.ex5` terbaru di atas.</p>

              <input value={terminalLabel} onChange={(e) => setTerminalLabel(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Label terminal MT5" />
              <select value={terminalFollowId} onChange={(e) => setTerminalFollowId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Pilih follow relation (opsional)</option>
                {(data?.follows || []).map((f: any) => <option key={f.id} value={f.id}>{f.provider?.name || 'Provider'} - {f.status}</option>)}
              </select>
              <button
                onClick={async () => {
                  try {
                    const r = await act('/api/copytrade-arra77/terminals', { terminalLabel, followId: terminalFollowId || null, symbol: 'XAUUSD', timeframe: 'M15' }, 'Terminal dibuat');
                    setNewCreds({ key: r.credentials?.bridgeKey || '', secret: r.credentials?.bridgeSecret || '' });
                    setTerminalLabel('');
                    await refresh();
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
                className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm"
              >
                Generate Key & Secret
              </button>
              {newCreds && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-xs break-all">
                  Key: {newCreds.key}
                  <br />
                  Secret: {newCreds.secret}
                </div>
              )}
              <p className="text-xs text-slate-500">
                Endpoint bridge (path): <code>/api/copytrade-arra77/bridge</code>
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <h3 className="font-semibold mb-2">Terminal List</h3>
              <div className="space-y-2 max-h-96 overflow-auto">
                {terminals.length === 0 && <p className="text-sm text-slate-500">Belum ada terminal.</p>}
                {terminals.map((t) => (
                  <div key={t.id} className="border border-slate-100 rounded-xl p-2 text-sm">
                    <p className="font-medium">{t.terminal_label} | {t.status}</p>
                    <p className="text-slate-500 text-xs">Broker: {t.broker_name || '-'} | Server: {t.server_name || '-'}</p>
                    <p className="text-slate-500 text-xs">Heartbeat: {fmtDate(t.last_heartbeat_at)}</p>
                    {t.last_error && <p className="text-red-600 text-xs">Error: {t.last_error}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-400">Signed in: {session?.user?.email || '-'}</div>
      </div>
    </div>
  );
}
