// Helper to add proximity and status indicators
export const getZoneStatus = (levelPrice: number, currentPrice: number | null, trend: 'UP' | 'DOWN') => {
    if (!currentPrice) return { status: '⚪ PENDING', color: 'text-gray-400', distance: null, isNear: false };

    const distance = Math.abs(currentPrice - levelPrice);
    const isAbove = currentPrice > levelPrice;
    const percentDiff = distance / currentPrice;
    const isNear = percentDiff < 0.002; // Within 0.2%

    let status = '⚪ PENDING';
    let color = 'text-gray-400';

    if (percentDiff < 0.001) {
        // Within 0.1% - ACTIVE
        status = '🟢 ACTIVE';
        color = 'text-green-400';
    } else if (
        (trend === 'UP' && currentPrice > levelPrice) ||
        (trend === 'DOWN' && currentPrice < levelPrice)
    ) {
        // Price passed zone based on trend
        status = '🔴 BREACHED';
        color = 'text-red-400';
    }

    return { status, color, distance, isAbove, isNear };
};
