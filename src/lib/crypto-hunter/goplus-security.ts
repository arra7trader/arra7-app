import { GoPlusSecurityResponse, TokenSecurity, ChainType } from './types';

const BASE_URL = 'https://api.gopluslabs.io';

const CHAIN_IDS: Record<ChainType, string> = {
  ethereum: '1',
  bsc: '56',
  solana: 'solana',
  base: '8453',
};

export async function checkTokenSecurity(chain: ChainType, tokenAddress: string): Promise<TokenSecurity> {
  const chainId = CHAIN_IDS[chain];

  try {
    const res = await fetch(
      `${BASE_URL}/api/v1/token_security/${chainId}?contract_addresses=${encodeURIComponent(tokenAddress)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      return getDefaultSecurity();
    }

    const data: GoPlusSecurityResponse = await res.json();
    const tokenData = data.result?.[tokenAddress.toLowerCase()] || data.result?.[tokenAddress];

    if (!tokenData) {
      return getDefaultSecurity();
    }

    // Parse holders for distribution analysis
    const holders = Array.isArray(tokenData.holders) ? tokenData.holders : [];
    const top10Percent = holders
      .slice(0, 10)
      .reduce((sum, holder) => sum + finiteNumber(holder.percent, 0), 0) * 100;

    // Find dev/creator holding
    const creatorHolder = holders.find(holder => holder.address?.toLowerCase() === tokenData.creator_address?.toLowerCase());
    const devPercent = creatorHolder ? finiteNumber(creatorHolder.percent, 0) * 100 : null;
    const holderCount = tokenData.holder_count !== undefined && tokenData.holder_count !== '' && Number.isFinite(Number(tokenData.holder_count))
      ? Number(tokenData.holder_count)
      : null;
    const buyTax = tokenData.buy_tax !== undefined && tokenData.buy_tax !== '' && Number.isFinite(Number(tokenData.buy_tax))
      ? Number(tokenData.buy_tax) * 100
      : null;
    const sellTax = tokenData.sell_tax !== undefined && tokenData.sell_tax !== '' && Number.isFinite(Number(tokenData.sell_tax))
      ? Number(tokenData.sell_tax) * 100
      : null;

    const security: TokenSecurity = {
      mintRevoked: tokenData.is_mintable === '0' ? true : tokenData.is_mintable === '1' ? false : null,
      freezeRevoked: null, // GoPlus doesn't directly provide this for all chains
      lpBurned: false, // Need additional check
      lpLocked: false, // Need additional check
      lpLockDuration: null,
      lpLockedPercent: null,
      isHoneypot: tokenData.is_honeypot === '1' ? true : tokenData.is_honeypot === '0' ? false : null,
      buyTax,
      sellTax,
      isOpenSource: tokenData.is_open_source === '1' ? true : tokenData.is_open_source === '0' ? false : null,
      devHoldingPercent: devPercent,
      top10HoldingPercent: top10Percent,
      holderCount,
      bundlePercent: null, // Not available from GoPlus
      rugcheckScore: 'Unknown',
      securityScore: 0,
    };

    // Calculate security score (0-30)
    security.securityScore = calculateSecurityScore(security);

    return security;
  } catch (error) {
    console.error('GoPlus security check failed:', error);
    return getDefaultSecurity();
  }
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface RugcheckResult {
  score: TokenSecurity['rugcheckScore'];
  risks: string[];
  security: Partial<TokenSecurity>;
  holders: number | null;
  rugged: boolean | null;
}

function calculateSecurityScore(security: TokenSecurity): number {
  let score = 0;

  // Mint authority revoked (+6)
  if (security.mintRevoked === true) score += 6;
  else if (security.mintRevoked === false) score -= 6;
  // Unknown checks do not earn security credit.

  // Freeze authority revoked (+4)
  if (security.freezeRevoked === true) score += 4;
  else if (security.freezeRevoked === false) score -= 4;

  // Not a honeypot (+6)
  if (security.isHoneypot === false) score += 6;
  else if (security.isHoneypot === true) score -= 12;

  // Low buy tax (+2)
  if (security.buyTax !== null && security.buyTax <= 1) score += 2;
  else if (security.buyTax !== null && security.buyTax <= 5) score += 1;

  // Low sell tax (+2)
  if (security.sellTax !== null && security.sellTax <= 1) score += 2;
  else if (security.sellTax !== null && security.sellTax <= 5) score += 1;
  else if (security.sellTax !== null && security.sellTax > 10) score -= 4;

  // Open source (+1)
  if (security.isOpenSource) score += 1;

  // LP burned/locked (+2 maximum)
  if (security.lpBurned) score += 2;
  else if (security.lpLocked) score += 1;

  // Concentrated ownership lowers the security score.
  if (security.devHoldingPercent !== null && security.devHoldingPercent > 15) score -= 4;
  if (security.top10HoldingPercent !== null && security.top10HoldingPercent > 60) score -= 4;

  // RugCheck verdict (7 good, 3 warning, danger penalty). Unknown gets no credit.
  if (security.rugcheckScore === 'Good') score += 7;
  else if (security.rugcheckScore === 'Warning') score += 3;
  else if (security.rugcheckScore === 'Danger') score -= 8;

  return Math.max(0, Math.min(score, 30));
}

export function getDefaultSecurity(): TokenSecurity {
  return {
    mintRevoked: null,
    freezeRevoked: null,
    lpBurned: false,
    lpLocked: false,
    lpLockDuration: null,
    lpLockedPercent: null,
    isHoneypot: null,
    buyTax: null,
    sellTax: null,
    isOpenSource: null,
    devHoldingPercent: null,
    top10HoldingPercent: null,
    holderCount: null,
    bundlePercent: null,
    rugcheckScore: 'Unknown',
    securityScore: 0, // Unknown security is not a pass.
  };
}

// Rugcheck API for Solana tokens
export async function checkRugcheck(tokenAddress: string): Promise<RugcheckResult | null> {
  try {
    const res = await fetch(`https://api.rugcheck.xyz/v1/tokens/${encodeURIComponent(tokenAddress)}/report`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const riskEntries = Array.isArray(data.risks) ? data.risks : [];
    const risks = riskEntries.flatMap((risk: { name?: string }) => risk.name ? [risk.name] : []);
    const hasScore = data.score_normalised !== undefined && data.score_normalised !== null && Number.isFinite(Number(data.score_normalised));
    const hasDanger = riskEntries.some((risk: { level?: string }) => risk.level?.toLowerCase() === 'danger');
    const hasWarning = riskEntries.some((risk: { level?: string }) => risk.level?.toLowerCase() === 'warn' || risk.level?.toLowerCase() === 'warning');
    const hasRiskList = Array.isArray(data.risks);
    const hasRevokedAuthorities = data.token?.mintAuthority === null && data.token?.freezeAuthority === null;
    const score: TokenSecurity['rugcheckScore'] = data.rugged === true || hasDanger
      ? 'Danger'
      : hasWarning || risks.length > 0
        ? 'Warning'
        : hasRiskList && hasRevokedAuthorities && data.rugged === false && hasScore ? 'Good' : 'Unknown';

    const holders: { address?: string; owner?: string; pct?: number }[] = Array.isArray(data.topHolders) ? data.topHolders : [];
    const knownAccounts = data.knownAccounts && typeof data.knownAccounts === 'object' ? data.knownAccounts : {};
    const nonHolderAddresses = new Set<string>();
    for (const market of Array.isArray(data.markets) ? data.markets : []) {
      for (const address of [market.pubkey, market.liquidityA, market.liquidityB]) {
        if (typeof address === 'string') nonHolderAddresses.add(address.toLowerCase());
      }
    }
    for (const [address, account] of Object.entries(knownAccounts) as [string, { type?: string }][]) {
      if (['AMM', 'LOCKER', 'BURN'].includes(account.type?.toUpperCase() || '')) nonHolderAddresses.add(address.toLowerCase());
    }
    const seenHolderOwners = new Set<string>();
    const circulatingHolders = holders.filter(holder => {
      const holderAddress = (holder.owner || holder.address || '').toLowerCase();
      if (!holderAddress || nonHolderAddresses.has(holderAddress) || seenHolderOwners.has(holderAddress)) return false;
      seenHolderOwners.add(holderAddress);
      return true;
    });
    const top10HoldingPercent = circulatingHolders.length > 0
      ? circulatingHolders.slice(0, 10).reduce((sum, holder) => sum + (Number(holder.pct) || 0), 0)
      : null;
    const supply = data.token?.supply == null ? NaN : Number(data.token.supply);
    const creatorBalance = data.creatorBalance == null ? NaN : Number(data.creatorBalance);
    const devHoldingPercent = Number.isFinite(supply) && supply > 0 && Number.isFinite(creatorBalance)
      ? (creatorBalance / supply) * 100
      : null;
    const marketLocks: { percent: number; liquidity: number }[] = (Array.isArray(data.markets) ? data.markets : [])
      .flatMap((market: { lp?: { lpLockedPct?: number | null; quoteUSD?: number } }) => {
        const percent = market.lp?.lpLockedPct == null ? NaN : Number(market.lp.lpLockedPct);
        return Number.isFinite(percent) ? [{ percent, liquidity: Number(market.lp?.quoteUSD) || 0 }] : [];
      });
    const totalLockWeight = marketLocks.reduce((sum, market) => sum + market.liquidity, 0);
    const lpLockedPct = marketLocks.length === 0 ? null : totalLockWeight > 0
      ? marketLocks.reduce((sum, market) => sum + market.percent * market.liquidity, 0) / totalLockWeight
      : marketLocks.reduce((sum, market) => sum + market.percent, 0) / marketLocks.length;
    const mintRevoked = data.token?.mintAuthority === null ? true : data.token?.mintAuthority ? false : null;
    const freezeRevoked = data.token?.freezeAuthority === null ? true : data.token?.freezeAuthority ? false : null;

    const security: Partial<TokenSecurity> = {
      mintRevoked,
      freezeRevoked,
      lpLocked: lpLockedPct !== null && lpLockedPct >= 80,
      lpLockedPercent: lpLockedPct,
      lpBurned: false,
      isOpenSource: null,
      devHoldingPercent,
      top10HoldingPercent,
      holderCount: data.totalHolders !== null && data.totalHolders !== undefined && Number.isFinite(Number(data.totalHolders))
        ? Number(data.totalHolders)
        : null,
      rugcheckScore: score,
    };

    const completeSecurity: TokenSecurity = { ...getDefaultSecurity(), ...security, securityScore: 0 };
    completeSecurity.securityScore = calculateSecurityScore(completeSecurity);

    return {
      score,
      risks,
      security: completeSecurity,
      holders: data.totalHolders !== null && data.totalHolders !== undefined && Number.isFinite(Number(data.totalHolders))
        ? Number(data.totalHolders)
        : null,
      rugged: typeof data.rugged === 'boolean' ? data.rugged : null,
    };
  } catch {
    return null;
  }
}
