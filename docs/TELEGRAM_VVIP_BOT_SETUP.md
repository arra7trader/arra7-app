# Telegram TELEBOT Setup

This guide configures the Telegram TELEBOT private desk with strict access control:
- Only active TELEBOT members can use bot features.
- Non-active, revoked, and expired users are rejected.

## 1) Required Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_VVIP_DAILY_LIMIT` (default: `50`)
- `TELEGRAM_VVIP_CHAT_MEMORY` (default: `12`)

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

1. User activates TELEBOT from `/telebot` or the pricing page.
2. User submits their Telegram username during payment/approval flow.
3. Admin approves that Telegram username in TELEBOT admin.
4. User opens Telegram bot and sends `/start`.
5. Bot auto-links `chat_id` to the approved username and enables chat access.

## 5) Commands

- `/start`
- `/help`
- `/status`
- `/balance 1000`
- `/risk 1`
- `/setup standard`
- Natural chat, e.g. `aku minta signal xauusd tf m5 dong`

Deprecated:
- `/link` now only returns an informational message because link codes are no longer used.

## 6) Validation Matrix

- Username not approved -> rejected, instructed to complete TELEBOT activation and wait for admin approval.
- Approved username but inactive membership -> rejected.
- Approved username with expired TELEBOT -> rejected.
- Approved username with active TELEBOT -> allowed and auto-linked on `/start`.

## 7) Notes

- TELEBOT no longer uses link codes; identity is resolved from approved Telegram usernames.
- Telegram bot quota is separate from web analysis quota.
- Existing VVIP best-signal alert pipeline remains active.
