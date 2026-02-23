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

    const [walletRes, terminalRes, followRes, openPosRes, recentPosRes, ledgerRes] = await Promise.all([
      supabase.from('wallets').select('balance_credits,total_topup_credits,total_spent_credits,total_earned_credits').eq('profile_id', profile.id).maybeSingle(),
      supabase.from('bridge_terminals').select('id,terminal_label,broker_name,server_name,status,last_heartbeat_at,last_error').eq('profile_id', profile.id).order('updated_at', { ascending: false }).limit(10),
      supabase.from('follow_relations').select('id,provider_id,status,one_trade_at_a_time,fixed_lot,updated_at').eq('follower_profile_id', profile.id).order('updated_at', { ascending: false }),
      supabase.from('positions').select('id,symbol,side,volume_lots,entry_price,stop_loss,take_profit,opened_at,status').eq('follower_profile_id', profile.id).eq('status', 'OPEN').order('opened_at', { ascending: false }).limit(20),
      supabase.from('positions').select('id,symbol,side,volume_lots,entry_price,close_price,pips_result,pnl_value,opened_at,closed_at,status').eq('follower_profile_id', profile.id).neq('status', 'OPEN').order('closed_at', { ascending: false }).limit(20),
      supabase.from('wallet_ledger').select('id,direction,amount_credits,entry_type,description,created_at').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(30),
    ]);

    if (walletRes.error) throw walletRes.error;
    if (terminalRes.error) throw terminalRes.error;
    if (followRes.error) throw followRes.error;
    if (openPosRes.error) throw openPosRes.error;
    if (recentPosRes.error) throw recentPosRes.error;
    if (ledgerRes.error) throw ledgerRes.error;

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

    return NextResponse.json({
      status: 'success',
      summary: {
        balanceCredits: walletRes.data?.balance_credits || 0,
        openPositions: (openPosRes.data || []).length,
        activeFollows,
        onlineTerminals,
        todaySpentCredits,
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
      topupPricing: {
        creditRateIdr: CT77_CONFIG.creditRateIdr,
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

