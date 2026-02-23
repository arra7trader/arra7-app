# Copytrade ARRA77 Architecture (v1)

## High-Level Components
1. `Web App (Next.js)`:
   - Copytrade UI (follower/provider/admin)
   - API gateway untuk semua operasi copytrade
2. `Supabase (Postgres)`:
   - Source of truth copytrade (signals, dispatch, positions, wallet ledger)
3. `AI Signal Engine`:
   - Mengambil output analisa forex ARRA7
   - Normalisasi ke JSON signal strict + validasi risk
4. `EA MT5 Bridge`:
   - Poll signal
   - Execute order
   - Report ack/open/close/heartbeat

## Data Ownership
- Copytrade data eksklusif di Supabase schema `copytrade77`.
- Main app user/account tetap di DB utama (Turso), lalu dipetakan via `app_user_id`.

## Event-Driven Flow (No Cron)
1. User follow provider + terminal online.
2. EA polling `/bridge/signals/next`.
3. Server mencari signal eligible:
   - provider aktif
   - follower aktif
   - tidak melanggar one-trade lock
4. Jika tidak ada signal, server dapat trigger generate signal baru secara on-demand (dengan cooldown).
5. EA menerima dispatch -> ack -> execute -> report.
6. Saat execute sukses: server settle credit dan split revenue secara atomik.
7. Saat close TP/SL/manual: posisi diupdate, statistik provider ikut ter-update.

## Why This Is Efficient on Vercel Hobby
- Tidak butuh cron internal Vercel.
- Beban compute hanya saat ada traffic nyata (EA/user/admin).
- Polling interval dikontrol dari EA + server cooldown.

## Consistency Rules
1. Semua state transition tervalidasi.
2. Semua event finansial harus punya idempotency key.
3. Semua perubahan wallet lewat function ledger.
4. `one_trade_at_a_time = true` by default pada follow relation.

## Failure Handling
- Bridge timeout -> dispatch tetap `QUEUED/SENT`, tidak debit.
- Execution fail/reject -> status `REJECTED`, tidak debit.
- Duplicate callback -> ditahan idempotency key.
- Terminal offline -> status terminal `OFFLINE` jika heartbeat stale.

## Security
- HMAC signature direkomendasikan untuk endpoint bridge:
  - `X-ARRA-TS`
  - `X-ARRA-NONCE`
  - `X-ARRA-SIGN`
- Replay guard:
  - timestamp skew max 60s
  - nonce single-use window 5 menit
- API key per terminal + secret hash di server.
- Legacy mode masih didukung sementara (bridge key tanpa signature) untuk kompatibilitas EA lama.

## Performance Targets
- Poll response p95 < 500ms.
- Settle execution transaction < 200ms.
- Dashboard queries memakai index by `profile_id`, `terminal_id`, `status`, `created_at`.
