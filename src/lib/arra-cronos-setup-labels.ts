import type { CronosSetupStatus } from '@/lib/arra-cronos-setups';

export function formatCronosSetupStatus(status: CronosSetupStatus): string {
    switch (status) {
        case 'TP1_HIT':
            return 'HIT TP 1';
        case 'TP2_HIT':
            return 'HIT TP 2';
        case 'SL_HIT':
            return 'HIT SL';
        case 'SL_AFTER_TP1':
            return 'HIT SL · SETELAH TP 1';
        case 'AMBIGUOUS':
            return 'AMBIGU · TP/SL BERSAMAAN';
        case 'AMBIGUOUS_AFTER_TP1':
            return 'AMBIGU · SETELAH TP 1';
        case 'EXPIRED':
            return 'EXPIRED';
        case 'EXPIRED_AFTER_TP1':
            return 'EXPIRED · SETELAH TP 1';
        case 'OPEN':
            return 'OPEN';
    }
}
