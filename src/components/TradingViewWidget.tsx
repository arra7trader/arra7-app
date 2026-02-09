'use client';

import { useEffect, useRef, memo } from 'react';

declare global {
    interface Window {
        TradingView: any;
    }
}

interface TradingViewWidgetProps {
    symbol: string;
    theme?: 'Light' | 'Dark';
    autosize?: boolean;
    interval?: string;
}

function TradingViewWidget({
    symbol,
    theme = 'Dark',
    autosize = true,
    interval = '60'
}: TradingViewWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scriptLoadedRef = useRef(false);

    useEffect(() => {
        // Function to init widget
        const initWidget = () => {
            if (containerRef.current && window.TradingView) {
                // Clear previous widget if any (though usually we just overwrite)
                containerRef.current.innerHTML = '';

                new window.TradingView.widget({
                    "autosize": autosize,
                    "symbol": symbol,
                    "interval": interval,
                    "timezone": "Asia/Jakarta",
                    "theme": theme,
                    "style": "1",
                    "locale": "en",
                    "enable_publishing": false,
                    "allow_symbol_change": true,
                    "container_id": containerRef.current.id,
                    "hide_side_toolbar": false,
                    "studies": [
                        // Add some default relevant studies if needed, or leave empty
                    ],
                    "show_popup_button": true,
                    "popup_width": "1000",
                    "popup_height": "650",
                });
            }
        };

        // Load Script if not already loaded
        if (!scriptLoadedRef.current && !window.TradingView) {
            const script = document.createElement('script');
            script.src = 'https://s3.tradingview.com/tv.js';
            script.async = true;
            script.onload = () => {
                scriptLoadedRef.current = true;
                initWidget();
            };
            document.head.appendChild(script);
        } else {
            // Already loaded, just init (or re-init on prop change)
            initWidget();
        }
    }, [symbol, theme, interval, autosize]);

    return (
        <div
            id={`tradingview_${Math.random().toString(36).substring(7)}`}
            ref={containerRef}
            className="tradingview-widget-container w-full h-full"
        />
    );
}

export default memo(TradingViewWidget);
