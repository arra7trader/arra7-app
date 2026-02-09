import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkBookmapAccess } from '@/lib/turso';
import DomArraClient from './DomArraClient';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Bookmap ARRA7 (BETA) - Whale Order Flow Analysis',
    description: 'Real-time DOM Heatmap and AI Market Analysis',
};

export default async function DomArraPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/dom-arra');
    }

    const accessResult = await checkBookmapAccess(session.user.id);

    return <DomArraClient accessResult={accessResult} />;
}
