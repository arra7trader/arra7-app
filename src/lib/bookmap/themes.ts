// Bookmap V6 Professional Theme Configuration

export type BookmapTheme = 'professional' | 'midnight' | 'slate' | 'charcoal';
export type VisualizationMode = 'heatmap' | 'heatmap-bubbles' | 'bubbles' | 'columns';
export type BubbleStyle = '2d' | '3d';

export interface ThemeConfig {
    name: string;
    background: string;
    chartBackground: string;
    axisBackground: string;
    textColor: string;
    textMuted: string;
    gridColor: string;
    bidLineColor: string;
    askLineColor: string;
    priceLineUp: string;
    priceLineDown: string;
    currentPriceBackground: string;
    currentPriceText: string;
    spreadColor: string;
    volumeUp: string;
    volumeDown: string;
    // Heatmap: Dark -> Blue -> Cyan -> Yellow -> Orange -> White
    heatmapColors: string[];
    buyBubble: { fill: string; stroke: string; glow: string };
    sellBubble: { fill: string; stroke: string; glow: string };
}

// Professional Bookmap color scheme based on reference
export const THEMES: Record<BookmapTheme, ThemeConfig> = {
    professional: {
        name: 'Professional',
        background: '#0A0E17',
        chartBackground: '#0A0E17',
        axisBackground: '#0D1117',
        textColor: '#8B949E',
        textMuted: '#484F58',
        gridColor: 'rgba(56,62,74,0.3)',
        bidLineColor: '#3FB950',
        askLineColor: '#F85149',
        priceLineUp: '#3FB950',
        priceLineDown: '#F85149',
        currentPriceBackground: '#58A6FF',
        currentPriceText: '#FFFFFF',
        spreadColor: '#8B949E',
        volumeUp: '#3FB950',
        volumeDown: '#F85149',
        // Authentic Bookmap gradient: Black -> Dark Blue -> Blue -> Cyan -> Yellow -> Orange -> White
        heatmapColors: [
            '#0A0E17', // 0% - Background
            '#0A1525', '#0A1C33', '#0A2341', '#0A2A4F',
            '#0A315D', '#0A386B', '#0A3F79', '#0A4687',
            '#0A4D95', // 20% - Deep blue
            '#0A5AA8', '#0A67BB', '#0A74CE', '#0A81E1',
            '#0A8EF4', // 35% - Bright blue
            '#00A0E0', '#00B2CC', '#00C4B8', '#00D6A4',
            '#20E890', // 50% - Cyan/Teal transition
            '#60F070', '#A0F850', '#C0FF30', '#E0FF10',
            '#FFFF00', // 70% - Yellow
            '#FFE000', '#FFC000', '#FFA000', '#FF8000',
            '#FF6000', // 85% - Orange
            '#FF4020', '#FF6060', '#FFA0A0', '#FFD0D0',
            '#FFFFFF', // 100% - White (max liquidity)
        ],
        buyBubble: { fill: '#3FB950', stroke: '#238636', glow: 'rgba(63,185,80,0.5)' },
        sellBubble: { fill: '#F85149', stroke: '#DA3633', glow: 'rgba(248,81,73,0.5)' },
    },
    midnight: {
        name: 'Midnight Blue',
        background: '#0A1929',
        chartBackground: '#0A1929',
        axisBackground: '#0F2137',
        textColor: '#B2BAC2',
        textMuted: '#6B7280',
        gridColor: 'rgba(30,58,95,0.4)',
        bidLineColor: '#22D3EE',
        askLineColor: '#FB7185',
        priceLineUp: '#22D3EE',
        priceLineDown: '#FB7185',
        currentPriceBackground: '#38BDF8',
        currentPriceText: '#0A1929',
        spreadColor: '#7DD3FC',
        volumeUp: '#22D3EE',
        volumeDown: '#FB7185',
        heatmapColors: [
            '#0A1929', '#0B1E33', '#0C233D', '#0D2847', '#0E2D51',
            '#0F325B', '#103765', '#113C6F', '#124179', '#134683',
            '#1E5A8F', '#296E9B', '#3482A7', '#3F96B3', '#4AAABF',
            '#55BECB', '#60D2D7', '#6BE6E3', '#76FAEF', '#81FFFB',
            '#90FFCC', '#A0FF99', '#B0FF66', '#C0FF33', '#D0FF00',
            '#E0EE00', '#F0DD00', '#FFCC00', '#FFBB00', '#FFAA00',
            '#FF9900', '#FF8800', '#FF7700', '#FF6600', '#FFFFFF',
        ],
        buyBubble: { fill: '#22D3EE', stroke: '#0891B2', glow: 'rgba(34,211,238,0.5)' },
        sellBubble: { fill: '#FB7185', stroke: '#E11D48', glow: 'rgba(251,113,133,0.5)' },
    },
    slate: {
        name: 'Slate Gray',
        background: '#1E1E2E',
        chartBackground: '#1E1E2E',
        axisBackground: '#27273A',
        textColor: '#CDD6F4',
        textMuted: '#9399B2',
        gridColor: 'rgba(69,71,90,0.4)',
        bidLineColor: '#A6E3A1',
        askLineColor: '#F38BA8',
        priceLineUp: '#A6E3A1',
        priceLineDown: '#F38BA8',
        currentPriceBackground: '#89B4FA',
        currentPriceText: '#1E1E2E',
        spreadColor: '#BAC2DE',
        volumeUp: '#A6E3A1',
        volumeDown: '#F38BA8',
        heatmapColors: [
            '#1E1E2E', '#222236', '#26263E', '#2A2A46', '#2E2E4E',
            '#323256', '#36365E', '#3A3A66', '#3E3E6E', '#424276',
            '#5050A0', '#6060C0', '#7070E0', '#8080FF', '#9090FF',
            '#A0A0FF', '#B0B0FF', '#C0C0FF', '#D0D0FF', '#E0E0FF',
            '#89DCEB', '#94E2D5', '#A6E3A1', '#F9E2AF', '#FAB387',
            '#F38BA8', '#EBA0AC', '#F5C2E7', '#CBA6F7', '#B4BEFE',
            '#FFFFFF',
        ],
        buyBubble: { fill: '#A6E3A1', stroke: '#40A02B', glow: 'rgba(166,227,161,0.5)' },
        sellBubble: { fill: '#F38BA8', stroke: '#D20F39', glow: 'rgba(243,139,168,0.5)' },
    },
    charcoal: {
        name: 'Charcoal',
        background: '#18181B',
        chartBackground: '#18181B',
        axisBackground: '#27272A',
        textColor: '#E4E4E7',
        textMuted: '#A1A1AA',
        gridColor: 'rgba(63,63,70,0.4)',
        bidLineColor: '#4ADE80',
        askLineColor: '#F87171',
        priceLineUp: '#4ADE80',
        priceLineDown: '#F87171',
        currentPriceBackground: '#FBBF24',
        currentPriceText: '#18181B',
        spreadColor: '#D4D4D8',
        volumeUp: '#4ADE80',
        volumeDown: '#F87171',
        heatmapColors: [
            '#18181B', '#1C1C1F', '#202023', '#242427', '#28282B',
            '#2C2C2F', '#303033', '#343437', '#38383B', '#3C3C3F',
            '#454560', '#505080', '#6060A0', '#7070C0', '#8080E0',
            '#9090F0', '#A0A0FF', '#B0B0FF', '#C0C0FF', '#D0D0FF',
            '#E0E0FF', '#F0F0FF', '#FFFFFF', '#FFFFD0', '#FFFFA0',
            '#FFFF70', '#FFFF40', '#FFFF10', '#FFE000', '#FFC000',
            '#FFFFFF',
        ],
        buyBubble: { fill: '#4ADE80', stroke: '#22C55E', glow: 'rgba(74,222,128,0.5)' },
        sellBubble: { fill: '#F87171', stroke: '#EF4444', glow: 'rgba(248,113,113,0.5)' },
    },
};

export const VISUALIZATION_MODES: Record<VisualizationMode, { name: string; description: string }> = {
    'heatmap': { name: 'Heatmap', description: 'Liquidity heatmap only' },
    'heatmap-bubbles': { name: 'Heatmap + Bubbles', description: 'Heatmap with trade bubbles' },
    'bubbles': { name: 'Bubbles Only', description: 'Trade execution bubbles' },
    'columns': { name: 'Column View', description: 'DOM-style bars' },
};

// Pre-generate 256-color lookup for fast rendering
export function generateColorLookup(theme: ThemeConfig): Uint32Array {
    const colors = theme.heatmapColors;
    const lookup = new Uint32Array(256);

    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        const scaledIndex = t * (colors.length - 1);
        const lowerIndex = Math.floor(scaledIndex);
        const upperIndex = Math.min(lowerIndex + 1, colors.length - 1);
        const localT = scaledIndex - lowerIndex;

        const lower = hexToRgb(colors[lowerIndex]);
        const upper = hexToRgb(colors[upperIndex]);

        const r = Math.round(lower.r + (upper.r - lower.r) * localT);
        const g = Math.round(lower.g + (upper.g - lower.g) * localT);
        const b = Math.round(lower.b + (upper.b - lower.b) * localT);

        // Pack as ABGR (for ImageData)
        lookup[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }

    return lookup;
}

// Generate CSS color string lookup
export function generateColorStringLookup(theme: ThemeConfig): string[] {
    const colors = theme.heatmapColors;
    const lookup: string[] = new Array(256);

    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        const scaledIndex = t * (colors.length - 1);
        const lowerIndex = Math.floor(scaledIndex);
        const upperIndex = Math.min(lowerIndex + 1, colors.length - 1);
        const localT = scaledIndex - lowerIndex;

        const lower = hexToRgb(colors[lowerIndex]);
        const upper = hexToRgb(colors[upperIndex]);

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
