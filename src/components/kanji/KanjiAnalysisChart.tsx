'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { createChart, ColorType, ISeriesApi, IChartApi, CandlestickSeries } from 'lightweight-charts';

// Zone Configuration - Pairs of levels that form visual zones
const ZONE_CONFIG = [
    { startLevel: 0.559, endLevel: 0.619, color: 'rgba(38, 166, 154, 0.15)', borderColor: '#26a69a', name: 'Entry Zone' },
    { startLevel: 0.786, endLevel: 0.882, color: 'rgba(251, 192, 45, 0.15)', borderColor: '#fbc02d', name: 'Reversal Zone' },
    { startLevel: 1.124, endLevel: 1.272, color: 'rgba(255, 152, 0, 0.15)', borderColor: '#ff9800', name: 'Breakout Zone' },
    { startLevel: 1.618, endLevel: 2.0, color: 'rgba(41, 98, 255, 0.1)', borderColor: '#2962ff', name: 'Target Zone 1' },
    { startLevel: 2.0, endLevel: 2.618, color: 'rgba(171, 71, 188, 0.1)', borderColor: '#ab47bc', name: 'Target Zone 2' },
];

// Key levels to always show (simplified view)
const KEY_LEVELS = [0, 1, 0.619, 1.618];

interface KanjiChartProps {
    pair: string;
    levels: any[];
    onPriceClick?: (price: number) => void;
    showAllLevels?: boolean;
}

const KanjiAnalysisChart = forwardRef(({ pair, levels, onPriceClick, showAllLevels = false }: KanjiChartProps, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const [priceLines, setPriceLines] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Expose refresh method
    useImperativeHandle(ref, () => ({
        refresh: () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        }
    }));

    // Generate Fallback Data
    const generateFallbackData = (basePrice: number) => {
        const data = [];
        let time = Math.floor(Date.now() / 1000) - (100 * 3600);
        let value = basePrice;
        for (let i = 0; i < 200; i++) {
            const volatility = basePrice * 0.002;
            const change = (Math.random() - 0.5) * volatility;
            const open = value;
            const close = open + change;
            const high = Math.max(open, close) + Math.random() * volatility * 0.2;
            const low = Math.min(open, close) - Math.random() * volatility * 0.2;
            data.push({ time: time as any, open, high, low, close });
            value = close;
            time += 3600;
        }
        return data;
    };

    // Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#000000' },
                textColor: '#d1d4dc',
            },
            width: chartContainerRef.current.clientWidth,
            height: 600,
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        chartRef.current = chart;
        candleSeriesRef.current = series;

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0 });
        };
        window.addEventListener('resize', handleResize);

        chart.subscribeClick((param) => {
            if (param.point && series && onPriceClick) {
                const price = series.coordinateToPrice(param.point.y);
                if (price) onPriceClick(price);
            }
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!candleSeriesRef.current) return;
            setIsLoading(true);
            try {
                const res = await fetch(`/api/market?pair=${pair}&timeframe=1h`);
                let success = false;
                let candles = [];

                if (res.ok) {
                    const json = await res.json();
                    if (json.status === 'success' && json.data.candles?.length > 0) {
                        candles = json.data.candles.map((c: any) => ({
                            time: new Date(c.time).getTime() / 1000 as any,
                            open: c.open, high: c.high, low: c.low, close: c.close
                        })).sort((a: any, b: any) => a.time - b.time);
                        success = true;
                    }
                }

                if (!success || candles.length === 0) {
                    let basePrice = 2000;
                    if (pair.includes('JPY')) basePrice = 150;
                    else if (pair.includes('BTC')) basePrice = 90000;
                    else if (pair.includes('EUR')) basePrice = 1.05;
                    else if (pair.includes('US30')) basePrice = 38000;
                    candles = generateFallbackData(basePrice);
                }

                candleSeriesRef.current.setData(candles);
                chartRef.current?.timeScale().fitContent();

            } catch (err) {
                const fallback = generateFallbackData(2000);
                candleSeriesRef.current?.setData(fallback);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [pair]);

    // Helper: Get price for a level from calculated levels
    const getPriceForLevel = (levelValue: number) => {
        const found = levels.find(l => l.level === levelValue);
        return found ? parseFloat(found.price) : null;
    };

    // Update Lines and Zones
    useEffect(() => {
        if (!candleSeriesRef.current || !chartRef.current) return;

        // Clear old lines
        priceLines.forEach(l => candleSeriesRef.current?.removePriceLine(l));

        const newLines: any[] = [];

        // Filter levels based on showAllLevels
        const displayLevels = showAllLevels
            ? levels
            : levels.filter(l => KEY_LEVELS.includes(l.level));

        // Draw lines
        displayLevels.forEach(lvl => {
            const isKeyLevel = KEY_LEVELS.includes(lvl.level);
            const line = candleSeriesRef.current?.createPriceLine({
                price: parseFloat(lvl.price),
                color: lvl.color,
                lineWidth: isKeyLevel ? (lvl.width || 2) : 1,
                lineStyle: isKeyLevel ? 0 : 2, // 0=solid, 2=dashed
                axisLabelVisible: true,
                title: lvl.label,
            });
            newLines.push(line);
        });

        setPriceLines(newLines);
    }, [levels, showAllLevels]);

    // Get zone prices for legend display
    const getActiveZones = () => {
        if (levels.length === 0) return [];
        return ZONE_CONFIG.map(zone => {
            const startPrice = getPriceForLevel(zone.startLevel);
            const endPrice = getPriceForLevel(zone.endLevel);
            if (startPrice && endPrice) {
                return { ...zone, startPrice, endPrice };
            }
            return null;
        }).filter(Boolean);
    };

    const activeZones = getActiveZones();

    return (
        <div className="relative w-full h-full group">
            {isLoading && (
                <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-gray-400 font-medium animate-pulse">Fetching Fresh Data...</div>
                </div>
            )}
            <div ref={chartContainerRef} className="w-full h-full cursor-crosshair" />

            {/* Zone Legend */}
            {activeZones.length > 0 && (
                <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur rounded-lg p-2 border border-gray-700 text-[10px]">
                        <div className="text-gray-400 font-bold mb-1 uppercase tracking-wider">Zone Guide</div>
                        {activeZones.map((zone: any, i) => (
                            <div key={i} className="flex items-center gap-2 text-gray-300">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.borderColor }}></div>
                                <span>{zone.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Canvas Overlay for Zones */}
            {activeZones.length > 0 && candleSeriesRef.current && (
                <ZoneOverlay
                    chartRef={chartRef}
                    seriesRef={candleSeriesRef}
                    zones={activeZones}
                />
            )}
        </div>
    );
});

// Zone Overlay Component - Draws semi-transparent rectangles
const ZoneOverlay = ({ chartRef, seriesRef, zones }: { chartRef: any, seriesRef: any, zones: any[] }) => {
    const overlayRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const drawZones = () => {
            if (!overlayRef.current || !chartRef.current || !seriesRef.current) return;

            const canvas = overlayRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Match container size
            const container = canvas.parentElement;
            if (!container) return;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;

            // Clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw each zone
            zones.forEach((zone: any) => {
                const y1 = seriesRef.current.priceToCoordinate(zone.startPrice);
                const y2 = seriesRef.current.priceToCoordinate(zone.endPrice);

                if (y1 !== null && y2 !== null) {
                    const top = Math.min(y1, y2);
                    const height = Math.abs(y2 - y1);

                    // Filled rectangle
                    ctx.fillStyle = zone.color;
                    ctx.fillRect(0, top, canvas.width, height);

                    // Border lines
                    ctx.strokeStyle = zone.borderColor;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.moveTo(0, y1);
                    ctx.lineTo(canvas.width, y1);
                    ctx.moveTo(0, y2);
                    ctx.lineTo(canvas.width, y2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            });
        };

        // Initial draw
        drawZones();

        // Redraw on chart changes
        const chart = chartRef.current;
        if (chart) {
            chart.timeScale().subscribeVisibleTimeRangeChange(drawZones);
            chart.subscribeCrosshairMove(drawZones);
        }

        window.addEventListener('resize', drawZones);

        return () => {
            window.removeEventListener('resize', drawZones);
            if (chart) {
                chart.timeScale().unsubscribeVisibleTimeRangeChange(drawZones);
                chart.unsubscribeCrosshairMove(drawZones);
            }
        };
    }, [chartRef, seriesRef, zones]);

    return (
        <canvas
            ref={overlayRef}
            className="absolute inset-0 pointer-events-none z-10"
            style={{ mixBlendMode: 'normal' }}
        />
    );
};

KanjiAnalysisChart.displayName = 'KanjiAnalysisChart';
export default KanjiAnalysisChart;
