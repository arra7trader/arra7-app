# ARRA7 Mobile vNext

Rebuild native Flutter untuk Android dengan scope:
- Login Google native
- Analisa Market (Forex/Gold/Crypto)
- Info Akun (nama, email, tier, quota)

Tidak ada WebView pada flow utama.

## Arsitektur

```text
lib/
  app/
  core/
  features/
    auth/
    market/
    account/
```

## Konfigurasi Build

Gunakan `--dart-define` untuk environment:

```bash
flutter run \
  --dart-define=API_BASE_URL=https://arra7-app.vercel.app \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=YOUR_GOOGLE_SERVER_CLIENT_ID
```

Build APK release:

```bash
flutter build apk --release \
  --dart-define=API_BASE_URL=https://arra7-app.vercel.app \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=YOUR_GOOGLE_SERVER_CLIENT_ID
```

## Requirement Backend

Endpoint mobile yang dipakai aplikasi:
- `POST /api/auth/mobile-google`
- `GET /api/mobile/bootstrap`
- `GET /api/user/me`
- `GET /api/user/quota`
- `POST /api/analyze`

## Catatan Google Sign-In

Pastikan konfigurasi OAuth Google untuk Android sudah benar:
- SHA-1 / SHA-256 signing certificate terdaftar di Google Cloud
- `GOOGLE_SERVER_CLIENT_ID` sesuai Web Client ID untuk issue ID Token
