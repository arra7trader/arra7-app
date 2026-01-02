// Bookmap V5 Theme Configuration - Softer Colors

export type BookmapTheme = 'professional' | 'midnight' | 'slate' | 'charcoal';
export type VisualizationMode = 'heatmap' | 'heatmap-bubbles' | 'bubbles' | 'columns';
export type BubbleStyle = '2d' | '3d';

export interface ThemeConfig {
    name: string;
    background: string;
    chartBackground: string; // Slightly different for depth
    axisBackground: string;
    textColor: string;
    textMuted: string;
    gridColor: string;
    bidLineColor: string;
    askLineColor: string;
    currentPriceBackground: string;
    currentPriceText: string;
    spreadColor: string;
    // Heatmap gradient (softer, blends with background)
    heatmapColors: string[];
    // Bubble styling
    buyBubble: { fill: string; stroke: string; glow: string };
    sellBubble: { fill: string; stroke: string; glow: string };
}

export const THEMES: Record<BookmapTheme, ThemeConfig> = {
    professional: {
        name: 'Professional',
        background: '#0D1117',      // Dark but not pure black
        chartBackground: '#0D1117',
        axisBackground: '#161B22',
        textColor: '#C9D1D9',
        textMuted: '#8B949E',
        gridColor: 'rgba(48,54,61,0.6)',
        bidLineColor: '#3FB950',
        askLineColor: '#F85149',
        currentPriceBackground: '#58A6FF',
        currentPriceText: '#FFFFFF',
        spreadColor: '#8B949E',
        // Softer gradient that blends with dark navy background
        heatmapColors: [
            '#0D1117', // Background (invisible)
            '#0E1824', '#0F1F31', '#10263E', '#112D4B',
            '#123458', '#133B65', '#144272', '#15497F',
            '#16508C', // Blue range
            '#1A6B9A', '#1E86A8', '#22A1B6', '#26BCC4',
            '#2AD7D2', // Cyan transition
            '#4ADE80', // Green
            '#84CC16', // Yellow-green
            '#EAB308', // Yellow
            '#F97316', // Orange
            '#EF4444', // Red
            '#FBBF24', // Bright yellow
            '#FFFFFF', // White (max)
        ],
        buyBubble: { fill: '#3FB950', stroke: '#238636', glow: 'rgba(63,185,80,0.4)' },
        sellBubble: { fill: '#F85149', stroke: '#DA3633', glow: 'rgba(248,81,73,0.4)' },
    },
    midnight: {
        name: 'Midnight Blue',
        background: '#0A1929',      // Deep navy blue
        chartBackground: '#0A1929',
        axisBackground: '#0F2137',
        textColor: '#B2BAC2',
        textMuted: '#6B7280',
        gridColor: 'rgba(30,58,95,0.5)',
        bidLineColor: '#22D3EE',
        askLineColor: '#FB7185',
        currentPriceBackground: '#38BDF8',
        currentPriceText: '#0A1929',
        spreadColor: '#7DD3FC',
        heatmapColors: [
            '#0A1929', // Background
            '#0B1E33', '#0C233D', '#0D2847', '#0E2D51',
            '#0F325B', '#103765', '#113C6F', '#124179',
            '#134683', // Deep blue
            '#1E5A8F', '#296E9B', '#3482A7', '#3F96B3',
            '#4AAABF', // Transition
            '#55BECB', '#60D2D7', '#6BE6E3', '#76FAEF',
            '#81FFFB', // Bright cyan
            '#BFFF00', // Yellow-green highlight
            '#FFFF00', // Yellow
            '#FF8C00', // Orange
            '#FF4500', // Red-orange
        ],
        buyBubble: { fill: '#22D3EE', stroke: '#0891B2', glow: 'rgba(34,211,238,0.4)' },
        sellBubble: { fill: '#FB7185', stroke: '#E11D48', glow: 'rgba(251,113,133,0.4)' },
    },
    slate: {
        name: 'Slate Gray',
        background: '#1E1E2E',      // Soft dark purple-gray
        chartBackground: '#1E1E2E',
        axisBackground: '#27273A',
        textColor: '#CDD6F4',
        textMuted: '#9399B2',
        gridColor: 'rgba(69,71,90,0.5)',
        bidLineColor: '#A6E3A1',
        askLineColor: '#F38BA8',
        currentPriceBackground: '#89B4FA',
        currentPriceText: '#1E1E2E',
        spreadColor: '#BAC2DE',
        heatmapColors: [
            '#1E1E2E', // Background
            '#222236', '#26263E', '#2A2A46', '#2E2E4E',
            '#323256', '#36365E', '#3A3A66', '#3E3E6E',
            '#424276', // Purple-gray
            '#5B5B9D', '#7474C4', '#8D8DEB', '#A6A6FF',
            '#B8C0FF', // Lavender
            '#89DCEB', // Cyan
            '#94E2D5', // Teal
            '#A6E3A1', // Green
            '#F9E2AF', // Yellow
            '#FAB387', // Peach
            '#F38BA8', // Pink-red
            '#FFFFFF', // White
        ],
        buyBubble: { fill: '#A6E3A1', stroke: '#40A02B', glow: 'rgba(166,227,161,0.4)' },
        sellBubble: { fill: '#F38BA8', stroke: '#D20F39', glow: 'rgba(243,139,168,0.4)' },
    },
    charcoal: {
        name: 'Charcoal',
        background: '#18181B',      // Warm dark gray
        chartBackground: '#18181B',
        axisBackground: '#27272A',
        textColor: '#E4E4E7',
        textMuted: '#A1A1AA',
        gridColor: 'rgba(63,63,70,0.5)',
        bidLineColor: '#4ADE80',
        askLineColor: '#F87171',
        currentPriceBackground: '#FBBF24',
        currentPriceText: '#18181B',
        spreadColor: '#D4D4D8',
        heatmapColors: [
            '#18181B', // Background
            '#1C1C1F', '#202023', '#242427', '#28282B',
            '#2C2C2F', '#303033', '#343437', '#38383B',
            '#3C3C3F', // Dark gray
            '#4A4A52', '#585865', '#666678', '#74748B',
            '#82829E', // Mid gray-purple
            '#6366F1', // Indigo
            '#8B5CF6', // Violet
            '#A855F7', // Purple
            '#D946EF', // Fuchsia
            '#EC4899', // Pink
            '#F43F5E', // Rose
            '#FFFFFF', // White
        ],
        buyBubble: { fill: '#4ADE80', stroke: '#22C55E', glow: 'rgba(74,222,128,0.4)' },
        sellBubble: { fill: '#F87171', stroke: '#EF4444', glow: 'rgba(248,113,113,0.4)' },
    },
};

export const VISUALIZATION_MODES: Record<VisualizationMode, { name: string; description: string }> = {
    'heatmap': { name: 'Heatmap', description: 'Liquidity heatmap only' },
    'heatmap-bubbles': { name: 'Heatmap + Bubbles', description: 'Heatmap with trade bubbles' },
    'bubbles': { name: 'Bubbles Only', description: 'Trade execution bubbles' },
    'columns': { name: 'Column View', description: 'DOM-style bars' },
};

// Generate color lookup with smooth interpolation
export function generateColorLookup(theme: ThemeConfig): string[] {
    const colors = theme.heatmapColors;
    const lookup: string[] = new Array(512);

    for (let i = 0; i < 512; i++) {
        const t = i / 511;
        const scaledIndex = t * (colors.length - 1);
        const lowerIndex = Math.floor(scaledIndex);
        const upperIndex = Math.min(lowerIndex + 1, colors.length - 1);
        const localT = scaledIndex - lowerIndex;

        const lower = hexToRgb(colors[lowerIndex]);
        const upper = hexToRgb(colors[upperIndex]);

        // Smooth interpolation
        const r = Math.round(lower.r + (upper.r - lower.r) * localT);
        const g = Math.round(lower.g + (upper.g - lower.g) * localT);
        const b = Math.round(lower.b + (upper.b - lower.b) * localT);

        lookup[i] = `rgb(${r},${g},${b})`;
    }

    return lookup;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : { r: 0, g: 0, b: 0 };
}
