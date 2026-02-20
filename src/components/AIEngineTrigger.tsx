'use client';

import { useEffect, useRef } from 'react';

export default function AIEngineTrigger() {
    const hasRun = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const triggerAI = async () => {
            try {
                // Silently trigger the AI engine
                await fetch('/api/cron/forex-signal', { cache: 'no-store' });
            } catch (error) {
                // Ignore errors silently as this is a background process
            }
        };

        // Run once on initial load (with slight delay so as not to block UI render)
        if (!hasRun.current) {
            hasRun.current = true;
            setTimeout(triggerAI, 10000);
        }

        // Run every 5 minutes approximately (+ random jitter to prevent thundering herd)
        const baseInterval = 5 * 60 * 1000;
        const jitter = Math.random() * 60000; // 0-60s jitter
        const interval = setInterval(triggerAI, baseInterval + jitter);

        return () => clearInterval(interval);
    }, []);

    return null; // This component is strictly logical and has no UI
}
