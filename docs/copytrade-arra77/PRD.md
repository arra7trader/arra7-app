# Copytrade ARRA77 PRD (v1)

## 1) Product Vision
Bangun fitur `Copytrade ARRA77` yang membuat user retail bisa mengikuti signal AI/Trader secara otomatis di MT5 melalui EA, dengan model monetisasi credit yang transparan, terukur, dan aman.

Fokus v1:
- Sinyal otomatis dari AI analisa forex ARRA7.
- Eksekusi via EA MT5 yang terhubung ke web.
- Monetisasi credit: `1 signal = 3 credit`, `1 credit = Rp1.000`.
- Marketplace provider/trader dengan pembagian hasil.

## 2) Core Goals
- User bisa topup credit, follow provider, dan auto-copy trade.
- Admin punya panel operasional lengkap (approval provider, topup, monitoring bridge).
- EA sinkron dengan signal website secara konsisten.
- Sistem berjalan di Vercel Hobby tanpa cron internal (event-driven + pull model).

## 3) Non-Goals (v1)
- Auto payout bank full otomatis.
- Multi-broker advanced routing.
- Direct client Supabase auth (v1 fokus server-side API via Next.js).

## 4) Personas
- Follower: topup credit, pilih provider, jalankan EA, monitor hasil.
- Provider/Trader: publish/peroleh revenue share dari signal tereksekusi.
- Admin: approval, monitoring, adjustment credit, audit log.

## 5) Business Rules (Locked)
1. Signal cost: `3 credits` per eksekusi signal follower.
2. Credit rate: `Rp1.000` per credit.
3. Revenue split:
   - Admin: `1 credit`
   - Provider: `2 credits`
4. Debit credit hanya saat signal benar-benar `EXECUTED` di MT5.
5. Jika order gagal/reject, tidak ada debit credit.
6. One-trade lock (default ON): follower harus menyelesaikan posisi aktif dulu sebelum signal baru dieksekusi.

## 6) Signal Quality & Risk Guardrails (Mandatory)
1. Validasi side/order:
   - BUY: SL < entry, TP > entry
   - SELL: SL > entry, TP < entry
2. Minimal jarak SL: `>= 70 pips` (configurable).
3. Spread/slippage guard di EA.
4. Max open positions per follower (default 1).
5. Signal expiry time (mis. 30 menit) untuk hindari entry kadaluarsa.
6. Idempotency wajib untuk semua event execution supaya tidak double debit/double order.

## 7) UX Scope
Menu baru di landing page: `Copytrade ARRA77`.

Halaman utama Copytrade:
- Dashboard follower:
  - Credit balance
  - EA status (online/offline)
  - Open trades
  - Trade history
  - Credit ledger
- Topup credit:
  - QRIS manual (upload bukti)
  - Status approval
- Provider list:
  - Performance, risk level, followers
  - Follow/Unfollow
- Setup EA guide:
  - Download EA
  - API key/bridge key
  - Step-by-step MT5

Admin panel Copytrade:
- Provider approval queue
- Topup approval queue
- Bridge terminals monitor
- Signal monitor (published/executed/closed)
- Manual wallet adjustment + reason
- Revenue summary (admin vs provider)

## 8) Architecture (Context7-aligned)
Prinsip utama:
- Event-driven, bukan time-based cron.
- Pull-based dispatch dari EA (terminal polling).
- Ledger immutable untuk transaksi credit.
- Strong idempotency untuk endpoint bridge.

Alur singkat:
1. AI engine menghasilkan signal terstruktur.
2. Signal tervalidasi disimpan ke Supabase.
3. EA polling endpoint `signals/next`.
4. Backend kirim signal yang eligible.
5. EA ack + execute + report open/close.
6. Backend settle credit (debit follower, credit provider/admin) saat `EXECUTED`.

## 9) Tanpa Cron di Vercel Hobby
Rekomendasi final v1:
- `EA-driven polling` sebagai pemicu utama eksekusi.
- `On-demand generation` signal saat dibutuhkan (ketika ada follower aktif + terminal online).
- `Lazy maintenance` dipicu oleh request normal:
  - mark signal expired
  - mark terminal offline jika heartbeat stale
  - refresh statistik ringan

Opsional v2:
- External scheduler gratis (GitHub Actions / Supabase scheduled) untuk housekeeping non-kritis.

## 10) Security Model
- Semua operasi sensitif lewat Next.js server API (service-role Supabase di server).
- HMAC signature untuk bridge request (timestamp + nonce + body hash).
- Replay protection (nonce registry + max skew waktu).
- Audit trail untuk topup, debit, revenue split, adjustment admin.

## 11) Data Integrity
- Atomic transaction untuk settle execution.
- Wallet update wajib melalui ledger function (tidak direct update balance).
- Unique idempotency key per event penting.
- Soft status transition ketat (queued -> sent -> ack -> executed -> closed).

## 12) Metrics of Success
- Execution success rate >= 98% (market jam aktif).
- Duplicate execution = 0.
- Credit mismatch = 0.
- Median bridge response < 300ms.
- User complaint rate topup/credit < 2%.

## 13) Delivery Phases
Phase 0 (current):
- PRD + architecture + schema + EA API contract.

Phase 1:
- Supabase schema + server API skeleton + menu landing + pages scaffold.

Phase 2:
- Topup flow + admin approvals + wallet ledger.

Phase 3:
- AI signal publish pipeline + bridge dispatch + EA integration.

Phase 4:
- Provider revenue split + analytics + hardening + QA end-to-end.

## 14) Recommended Improvements Beyond Initial Request
1. Tambah `circuit breaker`: auto-pause dispatch jika reject/error rate broker tinggi.
2. Tambah `risk profile` follower (conservative/standard/aggressive).
3. Tambah `kill switch` admin global untuk emergency stop.
4. Tambah `signal sandbox` untuk test mode tanpa debit credit.

