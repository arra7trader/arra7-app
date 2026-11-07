import { isAdminUser } from '@/lib/admin-access';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkBookmapAccess } from '@/lib/turso';
import DomArraClient from './DomArraClient';

export const metadata = {
    title: 'Bookmap PICA - Whale Order Flow Analysis',
    description: 'Real-time DOM Heatmap and AI Market Analysis',
};

export default async function DomArraPage() {
    const session = await getServerSession(authOptions);

    let accessResult: any = { allowed: true, reason: 'UNLIMITED' };
    if (session?.user) {
        if (isAdminUser(session.user)) {
            accessResult = { allowed: true, reason: 'GRANTED', membership: 'ADMIN' };
        } else if (session.user.id) {
            try {
                accessResult = await checkBookmapAccess(session.user.id);
            } catch {
                accessResult = { allowed: true, reason: 'UNLIMITED' };
            }
        }
    }

    return <DomArraClient accessResult={accessResult} />;
}
