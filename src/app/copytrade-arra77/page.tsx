'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Tab = 'overview' | 'providers' | 'topup' | 'setup';

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

export default function CopytradeArra77Page() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);

  const [amountIdr, setAmountIdr] = useState(100000);
  const [proofUrl, setProofUrl] = useState('');
  const [proofNote, setProofNote] = useState('');
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
      setOrders(c.status === 'success' ? c.orders || [] : []);
      setTerminals(d.status === 'success' ? d.terminals || [] : []);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat data copytrade.');
    } finally {
      setLoading(false);
    }
  }

  async function act(url: string, body: any, successMsg: string) {
    setError('');
    setMsg('');
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json();
    if (j.status !== 'success') throw new Error(j.message || 'Action failed');
    setMsg(j.message || successMsg);
    return j;
  }

  if (status === 'loading' || loading) return <div className="min-h-screen pt-32 text-center">Loading Copytrade ARRA77...</div>;

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 p-6">
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-700">Copytrade ARRA77</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">AI Signal + EA MT5 + Credit Wallet</h1>
          <p className="text-sm text-slate-600 mt-2">1 signal = 3 credits, 1 credit = Rp1.000, one-trade lock aktif by default.</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
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
          </div>
        </div>

        {msg && <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{msg}</div>}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex gap-2 overflow-auto">
          {(['overview', 'providers', 'topup', 'setup'] as Tab[]).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm ${tab === k ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200'}`}>
              {k === 'overview' ? 'Dashboard' : k === 'providers' ? 'Provider' : k === 'topup' ? 'Topup' : 'Setup EA'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <h3 className="font-semibold mb-2">Credit Ledger</h3>
              <div className="space-y-2 max-h-96 overflow-auto">
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

        {tab === 'providers' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {providers.length === 0 && <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-500">Belum ada provider aktif.</div>}
              {providers.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white border border-slate-200 p-4">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-slate-500">@{p.slug} | {p.riskLevel}</p>
                  <p className="text-sm text-slate-600 mt-2">{p.bio || 'No bio'}</p>
                  <p className="text-xs text-slate-500 mt-2">Winrate {p.stats?.winRatePct || 0}% | Followers {p.followers || 0}</p>
                  <button
                    onClick={async () => {
                      try {
                        await act('/api/copytrade-arra77/follow', { providerId: p.id, fixedLot: 0.01, oneTradeAtATime: true }, 'Follow berhasil');
                        await refresh();
                      } catch (e: any) {
                        setError(e.message);
                      }
                    }}
                    className="mt-3 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm"
                  >
                    {p.myFollowStatus ? `Status: ${p.myFollowStatus}` : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
              <h3 className="font-semibold">Daftar jadi Provider</h3>
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
              <p className="text-xs text-slate-500">Review admin: <Link className="underline" href="/admin/copytrade-arra77">/admin/copytrade-arra77</Link></p>
            </div>
          </div>
        )}

        {tab === 'topup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
              <h3 className="font-semibold">Topup QRIS Manual</h3>
              <p className="text-sm text-slate-600">{data?.qris?.merchantName || 'ARRA7'} | NMID {data?.qris?.nmid || '-'}</p>
              <p className="text-sm text-slate-600">Rate: {fmtIdr(data?.topupPricing?.creditRateIdr || 1000)} / credit</p>
              {data?.qris?.imageUrl && (
                <img src={String(data.qris.imageUrl)} alt="QRIS Payment" className="w-full max-w-sm rounded-xl border border-slate-200" />
              )}
              <input type="number" value={amountIdr} onChange={(e) => setAmountIdr(Number(e.target.value || 0))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Nominal transfer" />
              <input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="URL bukti transfer (opsional)" />
              <textarea value={proofNote} onChange={(e) => setProofNote(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[80px]" placeholder="Catatan bukti" />
              <button
                onClick={async () => {
                  try {
                    await act('/api/copytrade-arra77/topup', { amountIdr, proofImageUrl: proofUrl || null, proofNote: proofNote || null }, 'Topup terkirim');
                    setProofUrl('');
                    setProofNote('');
                    await refresh();
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
                className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm"
              >
                Kirim Topup
              </button>
              <p className="text-xs text-slate-500">Status akan berubah setelah approval admin.</p>
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
                <p className="font-medium">Langkah cepat:</p>
                <ol className="list-decimal ml-5 mt-1 space-y-1">
                  <li>Download file EA dan pasang di MT5 folder `MQL5/Experts`.</li>
                  <li>Generate `Bridge Key + Secret` di panel ini.</li>
                  <li>Isi endpoint bridge: `/api/copytrade-arra77/bridge`.</li>
                  <li>Attach EA di chart XAUUSD M15, aktifkan Algo Trading.</li>
                </ol>
              </div>

              <a href="/downloads/Arra-Copytrade-Bridge.ex5" className="inline-flex rounded-lg bg-slate-900 text-white px-3 py-2 text-sm" download>
                Download EA (.ex5)
              </a>

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
              <p className="text-xs text-slate-500">EA endpoint base: <code>/api/copytrade-arra77/bridge</code></p>
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
