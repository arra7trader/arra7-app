# ARRA7 APK Downloads

This directory contains the Android APK files for direct download.

## Current Version

- **Version:** 3.0.0 Beta
- **File:** `arra7-v3.0.0-beta.apk`
- **Date:** 2026-02-28

## How to Upload APK

### After Building Flutter App:

1. **Build Release APK:**
```bash
cd "d:\LOCAL DOC\ARRA 7 WEB\arra7-mobile"
flutter build apk --release
```

2. **Copy APK to Public Directory:**
```bash
Copy-Item "d:\LOCAL DOC\ARRA 7 WEB\arra7-mobile\build\app\outputs\flutter-apk\app-release.apk" "d:\LOCAL DOC\ARRA 7 WEB\arra7-app\public\downloads\arra7-v3.0.0-beta.apk"
```

3. **Verify File Exists:**
```bash
ls "d:\LOCAL DOC\ARRA 7 WEB\arra7-app\public\downloads"
```

## Version History

- **v3.0.0-beta** (2026-02-28): Android vNext rebuild, simplified modern menu, market + account focus
- **v1.0.0** (2026-02-04): Initial release

## Notes

- APK file is served from `/downloads/arra7-v3.0.0-beta.apk`
- File size is ~25MB (release build from latest mobile output)
- Minimum Android version: 7.0 (Nougat)
