# Copytrade ARRA77 EA API Contract (Draft v1)

Base path:
- `/api/copytrade-arra77/bridge`

Auth model:
- Per-terminal API key + HMAC signature.
- Headers required:
  - `X-ARRA-KEY`: terminal bridge key
  - `X-ARRA-TS`: unix epoch seconds
  - `X-ARRA-NONCE`: random unique string
  - `X-ARRA-SIGN`: `hex(hmac_sha256(secret, method + "\n" + ts + "\n" + path + "\n" + nonce + "\n" + body))`

Legacy compatibility:
- Jika header signed belum dipakai, bridge key masih bisa dikirim via query/body:
  - query: `bridgeKey` atau `api_key`
  - body: `bridgeKey` atau `apiKey`

## 1) Heartbeat
`POST /heartbeat`

Request:
```json
{
  "terminalId": "3a6f6f4e-0f7b-4e4f-9ce5-9eec2f2e1921",
  "mt5Login": "12345678",
  "broker": "ICMarkets",
  "server": "ICMarketsSC-Demo",
  "symbol": "XAUUSD",
  "timeframe": "M15",
  "eaVersion": "1.0.0",
  "openPositions": 1,
  "latencyMs": 82
}
```

Response:
```json
{
  "status": "ok",
  "serverTime": "2026-02-23T12:00:00.000Z"
}
```

## 2) Poll Next Signal
`GET /signals/next`

Response (no signal):
```json
{
  "status": "ok",
  "hasSignal": false,
  "reason": "ONE_TRADE_LOCK_ACTIVE",
  "generation": {
    "generated": false,
    "reason": "one_trade_lock_active"
  }
}
```

Response (signal available):
```json
{
  "status": "ok",
  "hasSignal": true,
  "dispatch": {
    "dispatchId": "8b2fcb10-90df-4f1f-8db8-a9a3db2d8609",
    "signalId": "f4f350db-62a6-47c9-ae1b-93d2519d69e4",
    "providerId": "4d3a3ef4-1d63-4f4d-a8dc-bf2c0b6ff6a8",
    "symbol": "XAUUSD",
    "side": "SELL",
    "orderType": "SELL_LIMIT",
    "entryPrice": 5175.37,
    "stopLoss": 5182.37,
    "takeProfit1": 5165.0,
    "takeProfit2": 5155.0,
    "takeProfit3": 5145.0,
    "expiresAt": "2026-02-23T12:15:00.000Z",
    "risk": {
      "oneTradeAtATime": true,
      "maxConcurrentPositions": 1
    },
    "creditCost": 3
  }
}
```

## 3) Acknowledge Dispatch
`POST /signals/ack`

Request:
```json
{
  "dispatchId": "8b2fcb10-90df-4f1f-8db8-a9a3db2d8609",
  "terminalId": "3a6f6f4e-0f7b-4e4f-9ce5-9eec2f2e1921"
}
```

Response:
```json
{
  "status": "ok"
}
```

## 4) Report Executed
`POST /signals/executed`

Request:
```json
{
  "dispatchId": "8b2fcb10-90df-4f1f-8db8-a9a3db2d8609",
  "terminalId": "3a6f6f4e-0f7b-4e4f-9ce5-9eec2f2e1921",
  "mt5Ticket": 123456789,
  "executedPrice": 5175.42,
  "volumeLots": 0.1,
  "executedAt": "2026-02-23T12:01:12.000Z",
  "idempotencyKey": "exec-8b2fcb10-123456789"
}
```

Response:
```json
{
  "status": "ok",
  "positionId": "9d1814a9-1ef8-4ec2-8b90-8323ec763f68",
  "wallet": {
    "debitedCredits": 3,
    "remainingCredits": 122
  }
}
```

## 5) Report Reject / Skip
`POST /signals/rejected`

Request:
```json
{
  "dispatchId": "8b2fcb10-90df-4f1f-8db8-a9a3db2d8609",
  "terminalId": "3a6f6f4e-0f7b-4e4f-9ce5-9eec2f2e1921",
  "reasonCode": "SPREAD_TOO_WIDE",
  "reason": "Spread 120 > max 80",
  "idempotencyKey": "reject-8b2fcb10-1"
}
```

Response:
```json
{
  "status": "ok"
}
```

## 6) Report Position Close
`POST /positions/closed`

Request:
```json
{
  "positionId": "9d1814a9-1ef8-4ec2-8b90-8323ec763f68",
  "terminalId": "3a6f6f4e-0f7b-4e4f-9ce5-9eec2f2e1921",
  "mt5Ticket": 123456789,
  "closeReason": "TP",
  "closePrice": 5165.0,
  "closedAt": "2026-02-23T12:20:15.000Z",
  "pipsResult": 103.7,
  "pnlValue": 103.0,
  "idempotencyKey": "close-123456789-1"
}
```

Response:
```json
{
  "status": "ok"
}
```

## 7) Push Bridge Log
`POST /logs`

Request:
```json
{
  "terminalId": "3a6f6f4e-0f7b-4e4f-9ce5-9eec2f2e1921",
  "level": "INFO",
  "message": "No executable signal in current batch.",
  "metadata": {
    "scanned": 0
  }
}
```

Response:
```json
{
  "status": "ok"
}
```

## Error Format
```json
{
  "status": "error",
  "code": "INSUFFICIENT_CREDITS",
  "message": "Follower credit is not enough."
}
```

Suggested error codes:
- `UNAUTHORIZED`
- `INVALID_SIGNATURE`
- `REPLAY_BLOCKED`
- `TERMINAL_NOT_FOUND`
- `DISPATCH_NOT_FOUND`
- `DISPATCH_ALREADY_PROCESSED`
- `INSUFFICIENT_CREDITS`
- `SIGNAL_EXPIRED`
- `ONE_TRADE_LOCK_ACTIVE`
- `INVALID_PAYLOAD`
- `INTERNAL_ERROR`
