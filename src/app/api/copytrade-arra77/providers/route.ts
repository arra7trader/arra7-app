import { NextResponse } from 'next/server';
import { requireCopytrade77SessionProfile } from '@/lib/copytrade77-session';
import { getCopytrade77PricingConfig } from '@/lib/copytrade77-pricing';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';
import { getOrCreateSystemProviderId } from '@/lib/copytrade77-signal-engine';
import { CT77_CONFIG } from '@/lib/copytrade77-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    const { profile } = await requireCopytrade77SessionProfile();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');
    const pricing = await getCopytrade77PricingConfig();

    // Ensure default system provider "Arra7" is always available in marketplace.
    await getOrCreateSystemProviderId();

    const [providerRes, statsRes, followerRes, myFollowRes, myProviderRes, myWalletRes] = await Promise.all([
      supabase
        .from('providers')
        .select('id,display_name,slug,bio,risk_level,status,created_at')
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('provider_stats')
        .select('provider_id,total_closed_positions,tp_hits,sl_hits,win_rate_pct,total_pips'),
      supabase
        .from('follow_relations')
        .select('provider_id,status')
        .eq('status', 'ACTIVE'),
      supabase
        .from('follow_relations')
        .select('provider_id,status')
        .eq('follower_profile_id', profile.id),
      supabase
        .from('providers')
        .select('id,display_name,slug,bio,risk_level,status,created_at,approved_at')
        .eq('profile_id', profile.id)
        .maybeSingle(),
      supabase
        .from('wallets')
        .select('balance_credits,total_earned_credits')
        .eq('profile_id', profile.id)
        .maybeSingle(),
    ]);

    if (providerRes.error) throw providerRes.error;
    if (statsRes.error) throw statsRes.error;
    if (followerRes.error) throw followerRes.error;
    if (myFollowRes.error) throw myFollowRes.error;
    if (myProviderRes.error) throw myProviderRes.error;
    if (myWalletRes.error) throw myWalletRes.error;

    const statsMap = new Map<string, any>((statsRes.data || []).map((row) => [String(row.provider_id), row]));

    const followerCountMap = new Map<string, number>();
    for (const row of followerRes.data || []) {
      const providerId = String(row.provider_id);
      followerCountMap.set(providerId, (followerCountMap.get(providerId) || 0) + 1);
    }

    const myFollowMap = new Map<string, string>();
    for (const row of myFollowRes.data || []) {
      myFollowMap.set(String(row.provider_id), String(row.status));
    }

    const providers = (providerRes.data || []).map((provider) => {
      const stats = statsMap.get(String(provider.id));
      return {
        id: provider.id,
        name: provider.display_name,
        slug: provider.slug,
        bio: provider.bio,
        riskLevel: provider.risk_level,
        status: provider.status,
        followers: followerCountMap.get(String(provider.id)) || 0,
        stats: {
          totalClosed: stats?.total_closed_positions || 0,
          tpHits: stats?.tp_hits || 0,
          slHits: stats?.sl_hits || 0,
          winRatePct: stats?.win_rate_pct || 0,
          totalPips: stats?.total_pips || 0,
        },
        myFollowStatus: myFollowMap.get(String(provider.id)) || null,
      };
    });

    let myChallenge: any = null;
    let totalProviderRevenueCredits = 0;
    let lastProviderRevenueAt: string | null = null;
    if (myProviderRes.data?.id) {
      const challengeRes = await supabase
        .from('provider_challenges')
        .select('id,status,target_trades,min_win_rate_pct,total_trades,wins,losses,breakeven_count,win_rate_pct,started_at,completed_at,last_trade_at,updated_at')
        .eq('provider_id', myProviderRes.data.id)
        .maybeSingle();
      if (challengeRes.error) {
        if (challengeRes.error.code !== '42P01') throw challengeRes.error;
        myChallenge = null;
      } else {
        myChallenge = challengeRes.data || null;
      }

      const providerRevenueRes = await supabase
        .from('provider_revenue_stats')
        .select('total_provider_revenue_credits,last_provider_revenue_at')
        .eq('provider_id', myProviderRes.data.id)
        .maybeSingle();

      if (providerRevenueRes.error) {
        if (providerRevenueRes.error.code !== '42P01') throw providerRevenueRes.error;
        const fallbackRevenueRes = await supabase
          .from('wallet_ledger')
          .select('amount_credits,created_at')
          .eq('profile_id', profile.id)
          .eq('entry_type', 'PROVIDER_REVENUE')
          .order('created_at', { ascending: false })
          .limit(5000);
        if (fallbackRevenueRes.error) throw fallbackRevenueRes.error;
        const rows = fallbackRevenueRes.data || [];
        totalProviderRevenueCredits = rows.reduce((sum, row) => sum + Number(row.amount_credits || 0), 0);
        lastProviderRevenueAt = rows[0]?.created_at || null;
      } else {
        totalProviderRevenueCredits = Number(providerRevenueRes.data?.total_provider_revenue_credits || 0);
        lastProviderRevenueAt = providerRevenueRes.data?.last_provider_revenue_at || null;
      }
    }

    const myProvider = myProviderRes.data
      ? {
          id: myProviderRes.data.id,
          name: myProviderRes.data.display_name,
          slug: myProviderRes.data.slug,
          bio: myProviderRes.data.bio,
          riskLevel: myProviderRes.data.risk_level,
          status: myProviderRes.data.status,
          createdAt: myProviderRes.data.created_at,
          approvedAt: myProviderRes.data.approved_at,
          challenge: myChallenge
            ? {
                id: myChallenge.id,
                status: myChallenge.status,
                targetTrades: Number(myChallenge.target_trades || 0),
                minWinRatePct: Number(myChallenge.min_win_rate_pct || 0),
                totalTrades: Number(myChallenge.total_trades || 0),
                wins: Number(myChallenge.wins || 0),
                losses: Number(myChallenge.losses || 0),
                breakevenCount: Number(myChallenge.breakeven_count || 0),
                winRatePct: Number(myChallenge.win_rate_pct || 0),
                startedAt: myChallenge.started_at,
                completedAt: myChallenge.completed_at,
                lastTradeAt: myChallenge.last_trade_at,
                updatedAt: myChallenge.updated_at,
              }
            : null,
          earnings: {
            totalProviderRevenueCredits,
            totalProviderRevenueIdr: totalProviderRevenueCredits * pricing.creditRateIdr,
            walletBalanceCredits: Number(myWalletRes.data?.balance_credits || 0),
            walletTotalEarnedCredits: Number(myWalletRes.data?.total_earned_credits || 0),
            lastProviderRevenueAt,
          },
        }
      : null;

    return NextResponse.json({
      status: 'success',
      providers,
      myProvider,
      providerRules: {
        challengeTargetTrades: CT77_CONFIG.providerChallengeTargetTrades,
        challengeMinWinRatePct: CT77_CONFIG.providerChallengeMinWinRatePct,
        signalCostCredits: pricing.signalCostCredits,
        adminShareCredits: pricing.adminShareCredits,
        providerShareCredits: pricing.providerShareCredits,
        creditRateIdr: pricing.creditRateIdr,
      },
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to load providers.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
