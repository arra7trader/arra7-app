const WEBSITE_FULL_ACCESS_TIERS = new Set([
  'ADMIN',
  'ALL_ACCESS',
  'FULL_ACCESS',
  'LIFETIME',
  'PROMO_125K',
  'VVIP',
  'WEBSITE_LIFETIME',
]);

const ARRA_CRONOS_ACCESS_TIERS = new Set([
  'ADMIN',
  'ALL_ACCESS',
  'ARRA_CRONOS',
  'FULL_ACCESS',
  'LIFETIME',
  'PRO',
  'VVIP',
]);

function normalizeTier(tier: unknown): string {
  return typeof tier === 'string' ? tier.trim().toUpperCase() : '';
}

export function hasFullWebsiteAccess(...tiers: unknown[]): boolean {
  return tiers.some((tier) => WEBSITE_FULL_ACCESS_TIERS.has(normalizeTier(tier)));
}

export function hasArraCronosAccess(...tiers: unknown[]): boolean {
  return tiers.some((tier) => ARRA_CRONOS_ACCESS_TIERS.has(normalizeTier(tier)));
}
