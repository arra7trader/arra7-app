function parseIntSafe(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolSafe(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
}

export const CT77_CONFIG = {
  creditRateIdr: parseIntSafe(process.env.CT77_CREDIT_RATE_IDR, 1000),
  signalCostCredits: parseIntSafe(process.env.CT77_SIGNAL_COST_CREDITS, 3),
  adminShareCredits: parseIntSafe(process.env.CT77_ADMIN_SHARE_CREDITS, 1),
  providerShareCredits: parseIntSafe(process.env.CT77_PROVIDER_SHARE_CREDITS, 2),
  minSlPips: parseIntSafe(process.env.CT77_MIN_SL_PIPS, 70),
  oneTradeLock: parseBoolSafe(process.env.CT77_ONE_TRADE_LOCK, true),
  bridgeMaxSkewSeconds: parseIntSafe(process.env.CT77_BRIDGE_MAX_SKEW_SECONDS, 60),
  qrisImageUrl: process.env.CT77_QRIS_IMAGE_URL || '/qris-payment.jpg',
  qrisMerchantName: process.env.CT77_QRIS_MERCHANT_NAME || 'ARRA7',
  qrisNmid: process.env.CT77_QRIS_NMID || '',
  bridgeHmacSecret: process.env.CT77_BRIDGE_HMAC_SECRET || '',
};

