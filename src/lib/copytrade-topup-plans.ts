export type CtTopupPlan = {
    id: 'CT_50' | 'CT_100' | 'CT_200';
    credits: number;
    price: number;
    priceLabel: string;
    label: string;
    badge?: string;
};

export const CT_QRIS_PLANS: CtTopupPlan[] = [
    { id: 'CT_50', credits: 50, price: 50000, priceLabel: 'Rp 50.000', label: '50 Kredit' },
    { id: 'CT_100', credits: 100, price: 90000, priceLabel: 'Rp 90.000', label: '100 Kredit', badge: 'Hemat 10%' },
    { id: 'CT_200', credits: 200, price: 160000, priceLabel: 'Rp 160.000', label: '200 Kredit', badge: 'Hemat 20%' },
];

export function getCtTopupPlan(planId: string) {
    return CT_QRIS_PLANS.find((plan) => plan.id === planId);
}
