import CopyTradeGuard from '@/components/copytrade/CopyTradeGuard';
import CopytradeModuleNav from '@/components/copytrade/CopytradeModuleNav';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <CopyTradeGuard>
            <CopytradeModuleNav />
            {children}
        </CopyTradeGuard>
    );
}
