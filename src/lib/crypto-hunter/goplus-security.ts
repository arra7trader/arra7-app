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
      `${BASE_URL}/api/v1/token_security/${chainId}?contract_addresses=${tokenAddress}`,
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
    const holders = tokenData.holders || [];
    const top10Percent = holders
      .slice(0, 10)
      .reduce((sum, h) => sum + parseFloat(h.percent || '0'), 0) * 100;

    // Find dev/creator holding
    const creatorHolder = holders.find(h => h.address.toLowerCase() === tokenData.creator_address?.toLowerCase());
    const devPercent = creatorHolder ? parseFloat(creatorHolder.percent) * 100 : 0;

    const security: TokenSecurity = {
      mintRevoked: tokenData.is_mintable === '0' ? true : tokenData.is_mintable === '1' ? false : null,
      freezeRevoked: null, // GoPlus doesn't directly provide this for all chains
      lpBurned: false, // Need additional check
      lpLocked: false, // Need additional check
      lpLockDuration: null,
      isHoneypot: tokenData.is_honeypot === '1' ? true : tokenData.is_honeypot === '0' ? false : null,
      buyTax: tokenData.buy_tax ? parseFloat(tokenData.buy_tax) * 100 : null,
      sellTax: tokenData.sell_tax ? parseFloat(tokenData.sell_tax) * 100 : null,
      isOpenSource: tokenData.is_open_source === '1',
      devHoldingPercent: devPercent,
      top10HoldingPercent: top10Percent,
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

function calculateSecurityScore(security: TokenSecurity): number {
  let score = 0;

  // Mint authority revoked (+6)
  if (security.mintRevoked === true) score += 6;
  else if (security.mintRevoked === null) score += 2; // Unknown, partial credit

  // Freeze authority revoked (+4)
  if (security.freezeRevoked === true) score += 4;
  else if (security.freezeRevoked === null) score += 1;

  // Not a honeypot (+6)
  if (security.isHoneypot === false) score += 6;
  else if (security.isHoneypot === null) score += 1;

  // Low buy tax (+2)
  if (security.buyTax !== null && security.buyTax <= 1) score += 2;
  else if (security.buyTax !== null && security.buyTax <= 5) score += 1;

  // Low sell tax (+2)
  if (security.sellTax !== null && security.sellTax <= 1) score += 2;
  else if (security.sellTax !== null && security.sellTax <= 5) score += 1;

  // Dev holding < 5% (+3)
  if (security.devHoldingPercent !== null) {
    if (security.devHoldingPercent < 5) score += 3;
    else if (security.devHoldingPercent < 10) score += 1;
  }

  // Top 10 holders < 30% (+4)
  if (security.top10HoldingPercent !== null) {
    if (security.top10HoldingPercent < 30) score += 4;
    else if (security.top10HoldingPercent < 50) score += 2;
  }

  // Open source (+1)
  if (security.isOpenSource) score += 1;

  // LP burned/locked (+2)
  if (security.lpBurned) score += 2;
  else if (security.lpLocked) score += 1;

  return Math.min(score, 30);
}

function getDefaultSecurity(): TokenSecurity {
  return {
    mintRevoked: null,
    freezeRevoked: null,
    lpBurned: false,
    lpLocked: false,
    lpLockDuration: null,
    isHoneypot: null,
    buyTax: null,
    sellTax: null,
    isOpenSource: null,
    devHoldingPercent: null,
    top10HoldingPercent: null,
    bundlePercent: null,
    rugcheckScore: 'Unknown',
    securityScore: 5, // Minimal score for unknown
  };
}

// Rugcheck API for Solana tokens
export async function checkRugcheck(tokenAddress: string): Promise<{ score: string; risks: string[] }> {
  try {
    const res = await fetch(`https://api.rugcheck.xyz/v1/tokens/${tokenAddress}/report`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { score: 'Unknown', risks: [] };
    const data = await res.json();

    // Parse rugcheck response
    const risks: string[] = [];
    let score: 'Good' | 'Warning' | 'Danger' | 'Unknown' = 'Unknown';

    if (data.score !== undefined) {
      if (data.score >= 70) score = 'Good';
      else if (data.score >= 40) score = 'Warning';
      else score = 'Danger';
    }

    if (data.risks && Array.isArray(data.risks)) {
      for (const risk of data.risks) {
        if (risk.name) risks.push(risk.name);
      }
    }

    return { score, risks };
  } catch {
    return { score: 'Unknown', risks: [] };
  }
}
