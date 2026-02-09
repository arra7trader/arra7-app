'use client';

import { useTrackLocation } from '@/hooks/useTrackLocation';

export default function LocationTracker() {
    // This hook tracks user location when they login
    useTrackLocation();

    // This component doesn't render anything
    return null;
}
