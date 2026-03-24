# Script untuk commit dan push perubahan Telegram Template ke GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PUSH TO GITHUB & DEPLOY TO VERCEL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set working directory
Set-Location "d:\LOCAL DOC\ARRA 7 WEB\arra7-app"

Write-Host "[1/5] Checking git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "[2/5] Adding changed files..." -ForegroundColor Yellow
git add src/lib/telegram.ts
git add src/components/admin/TelegramMarketing.tsx
git add src/app/api/admin/telegram/route.ts
git add src/app/api/cron/telegram/route.ts

Write-Host ""
Write-Host "[3/5] Committing changes..." -ForegroundColor Yellow
git commit -m "feat: update Telegram templates to Copytrade ARRA77 daily rotating content

- Replace 7 old marketing templates with 7 daily Copytrade education templates
- Templates rotate every 24 hours (Monday-Sunday cycle)
- New templates cover: Registration, Top Up, Follow Provider, EA Bridge, Results, FAQ, Promo
- Update cron job to send daily at 08:00 WIB (from every 5 hours)
- Update admin panel UI for new template selection
- All content in Indonesian for easier understanding

BREAKING: MARKETING_TEMPLATES replaced with COPYTRADE_TEMPLATES"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Commit failed or no changes to commit" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[4/5] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[5/5] Deployment Status:" -ForegroundColor Yellow
Write-Host "✅ Code pushed to GitHub" -ForegroundColor Green
Write-Host "⏳ Vercel will auto-deploy in 2-5 minutes" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT IN PROGRESS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check deployment status at:" -ForegroundColor White
Write-Host "https://vercel.com/dashboard" -ForegroundColor Blue
Write-Host ""
Write-Host "After deployment:" -ForegroundColor Yellow
Write-Host "1. Go to Admin Panel: /admin" -ForegroundColor White
Write-Host "2. Navigate to Telegram Marketing section" -ForegroundColor White
Write-Host "3. Click 'Start' to enable auto-posting" -ForegroundColor White
Write-Host "4. Or click any daily template to send manually" -ForegroundColor White
Write-Host ""
