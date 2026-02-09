'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function PushNotificationToggle() {
    const { data: session } = useSession();
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkSupport();
    }, []);

    const checkSupport = async () => {
        // Check if push notifications are supported
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);

            try {
                // Register service worker
                const registration = await navigator.serviceWorker.register('/sw-push.js');

                // Check existing subscription
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } catch (error) {
                console.error('Service worker registration failed:', error);
            }
        }
        setIsLoading(false);
    };

    const subscribe = async () => {
        if (!session?.user?.id) {
            alert('Please login first');
            return;
        }

        setIsLoading(true);
        try {
            // Get VAPID key
            const configRes = await fetch('/api/push/subscribe');
            const config = await configRes.json();

            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey)
            });

            // Send subscription to server
            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: subscription.toJSON() })
            });

            const data = await res.json();
            if (data.status === 'success') {
                setIsSubscribed(true);
            }
        } catch (error) {
            console.error('Subscribe error:', error);
            alert('Failed to subscribe. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const unsubscribe = async () => {
        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Unsubscribe from server
                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint })
                });

                // Unsubscribe locally
                await subscription.unsubscribe();
                setIsSubscribed(false);
            }
        } catch (error) {
            console.error('Unsubscribe error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function
    function urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    if (!isSupported) {
        return null; // Don't show if not supported
    }

    return (
        <button
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSubscribed
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                    : 'bg-[#1F2937] text-gray-400 hover:bg-[#374151] hover:text-white border border-[#374151]'
                }`}
        >
            {isLoading ? (
                <span className="animate-pulse">⏳</span>
            ) : isSubscribed ? (
                <>🔔 Notif ON</>
            ) : (
                <>🔕 Aktifkan Notif</>
            )}
        </button>
    );
}
