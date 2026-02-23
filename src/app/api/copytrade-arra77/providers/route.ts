import { NextResponse } from 'next/server';
import { requireCopytrade77SessionProfile } from '@/lib/copytrade77-session';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';
import { getOrCreateSystemProviderId } from '@/lib/copytrade77-signal-engine';

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

    // Ensure default system provider "Arra7" is always available in marketplace.
    await getOrCreateSystemProviderId();

    const [providerRes, statsRes, followerRes, myFollowRes] = await Promise.all([
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
    ]);

    if (providerRes.error) throw providerRes.error;
    if (statsRes.error) throw statsRes.error;
    if (followerRes.error) throw followerRes.error;
    if (myFollowRes.error) throw myFollowRes.error;

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

    return NextResponse.json({
      status: 'success',
      providers,
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to load providers.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
