# ARRA7 APK Downloads

This directory contains the Android APK files for direct download.

## Current Version

- **Version:** 1.0.0
- **File:** `arra7-v1.0.0.apk`
- **Date:** 2026-02-04

## How to Upload APK

### After Building Flutter App:

1. **Build Release APK:**
```bash
cd "d:\LOCAL DOC\ARRA 7 WEB\arra7-flutter"
flutter build apk --release
```

2. **Copy APK to Public Directory:**
```bash
Copy-Item "d:\LOCAL DOC\ARRA 7 WEB\arra7-flutter\build\app\outputs\flutter-apk\app-release.apk" "d:\LOCAL DOC\ARRA 7 WEB\arra7-app\public\downloads\arra7-v1.0.0.apk"
```

3. **Verify File Exists:**
```bash
ls "d:\LOCAL DOC\ARRA 7 WEB\arra7-app\public\downloads"
```

## Version History

- **v1.0.0** (2026-02-04): Initial release with Forex, Stock, Fibonacci features

## Notes

- APK file will be served from `/downloads/arra7-v1.0.0.apk`
- File size should be ~15-20MB
- Minimum Android version: 7.0 (Nougat)
