import { CT77_CONFIG } from '@/lib/copytrade77-config';
import { getCopytrade77AdminClient } from '@/lib/supabase-copytrade77';

export interface Copytrade77PricingConfig {
  creditRateIdr: number;
  signalCostCredits: number;
  adminShareCredits: number;
  providerShareCredits: number;
}

const DEFAULT_PRICING: Copytrade77PricingConfig = {
  creditRateIdr: CT77_CONFIG.creditRateIdr,
  signalCostCredits: CT77_CONFIG.signalCostCredits,
  adminShareCredits: CT77_CONFIG.adminShareCredits,
  providerShareCredits: CT77_CONFIG.providerShareCredits,
};

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : fallback;
}

function parsePricingValue(value: unknown): Copytrade77PricingConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_PRICING;
  }

  const record = value as Record<string, unknown>;
  return {
    creditRateIdr: toPositiveInt(record.credit_value_idr, DEFAULT_PRICING.creditRateIdr),
    signalCostCredits: toPositiveInt(record.signal_cost_credits, DEFAULT_PRICING.signalCostCredits),
    adminShareCredits: toPositiveInt(record.admin_share_credits, DEFAULT_PRICING.adminShareCredits),
    providerShareCredits: toPositiveInt(record.provider_share_credits, DEFAULT_PRICING.providerShareCredits),
  };
}

export async function getCopytrade77PricingConfig(): Promise<Copytrade77PricingConfig> {
  const supabase = getCopytrade77AdminClient().schema('copytrade77');
  const { data, error } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'pricing')
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') {
      return DEFAULT_PRICING;
    }
    throw error;
  }

  return parsePricingValue(data?.value);
}
