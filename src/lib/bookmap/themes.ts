// Bookmap Theme Definitions
export type BookmapTheme = 'classic' | 'thermal' | 'grayscale' | 'ocean';

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
    // Color stops for heatmap gradient (0% to 100% intensity)
    heatmapGradient: { stop: number; color: string }[];
    // Bubble colors
    buyBubbleGradient: [string, string]; // [center, edge]
    sellBubbleGradient: [string, string];
}

export const THEMES: Record<BookmapTheme, ThemeConfig> = {
    classic: {
        name: 'Classic',
        background: '#000000',
        axisBackground: '#0A0A0A',
        textColor: '#888888',
        gridColor: 'rgba(255,255,255,0.03)',
        bidLineColor: '#00FF00',
        askLineColor: '#FF0000',
        currentPriceBackground: '#FFD700',
        currentPriceText: '#000000',
        heatmapGradient: [
            { stop: 0.0, color: 'rgb(0,0,0)' },       // Black
            { stop: 0.2, color: 'rgb(0,0,100)' },     // Dark Blue
            { stop: 0.4, color: 'rgb(0,0,255)' },     // Blue
            { stop: 0.5, color: 'rgb(255,165,0)' },   // Orange
            { stop: 0.7, color: 'rgb(255,0,0)' },     // Red
            { stop: 0.85, color: 'rgb(255,255,0)' },  // Yellow
            { stop: 1.0, color: 'rgb(255,255,255)' }, // White
        ],
        buyBubbleGradient: ['rgba(0,255,0,0.9)', 'rgba(0,150,0,0.7)'],
        sellBubbleGradient: ['rgba(255,0,0,0.9)', 'rgba(150,0,0,0.7)'],
    },
    thermal: {
        name: 'Thermal',
        background: '#111111',
        axisBackground: '#0A0E14',
        textColor: '#64748B',
        gridColor: 'rgba(255,255,255,0.05)',
        bidLineColor: '#22C55E',
        askLineColor: '#EF4444',
        currentPriceBackground: '#EAB308',
        currentPriceText: '#000000',
        heatmapGradient: [
            { stop: 0.0, color: 'rgb(0,0,0)' },       // Black
            { stop: 0.25, color: 'rgb(0,0,255)' },    // Blue
            { stop: 0.5, color: 'rgb(0,255,0)' },     // Green
            { stop: 0.75, color: 'rgb(255,255,0)' },  // Yellow
            { stop: 1.0, color: 'rgb(255,0,0)' },     // Red
        ],
        buyBubbleGradient: ['rgba(100,255,100,0.9)', 'rgba(0,150,0,0.8)'],
        sellBubbleGradient: ['rgba(255,100,100,0.9)', 'rgba(150,0,0,0.8)'],
    },
    grayscale: {
        name: 'Grayscale',
        background: '#000000',
        axisBackground: '#0A0A0A',
        textColor: '#AAAAAA',
        gridColor: 'rgba(255,255,255,0.04)',
        bidLineColor: '#CCCCCC',
        askLineColor: '#666666',
        currentPriceBackground: '#FFFFFF',
        currentPriceText: '#000000',
        heatmapGradient: [
            { stop: 0.0, color: 'rgb(0,0,0)' },       // Black
            { stop: 0.3, color: 'rgb(50,50,50)' },    // Dark Gray
            { stop: 0.6, color: 'rgb(120,120,120)' }, // Gray
            { stop: 0.8, color: 'rgb(200,200,200)' }, // Light Gray
            { stop: 1.0, color: 'rgb(255,255,255)' }, // White
        ],
        buyBubbleGradient: ['rgba(200,200,200,0.9)', 'rgba(100,100,100,0.7)'],
        sellBubbleGradient: ['rgba(100,100,100,0.9)', 'rgba(50,50,50,0.7)'],
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
        heatmapGradient: [
            { stop: 0.0, color: 'rgb(10,22,40)' },    // Navy
            { stop: 0.25, color: 'rgb(0,128,128)' },  // Teal
            { stop: 0.5, color: 'rgb(0,255,255)' },   // Cyan
            { stop: 0.75, color: 'rgb(0,255,128)' },  // Green-Cyan
            { stop: 1.0, color: 'rgb(255,255,0)' },   // Yellow
        ],
        buyBubbleGradient: ['rgba(34,211,238,0.9)', 'rgba(6,182,212,0.7)'],
        sellBubbleGradient: ['rgba(249,115,22,0.9)', 'rgba(194,65,12,0.7)'],
    },
};

// Generate 256-color lookup table from gradient stops
export function generateColorMap(gradient: { stop: number; color: string }[]): string[] {
    const colorMap: string[] = new Array(256);

    for (let i = 0; i < 256; i++) {
        const t = i / 255; // Normalized 0-1

        // Find the two stops this falls between
        let lowerStop = gradient[0];
        let upperStop = gradient[gradient.length - 1];

        for (let j = 0; j < gradient.length - 1; j++) {
            if (t >= gradient[j].stop && t <= gradient[j + 1].stop) {
                lowerStop = gradient[j];
                upperStop = gradient[j + 1];
                break;
            }
        }

        // Interpolate between the two colors
        const range = upperStop.stop - lowerStop.stop;
        const localT = range > 0 ? (t - lowerStop.stop) / range : 0;

        // Parse RGB from color strings
        const parseRGB = (color: string): [number, number, number] => {
            const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
            if (match) {
                return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
            }
            return [0, 0, 0];
        };

        const [r1, g1, b1] = parseRGB(lowerStop.color);
        const [r2, g2, b2] = parseRGB(upperStop.color);

        const r = Math.round(r1 + (r2 - r1) * localT);
        const g = Math.round(g1 + (g2 - g1) * localT);
        const b = Math.round(b1 + (b2 - b1) * localT);

        colorMap[i] = `rgb(${r},${g},${b})`;
    }

    return colorMap;
}
