'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useTrackLocation() {
    const { data: session, status } = useSession();

    useEffect(() => {
        // Only track when user is authenticated
        if (status !== 'authenticated' || !session?.user) {
            return;
        }

        // Check if we've already tracked in this session
        const hasTracked = sessionStorage.getItem('location_tracked');
        if (hasTracked) {
            return;
        }

        // Track location
        const trackLocation = async () => {
            try {
                const response = await fetch('/api/auth/track-location', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('[GEO] Location tracked:', data.location);
                    // Mark as tracked for this session
                    sessionStorage.setItem('location_tracked', 'true');
                }
            } catch (error) {
                console.error('[GEO] Error tracking location:', error);
            }
        };

        trackLocation();
    }, [session, status]);
}
