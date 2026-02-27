# Telegram VVIP Bot Setup

This guide configures the Telegram VVIP chatbot with strict access control:
- Only active VVIP users can use bot features.
- BASIC, PRO, and expired users are rejected.

## 1) Required Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_VVIP_DAILY_LIMIT` (default: `50`)
- `TELEGRAM_VVIP_CHAT_MEMORY` (default: `12`)
- `TELEGRAM_LINK_CODE_TTL_MINUTES` (default: `10`)

Optional (already used by existing features):
- `TELEGRAM_CHANNEL_ID`

## 2) Deploy

Deploy latest code to production.

## 3) Register Telegram Webhook With Secret Token

Run:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<YOUR_DOMAIN>/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "drop_pending_updates": true
  }'
```

Verify:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## 4) User Flow

1. User opens `/analisa-market`.
2. VVIP active user clicks **Generate Kode Link**.
3. User sends `/link <KODE>` to Telegram bot.
4. Bot links `chat_id` to user and enables chat access.

## 5) Commands

- `/start`
- `/help`
- `/link <KODE>`
- `/status`
- Natural chat, e.g. `aku minta signal xauusd tf m5 dong`

## 6) Validation Matrix

- Unlinked user -> rejected, instructed to `/link`.
- Linked BASIC/PRO -> rejected.
- Linked expired VVIP -> rejected.
- Linked active VVIP -> allowed.

## 7) Notes

- Telegram bot quota is separate from web analysis quota.
- Existing VVIP best-signal alert pipeline remains active.
