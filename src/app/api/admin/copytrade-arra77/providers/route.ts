import { NextRequest, NextResponse } from 'next/server';
import { requireCopytrade77Admin } from '@/lib/copytrade77-admin';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    await requireCopytrade77Admin();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const { data, error } = await supabase
      .from('providers')
      .select(`
        id,
        display_name,
        slug,
        bio,
        risk_level,
        status,
        created_at,
        approved_at,
        profiles!providers_profile_id_fkey (
          id,
          email,
          display_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({
      status: 'success',
      providers: data || [],
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to fetch providers.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

export async function POST(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    const { adminProfileId } = await requireCopytrade77Admin();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');
    const body = await request.json();

    const providerId = String(body?.providerId || '').trim();
    const action = String(body?.action || '').trim().toUpperCase();

    if (!providerId || !['APPROVE', 'REJECT', 'SUSPEND'].includes(action)) {
      return NextResponse.json(
        { status: 'error', message: 'providerId/action tidak valid.' },
        { status: 400 }
      );
    }

    let statusValue: 'APPROVED' | 'REJECTED' | 'SUSPENDED' = 'REJECTED';
    if (action === 'APPROVE') statusValue = 'APPROVED';
    if (action === 'SUSPEND') statusValue = 'SUSPENDED';

    const updatePayload: Record<string, unknown> = { status: statusValue };
    if (action === 'APPROVE') {
      updatePayload.approved_by_profile_id = adminProfileId;
      updatePayload.approved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('providers')
      .update(updatePayload)
      .eq('id', providerId);

    if (error) throw error;

    return NextResponse.json({
      status: 'success',
      message: `Provider berhasil di-${action.toLowerCase()}.`,
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to process provider action.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

