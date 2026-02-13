'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

export default function EquityChart({ data, color = '#2962FF' }: { data: any[], color?: string }) {
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#1D1D1F',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                borderVisible: false,
            },
            handleScroll: false,
            handleScale: false,
        });

        const areaSeries = (chart as any).addAreaSeries({
            lineColor: color,
            topColor: color,
            bottomColor: 'rgba(41, 98, 255, 0)',
            lineWidth: 2,
        });

        // Mock data generator if empty
        const chartData = data.length > 0 ? data : generateMockData();
        areaSeries.setData(chartData);

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, color]);

    return <div ref={chartContainerRef} className="w-full h-[300px]" />;
}

function generateMockData() {
    const data = [];
    let value = 1000;
    const date = new Date();
    date.setDate(date.getDate() - 100);

    for (let i = 0; i < 100; i++) {
        date.setDate(date.getDate() + 1);
        value += (Math.random() - 0.4) * 50; // Bias slightly upwards
        data.push({
            time: date.toISOString().split('T')[0],
            value: value,
        });
    }
    return data;
}
