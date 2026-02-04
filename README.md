# ARRA7 Mobile App

Aplikasi mobile Android & iOS untuk ARRA7 Trading Signals.

## 📱 Fitur

- **WebView** - Membungkus website ARRA7 dalam aplikasi native
- **Bottom Navigation** - Navigasi cepat ke fitur utama:
  - Beranda
  - Analisa Market (Forex/Gold/Crypto)
  - Analisa Saham
  - Depth Matrix
  - Akun
- **Push Notifications** - Notifikasi sinyal trading (Firebase)
- **Splash Screen** - Animated splash dengan branding ARRA7

## 🚀 Cara Menjalankan

### Prasyarat
1. Install Flutter SDK: https://docs.flutter.dev/get-started/install/windows
2. Install Android Studio dengan SDK
3. Jalankan `flutter doctor` untuk verifikasi

### Langkah-langkah

```bash
# 1. Masuk ke folder project
cd arra7-mobile

# 2. Install dependencies
flutter pub get

# 3. Jalankan di emulator/device
flutter run

# 4. Build APK (release)
flutter build apk --release

# 5. Build untuk iOS (memerlukan Mac)
flutter build ios --release
```

## 📁 Struktur Project

```
arra7-mobile/
├── lib/
│   ├── main.dart              # Entry point
│   ├── providers/
│   │   └── app_provider.dart  # State management
│   ├── screens/
│   │   ├── splash_screen.dart # Splash screen
│   │   └── main_screen.dart   # Main dengan bottom nav
│   ├── theme/
│   │   └── app_theme.dart     # Tema & warna ARRA7
│   └── widgets/
│       ├── webview_container.dart # WebView widget
│       └── bottom_nav_bar.dart    # Custom bottom nav
├── android/                   # Konfigurasi Android
├── ios/                       # Konfigurasi iOS
├── assets/                    # Asset images & fonts
└── pubspec.yaml              # Dependencies
```

## 🎨 Customization

### Mengubah URL Website
Edit `lib/screens/main_screen.dart` dan ubah URL di `_navItems`.

### Mengubah Icon Aplikasi
1. Ganti file di `assets/images/splash_logo.png`
2. Untuk launcher icon, gunakan:
   - Android: letakkan di `android/app/src/main/res/mipmap-*/`
   - iOS: gunakan Asset Catalog di Xcode

### Push Notifications
1. Setup Firebase project
2. Download `google-services.json` (Android) dan `GoogleService-Info.plist` (iOS)
3. Letakkan di folder yang sesuai

## 📦 APK Output

Setelah build, APK dapat ditemukan di:
```
build/app/outputs/flutter-apk/app-release.apk
```

## 🔧 Troubleshooting

### Error: Android licenses not accepted
```bash
flutter doctor --android-licenses
```

### Error: SDK path not found
Pastikan Flutter SDK sudah di-add ke PATH environment variable.

---

**ARRA7** - AI Trading Signals © 2026
