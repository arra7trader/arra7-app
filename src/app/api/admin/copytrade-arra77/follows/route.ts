import { NextRequest, NextResponse } from 'next/server';
import { requireCopytrade77Admin } from '@/lib/copytrade77-admin';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    await requireCopytrade77Admin();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');
    const scope = (request.nextUrl.searchParams.get('scope') || 'active').toLowerCase();

    let query = supabase
      .from('follow_relations')
      .select(`
        id,
        status,
        risk_mode,
        fixed_lot,
        lot_multiplier,
        risk_percent,
        max_concurrent_positions,
        one_trade_at_a_time,
        created_at,
        updated_at,
        follower:profiles!follow_relations_follower_profile_id_fkey (
          id,
          email,
          display_name
        ),
        provider:providers!follow_relations_provider_id_fkey (
          id,
          display_name,
          slug,
          status,
          owner:profiles!providers_profile_id_fkey (
            id,
            email,
            display_name
          )
        )
      `)
      .order('updated_at', { ascending: false });

    if (scope !== 'all') {
      query = query.eq('status', 'ACTIVE');
    }

    const { data, error } = await query.limit(200);
    if (error) throw error;

    const follows = (data || []).map((row: any) => ({
      id: row.id,
      status: row.status,
      riskMode: row.risk_mode,
      fixedLot: row.fixed_lot,
      lotMultiplier: row.lot_multiplier,
      riskPercent: row.risk_percent,
      maxConcurrentPositions: row.max_concurrent_positions,
      oneTradeAtATime: row.one_trade_at_a_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      follower: {
        id: row?.follower?.id || null,
        email: row?.follower?.email || null,
        name: row?.follower?.display_name || null,
      },
      provider: {
        id: row?.provider?.id || null,
        name: row?.provider?.display_name || null,
        slug: row?.provider?.slug || null,
        status: row?.provider?.status || null,
        ownerEmail: row?.provider?.owner?.email || null,
        ownerName: row?.provider?.owner?.display_name || null,
      },
    }));

    return NextResponse.json({
      status: 'success',
      follows,
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to fetch follows.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

