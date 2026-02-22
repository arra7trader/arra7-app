# Setup Supabase Copytrade Bridge
## 1. Jalankan SQL Setup
1. Buka Supabase Project untuk copytrade bridge.
2. Masuk ke `SQL Editor`.
3. Jalankan file `supabase/copytrade_bridge_setup.sql`.
4. Pastikan hasil verifikasi paling bawah bernilai `1` untuk semua tabel.

## 2. Set Environment Variables
Isi di Vercel/hosting:

```env
COPYTRADE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
COPYTRADE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
COPYTRADE_SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

ADMIN_EMAILS=apmexplore@gmail.com,admin@arra.com

CT_QRIS_IMAGE_URL=/qris-payment.jpg
CT_QRIS_MERCHANT_NAME=ARRA7 FULLSTACK DEVELOPER
CT_QRIS_NMID=ID1025468752486
QRIS_ID_WEBHOOK_SECRET=YOUR_QRIS_WEBHOOK_SECRET (optional)

CT_BRIDGE_EA_SECRET=YOUR_STRONG_HMAC_SECRET
```

Catatan:
- `COPYTRADE_SUPABASE_SERVICE_ROLE_KEY` sangat direkomendasikan untuk API server-side.
- Jika `QRIS_ID_WEBHOOK_SECRET` kosong, webhook tetap diterima (kurang aman).
- Untuk akun QRIS non-API (gratis), gunakan flow manual verification: user submit bukti bayar, admin approve/reject.

## 3. Setup Webhook QRIS
Set callback webhook di provider QRIS (`qris.id`) ke:

`https://YOUR_DOMAIN/api/copytrade-bridge/topup/webhook`

Header signature yang didukung backend:
- `x-qris-signature`
- `x-signature`
- `x-callback-signature`

## 4. Endpoint Smoke Test
Setelah deploy:

1. Login ke web, buka `/copytrade-bridge`.
2. Klik `Buat Order Topup`.
3. Bayar lewat QRIS lalu klik `Saya Sudah Bayar, Kirim Bukti`.
4. Pastikan status order user jadi `paid`.
5. Buka admin `/admin/copytrade-bridge` tab `Topup Orders`, lalu `Approve`.
6. Cek status order jadi `credited` dan saldo user bertambah.
7. (Opsional) Jika webhook QRIS tersedia, kirim webhook sukses untuk auto-credit.

## 5. Query Verifikasi Cepat (SQL Editor)
```sql
select status, count(*) from ct_topups group by status order by status;
select entry_type, direction, count(*) from ct_ledger group by entry_type, direction order by entry_type, direction;
select provider, processed, count(*) from ct_payment_events group by provider, processed order by provider, processed;
```
