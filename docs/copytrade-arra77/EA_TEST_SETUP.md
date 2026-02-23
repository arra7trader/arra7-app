# ARRA7 EA Test Setup (XAUUSD)

File source EA test:
- `expert-advisors/Arra7-Copytrade77-Bridge-Test.mq5`
- Download link: `/downloads/Arra7-Copytrade77-Bridge-Test.mq5`

## Input yang dipakai
1. `InpBridgeBaseUrl`:
   - `https://<domain-anda>/api/copytrade-arra77/bridge`
2. `InpBridgeKey`:
   - dari menu `Copytrade ARRA77 -> Setup EA -> Generate Key & Secret`
3. `InpSymbol`:
   - `XAUUSD`
4. `InpLots`:
   - `0.01` (test)

## Langkah MT5
1. Buka MetaEditor -> compile file `.mq5` di atas.
2. Pasang EA ke chart `XAUUSD`.
3. Aktifkan `Algo Trading`.
4. Tambahkan WebRequest URL:
   - `Tools -> Options -> Expert Advisors -> Allow WebRequest for listed URL`
   - isi: `https://<domain-anda>`

## Flow Test
1. Follow provider `Arra7` di web.
2. Buat terminal bridge, pilih follow relation yang aktif.
3. Jalankan EA di MT5.
4. Cek admin panel:
   - `/admin/copytrade-arra77` -> tab `Bridge`
   - terminal harus `ONLINE`.
5. Tunggu signal:
   - sistem auto-analisa XAUUSD (default) dan EA akan polling.

## Catatan
- Mode auth EA test memakai legacy `bridgeKey` (tanpa HMAC header) untuk memudahkan test.
- Server tetap enforce credit, one-trade lock, dan validasi signal.
