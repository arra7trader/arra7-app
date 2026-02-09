# 🚀 Panduan Deploy ARRA7 ke Vercel

## Prasyarat

1. ✅ Akun GitHub
2. ✅ Akun Vercel (gratis di vercel.com)
3. ✅ Credentials yang sudah disiapkan

---

## Step 1: Push ke GitHub

### Jika belum ada repository:

```bash
cd "d:\LOCAL DOC\ARRA 7 WEB\arra7-app"

# Inisialisasi Git
git init

# Tambahkan semua file
git add .

# Commit
git commit -m "Initial commit: ARRA7 Trading Platform"

# Buat repository di GitHub lalu:
git remote add origin https://github.com/USERNAME/arra7-app.git
git branch -M main
git push -u origin main
```

### Jika sudah ada repository:

```bash
git add .
git commit -m "Add admin panel and payment integration"
git push
```

---

## Step 2: Deploy ke Vercel

1. Buka **[vercel.com](https://vercel.com)**
2. Login dengan GitHub
3. Klik **"Add New Project"**
4. Pilih repository **arra7-app**
5. Klik **"Deploy"**

---

## Step 3: Set Environment Variables

Di Vercel Dashboard > Settings > Environment Variables, tambahkan:

| Variable | Value |
|----------|-------|
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | `arra7-quantum-strategist-secret-key-2024` |
| `GOOGLE_CLIENT_ID` | (dari Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | (dari Google Cloud Console) |
| `GROQ_API_KEY` | (dari Groq) |
| `TURSO_DATABASE_URL` | `libsql://arra7-db-arra7trader.aws-ap-northeast-1.turso.io` |
| `TURSO_AUTH_TOKEN` | (token Turso Anda) |

---

## Step 4: Update Google OAuth

Di **Google Cloud Console**:

1. Pergi ke **APIs & Services > Credentials**
2. Edit OAuth 2.0 Client
3. Tambahkan **Authorized redirect URIs**:
   - `https://your-app.vercel.app/api/auth/callback/google`
4. Simpan

---

## Step 5: Verifikasi

1. Buka `https://your-app.vercel.app`
2. Test login dengan Google
3. Test analisa market
4. Test admin panel: `https://your-app.vercel.app/admin`

---

## Troubleshooting

### Error: "NEXTAUTH_URL mismatch"
- Pastikan `NEXTAUTH_URL` di Vercel sama dengan domain Vercel Anda

### Error: "Google OAuth error"
- Pastikan callback URL di Google Cloud Console sudah benar

### Error: "Database connection failed"
- Cek `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN`

---

## 📞 Support

Jika ada masalah, hubungi via Telegram: @arra7trader
