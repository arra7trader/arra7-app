// Bookmap V4 Theme and Visualization Configuration

export type BookmapTheme = 'bookmap' | 'thermal' | 'grayscale' | 'ocean';
export type VisualizationMode = 'heatmap' | 'heatmap-bubbles' | 'bubbles' | 'columns';
export type BubbleStyle = '2d' | '3d';

export interface ThemeConfig {
    name: string;
    background: string;
    axisBackground: string;
    textColor: string;
    gridColor: string;
    bidLineColor: string;
    askLineColor: string;
    currentPriceBackground: string;
    currentPriceText: string;
    // Color gradient for heatmap (from low to high liquidity)
    heatmapColors: string[];
    // Bubble colors
    buyBubble: { fill: string; stroke: string; glow: string };
    sellBubble: { fill: string; stroke: string; glow: string };
}

export const THEMES: Record<BookmapTheme, ThemeConfig> = {
    bookmap: {
        name: 'Bookmap Classic',
        background: '#000000',
        axisBackground: '#0A0A0A',
        textColor: '#888888',
        gridColor: 'rgba(50,50,80,0.15)',
        bidLineColor: '#00FF00',
        askLineColor: '#FF0000',
        currentPriceBackground: '#FFD700',
        currentPriceText: '#000000',
        // Authentic Bookmap gradient: Black -> Dark Blue -> Blue -> Orange -> Red -> Yellow -> White
        heatmapColors: [
            '#000000', // 0% - Black (no liquidity)
            '#000020', // 5%
            '#000040', // 10%
            '#000080', // 15% - Dark Blue
            '#0000C0', // 20%
            '#0000FF', // 30% - Blue
            '#0040FF', // 35%
            '#0080FF', // 40%
            '#00C0FF', // 45%
            '#FFA000', // 50% - Orange
            '#FF8000', // 55%
            '#FF6000', // 60%
            '#FF4000', // 65%
            '#FF0000', // 70% - Red
            '#FF4040', // 75%
            '#FF8080', // 80%
            '#FFFF00', // 85% - Yellow
            '#FFFF80', // 90%
            '#FFFFC0', // 95%
            '#FFFFFF', // 100% - White (max liquidity)
        ],
        buyBubble: { fill: '#00FF00', stroke: '#00AA00', glow: 'rgba(0,255,0,0.3)' },
        sellBubble: { fill: '#FF0000', stroke: '#AA0000', glow: 'rgba(255,0,0,0.3)' },
    },
    thermal: {
        name: 'Thermal',
        background: '#0A0A14',
        axisBackground: '#080810',
        textColor: '#64748B',
        gridColor: 'rgba(100,116,139,0.08)',
        bidLineColor: '#22C55E',
        askLineColor: '#EF4444',
        currentPriceBackground: '#EAB308',
        currentPriceText: '#000000',
        heatmapColors: [
            '#000000', '#0D001A', '#1A0033', '#26004D', '#330066',
            '#000080', '#0000CC', '#0066FF', '#00CCFF', '#00FFCC',
            '#00FF66', '#33FF00', '#99FF00', '#CCFF00', '#FFFF00',
            '#FFCC00', '#FF9900', '#FF6600', '#FF3300', '#FF0000',
        ],
        buyBubble: { fill: '#22C55E', stroke: '#16A34A', glow: 'rgba(34,197,94,0.3)' },
        sellBubble: { fill: '#EF4444', stroke: '#DC2626', glow: 'rgba(239,68,68,0.3)' },
    },
    grayscale: {
        name: 'Grayscale',
        background: '#000000',
        axisBackground: '#0A0A0A',
        textColor: '#AAAAAA',
        gridColor: 'rgba(255,255,255,0.05)',
        bidLineColor: '#CCCCCC',
        askLineColor: '#666666',
        currentPriceBackground: '#FFFFFF',
        currentPriceText: '#000000',
        heatmapColors: [
            '#000000', '#0D0D0D', '#1A1A1A', '#262626', '#333333',
            '#404040', '#4D4D4D', '#595959', '#666666', '#737373',
            '#808080', '#8C8C8C', '#999999', '#A6A6A6', '#B3B3B3',
            '#C0C0C0', '#CCCCCC', '#D9D9D9', '#E6E6E6', '#FFFFFF',
        ],
        buyBubble: { fill: '#E0E0E0', stroke: '#AAAAAA', glow: 'rgba(255,255,255,0.2)' },
        sellBubble: { fill: '#606060', stroke: '#404040', glow: 'rgba(100,100,100,0.2)' },
    },
    ocean: {
        name: 'Ocean',
        background: '#0A1628',
        axisBackground: '#061020',
        textColor: '#7DD3FC',
        gridColor: 'rgba(125,211,252,0.06)',
        bidLineColor: '#22D3EE',
        askLineColor: '#F97316',
        currentPriceBackground: '#38BDF8',
        currentPriceText: '#0A1628',
        heatmapColors: [
            '#0A1628', '#0C1A30', '#0E1E38', '#102240', '#122648',
            '#0D4F6F', '#087990', '#06A4B0', '#04CFD0', '#02FAF0',
            '#00FFD0', '#00FFB0', '#00FF90', '#20FF70', '#40FF50',
            '#80FF40', '#C0FF30', '#E0FF20', '#FFFF10', '#FFFF80',
        ],
        buyBubble: { fill: '#22D3EE', stroke: '#06B6D4', glow: 'rgba(34,211,238,0.3)' },
        sellBubble: { fill: '#F97316', stroke: '#EA580C', glow: 'rgba(249,115,22,0.3)' },
    },
};

export const VISUALIZATION_MODES: Record<VisualizationMode, { name: string; description: string }> = {
    'heatmap': { name: 'Heatmap', description: 'Liquidity heatmap only' },
    'heatmap-bubbles': { name: 'Heatmap + Bubbles', description: 'Heatmap with trade bubbles' },
    'bubbles': { name: 'Bubbles Only', description: 'Trade execution bubbles' },
    'columns': { name: 'Column View', description: 'DOM-style bars' },
};

// Generate interpolated color from theme gradient
export function getHeatmapColor(theme: ThemeConfig, intensity: number): string {
    const colors = theme.heatmapColors;
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    const index = clampedIntensity * (colors.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.min(lowerIndex + 1, colors.length - 1);
    const t = index - lowerIndex;

    // Interpolate between two colors
    const lower = hexToRgb(colors[lowerIndex]);
    const upper = hexToRgb(colors[upperIndex]);

    const r = Math.round(lower.r + (upper.r - lower.r) * t);
    const g = Math.round(lower.g + (upper.g - lower.g) * t);
    const b = Math.round(lower.b + (upper.b - lower.b) * t);

    return `rgb(${r},${g},${b})`;
}

// Pre-generate 512 colors for faster lookup
export function generateColorLookup(theme: ThemeConfig): string[] {
    const lookup: string[] = new Array(512);
    for (let i = 0; i < 512; i++) {
        lookup[i] = getHeatmapColor(theme, i / 511);
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
