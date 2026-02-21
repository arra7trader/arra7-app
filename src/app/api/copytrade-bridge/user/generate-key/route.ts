import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { copytradeSupabase } from '@/lib/supabase-copytrade';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = session.user.email;

        // Generate a unique license key
        const rand = () => Math.random().toString(36).substring(2, 7).toUpperCase();
        const newKey = `ARRA-${rand()}-${rand()}`;

        // Upsert: update if exists, insert if not
        let { data: ctUser } = await copytradeSupabase
            .from('ct_users')
            .select('id')
            .eq('email', email)
            .single();

        if (ctUser) {
            // Update existing
            await copytradeSupabase
                .from('ct_users')
                .update({ license_key: newKey })
                .eq('email', email);
        } else {
            // Create new ct_user
            await copytradeSupabase
                .from('ct_users')
                .insert({ email, name: session.user.name || '', license_key: newKey });
        }

        return NextResponse.json({ success: true, licenseKey: newKey });
    } catch (error: any) {
        console.error('[CT GenerateKey] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
