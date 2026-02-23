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
      .from('topup_orders')
      .select(`
        id,
        amount_idr,
        credit_amount,
        status,
        proof_image_url,
        proof_note,
        admin_note,
        created_at,
        submitted_at,
        approved_at,
        profiles!topup_orders_profile_id_fkey (
          id,
          email,
          display_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ status: 'success', orders: data || [] });
  } catch (error: any) {
    const message = error?.message || 'Failed to fetch topup orders.';
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

    const action = String(body?.action || '').trim().toUpperCase();
    const orderId = String(body?.orderId || '').trim();
    const adminNote = body?.adminNote ? String(body.adminNote).trim() : null;

    if (!orderId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { status: 'error', message: 'action/orderId tidak valid.' },
        { status: 400 }
      );
    }

    if (action === 'APPROVE') {
      const { data, error } = await supabase.rpc('approve_topup_order', {
        p_order_id: orderId,
        p_admin_profile_id: adminProfileId,
      });

      if (error) throw error;

      if (adminNote) {
        const noteRes = await supabase.from('topup_orders').update({ admin_note: adminNote }).eq('id', orderId);
        if (noteRes.error) throw noteRes.error;
      }

      return NextResponse.json({
        status: 'success',
        message: 'Topup berhasil di-approve.',
        balanceAfter: data,
      });
    }

    const { error: rejectError } = await supabase
      .from('topup_orders')
      .update({
        status: 'REJECTED',
        rejected_at: new Date().toISOString(),
        admin_note: adminNote,
      })
      .eq('id', orderId)
      .in('status', ['SUBMITTED', 'DRAFT']);

    if (rejectError) throw rejectError;

    return NextResponse.json({
      status: 'success',
      message: 'Topup berhasil ditolak.',
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to process topup order.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

