
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMarketingCampaigns, saveMarketingCampaign, deleteMarketingCampaign, MarketingCampaign } from '@/lib/turso';
import { isAdmin } from '@/app/api/admin/users/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !isAdmin(session.user.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const campaigns = await getMarketingCampaigns();
    return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !isAdmin(session.user.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { action, campaign, id } = body;

        if (action === 'save') {
            if (!campaign.name || !campaign.type || !campaign.message_template) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }
            const success = await saveMarketingCampaign(campaign);
            if (success) {
                return NextResponse.json({ status: 'success' });
            } else {
                return NextResponse.json({ error: 'Failed to save campaign' }, { status: 500 });
            }

        } else if (action === 'delete') {
            if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
            const success = await deleteMarketingCampaign(id);
            if (success) {
                return NextResponse.json({ status: 'success' });
            } else {
                return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (e: any) {
        console.error('Marketing API error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
