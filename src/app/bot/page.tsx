
import AutoTradingDashboard from '@/components/trading/AutoTradingDashboard';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TradingBotPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/login');
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <AutoTradingDashboard />
        </div>
    );
}
