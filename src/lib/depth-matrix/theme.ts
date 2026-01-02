// ARRA7 Depth Matrix - Theme System
// Premium Order Flow Intelligence

export const DEPTH_MATRIX_THEME = {
    // Core Colors
    background: '#06080d',
    surface: '#0d1117',
    surfaceElevated: '#161b22',
    border: '#21262d',
    borderFocus: '#388bfd',

    // Brand Colors
    primary: '#00d4ff',      // Electric Cyan
    accent: '#ff6b35',       // Warm Orange

    // Semantic Colors
    bullish: '#10b981',      // Emerald Green
    bearish: '#ef4444',      // Crimson Red
    neutral: '#6b7280',      // Gray

    // Text
    textPrimary: '#f0f6fc',
    textSecondary: '#8b949e',
    textMuted: '#484f58',

    // Heatmap Gradient (intensity 0-1)
    // Deep Blue → Cyan → Yellow → Orange → White
    heatmapColors: [
        '#0d1b2a', // 0.0 - Deep space (almost invisible)
        '#102840', // 0.1
        '#1a3a5c', // 0.2
        '#0077b6', // 0.3 - Blue
        '#00b4d8', // 0.4 - Cyan
        '#48cae4', // 0.5 - Light cyan
        '#90e0ef', // 0.6 - Pale cyan
        '#ffd60a', // 0.7 - Yellow
        '#ffbe0b', // 0.8 - Gold
        '#ff6b35', // 0.9 - Orange
        '#ffffff', // 1.0 - White (max intensity)
    ],

    // Volume Profile
    volumeBuy: '#10b981',
    volumeSell: '#ef4444',
    volumeNeutral: '#374151',

    // Price Line
    priceLineUp: '#10b981',
    priceLineDown: '#ef4444',
    priceLineCurrent: '#00d4ff',

    // Liquidity Walls
    liquidityBid: '#00d4ff',
    liquidityAsk: '#ff6b35',

    // Whale Alerts
    whaleBuy: {
        bg: 'rgba(16, 185, 129, 0.15)',
        border: '#10b981',
        glow: '#10b98150',
    },
    whaleSell: {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: '#ef4444',
        glow: '#ef444450',
    },

    // UI Components
    buttonPrimary: '#00d4ff',
    buttonSecondary: '#21262d',
    inputBg: '#0d1117',
    inputBorder: '#30363d',

    // Grid
    gridColor: '#21262d',
    gridColorMinor: '#161b22',

    // Axis
    axisBg: '#0d1117',
    axisText: '#8b949e',

    // Status
    connected: '#10b981',
    connecting: '#fbbf24',
    error: '#ef4444',
} as const;

// Generate heatmap color lookup for performance
export function generateHeatmapLookup(): string[] {
    const colors = DEPTH_MATRIX_THEME.heatmapColors;
    const lookup: string[] = new Array(256);

    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        const segment = t * (colors.length - 1);
        const index = Math.floor(segment);
        const fraction = segment - index;

        if (index >= colors.length - 1) {
            lookup[i] = colors[colors.length - 1];
        } else {
            // Interpolate between colors
            const c1 = hexToRgb(colors[index]);
            const c2 = hexToRgb(colors[index + 1]);

            const r = Math.round(c1.r + (c2.r - c1.r) * fraction);
            const g = Math.round(c1.g + (c2.g - c1.g) * fraction);
            const b = Math.round(c1.b + (c2.b - c1.b) * fraction);

            lookup[i] = `rgb(${r},${g},${b})`;
        }
    }

    return lookup;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : { r: 0, g: 0, b: 0 };
}

// Whale Alert Thresholds (in base currency, e.g., BTC)
export const WHALE_THRESHOLDS = {
    BTCUSDT: 5,      // 5 BTC
    ETHUSDT: 50,     // 50 ETH
    PAXGUSDT: 10,    // 10 oz Gold
} as const;

// Liquidity Wall Detection (minimum quantity to be considered a "wall")
export const LIQUIDITY_WALL_MULTIPLIER = 3; // 3x average = wall

export type DepthMatrixTheme = typeof DEPTH_MATRIX_THEME;
