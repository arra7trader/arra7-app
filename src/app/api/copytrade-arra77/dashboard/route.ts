import { NextResponse } from 'next/server';
import { CT77_CONFIG } from '@/lib/copytrade77-config';
import { requireCopytrade77SessionProfile } from '@/lib/copytrade77-session';
import { isCopytrade77Configured, getCopytrade77AdminClient } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

function startOfTodayIso(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}

export async function GET() {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Copytrade ARRA77 belum dikonfigurasi di server.',
      },
      { status: 503 }
    );
  }

  try {
    const { profile } = await requireCopytrade77SessionProfile();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const [walletRes, terminalRes, followRes, openPosRes, recentPosRes, ledgerRes, myProviderRes] = await Promise.all([
      supabase.from('wallets').select('balance_credits,total_topup_credits,total_spent_credits,total_earned_credits').eq('profile_id', profile.id).maybeSingle(),
      supabase.from('bridge_terminals').select('id,terminal_label,broker_name,server_name,status,last_heartbeat_at,last_error').eq('profile_id', profile.id).order('updated_at', { ascending: false }).limit(10),
      supabase.from('follow_relations').select('id,provider_id,status,one_trade_at_a_time,fixed_lot,updated_at').eq('follower_profile_id', profile.id).order('updated_at', { ascending: false }),
      supabase.from('positions').select('id,symbol,side,volume_lots,entry_price,stop_loss,take_profit,opened_at,status').eq('follower_profile_id', profile.id).eq('status', 'OPEN').order('opened_at', { ascending: false }).limit(20),
      supabase.from('positions').select('id,symbol,side,volume_lots,entry_price,close_price,pips_result,pnl_value,opened_at,closed_at,status').eq('follower_profile_id', profile.id).neq('status', 'OPEN').order('closed_at', { ascending: false }).limit(20),
      supabase.from('wallet_ledger').select('id,direction,amount_credits,entry_type,description,created_at').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('providers').select('id,display_name,slug,status').eq('profile_id', profile.id).maybeSingle(),
    ]);

    if (walletRes.error) throw walletRes.error;
    if (terminalRes.error) throw terminalRes.error;
    if (followRes.error) throw followRes.error;
    if (openPosRes.error) throw openPosRes.error;
    if (recentPosRes.error) throw recentPosRes.error;
    if (ledgerRes.error) throw ledgerRes.error;
    if (myProviderRes.error) throw myProviderRes.error;

    const follows = followRes.data || [];
    const providerIds = follows.map((f) => f.provider_id).filter(Boolean);

    let providersMap = new Map<string, { id: string; display_name: string; slug: string; risk_level: string; status: string }>();
    if (providerIds.length > 0) {
      const providerRes = await supabase
        .from('providers')
        .select('id,display_name,slug,risk_level,status')
        .in('id', providerIds);

      if (providerRes.error) throw providerRes.error;
      providersMap = new Map((providerRes.data || []).map((p) => [p.id as string, p as any]));
    }

    const followView = follows.map((follow) => {
      const provider = providersMap.get(String(follow.provider_id));
      return {
        id: follow.id,
        status: follow.status,
        oneTradeAtATime: follow.one_trade_at_a_time,
        fixedLot: follow.fixed_lot,
        provider: provider
          ? {
              id: provider.id,
              name: provider.display_name,
              slug: provider.slug,
              riskLevel: provider.risk_level,
              status: provider.status,
            }
          : null,
      };
    });

    const todayStart = startOfTodayIso();
    const todaySpentCredits = (ledgerRes.data || [])
      .filter((entry) => entry.direction === 'DEBIT' && entry.entry_type === 'SIGNAL_EXECUTION_COST' && String(entry.created_at) >= todayStart)
      .reduce((sum, item) => sum + Number(item.amount_credits || 0), 0);

    const onlineTerminals = (terminalRes.data || []).filter((t) => t.status === 'ONLINE').length;
    const activeFollows = followView.filter((f) => f.status === 'ACTIVE').length;

    let providerView: any = null;
    if (myProviderRes.data?.id) {
      const challengeRes = await supabase
        .from('provider_challenges')
        .select('status,target_trades,min_win_rate_pct,total_trades,wins,losses,breakeven_count,win_rate_pct,started_at,completed_at,last_trade_at')
        .eq('provider_id', myProviderRes.data.id)
        .maybeSingle();
      if (challengeRes.error && challengeRes.error.code !== '42P01') throw challengeRes.error;

      let totalProviderRevenueCredits = 0;
      let lastProviderRevenueAt: string | null = null;
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

      providerView = {
        id: myProviderRes.data.id,
        name: myProviderRes.data.display_name,
        slug: myProviderRes.data.slug,
        status: myProviderRes.data.status,
        challenge: challengeRes.data
          ? {
              status: challengeRes.data.status,
              targetTrades: Number(challengeRes.data.target_trades || 0),
              minWinRatePct: Number(challengeRes.data.min_win_rate_pct || 0),
              totalTrades: Number(challengeRes.data.total_trades || 0),
              wins: Number(challengeRes.data.wins || 0),
              losses: Number(challengeRes.data.losses || 0),
              breakevenCount: Number(challengeRes.data.breakeven_count || 0),
              winRatePct: Number(challengeRes.data.win_rate_pct || 0),
              startedAt: challengeRes.data.started_at,
              completedAt: challengeRes.data.completed_at,
              lastTradeAt: challengeRes.data.last_trade_at,
            }
          : null,
        earnings: {
          totalProviderRevenueCredits,
          totalProviderRevenueIdr: totalProviderRevenueCredits * CT77_CONFIG.creditRateIdr,
          lastProviderRevenueAt,
        },
      };
    }

    return NextResponse.json({
      status: 'success',
      summary: {
        balanceCredits: walletRes.data?.balance_credits || 0,
        openPositions: (openPosRes.data || []).length,
        activeFollows,
        onlineTerminals,
        todaySpentCredits,
        providerRevenueCredits: providerView?.earnings?.totalProviderRevenueCredits || 0,
      },
      wallet: walletRes.data || {
        balance_credits: 0,
        total_topup_credits: 0,
        total_spent_credits: 0,
        total_earned_credits: 0,
      },
      follows: followView,
      terminals: terminalRes.data || [],
      openPositions: openPosRes.data || [],
      recentTrades: recentPosRes.data || [],
      ledger: ledgerRes.data || [],
      provider: providerView,
      topupPricing: {
        creditRateIdr: CT77_CONFIG.creditRateIdr,
        minTopupIdr: Math.max(CT77_CONFIG.minTopupIdr, CT77_CONFIG.creditRateIdr),
        signalCostCredits: CT77_CONFIG.signalCostCredits,
      },
      qris: {
        merchantName: CT77_CONFIG.qrisMerchantName,
        nmid: CT77_CONFIG.qrisNmid,
        imageUrl: CT77_CONFIG.qrisImageUrl,
      },
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to load dashboard copytrade.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
