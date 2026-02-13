import CopyTradeGuard from '@/components/copytrade/CopyTradeGuard';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <CopyTradeGuard>
            {children}
        </CopyTradeGuard>
    );
}
