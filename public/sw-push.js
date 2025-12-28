// ARRA7 Push Notification Service Worker

self.addEventListener('push', function (event) {
    if (!event.data) return;

    try {
        const data = event.data.json();

        const options = {
            body: data.body || 'New notification from ARRA7',
            icon: data.icon || '/icons/icon-192x192.png',
            badge: data.badge || '/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/',
                timestamp: data.timestamp
            },
            actions: [
                { action: 'open', title: 'Buka' },
                { action: 'close', title: 'Tutup' }
            ],
            tag: 'arra7-notification',
            renotify: true
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'ARRA7', options)
        );
    } catch (error) {
        console.error('Push event error:', error);
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'close') return;

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                // If there's already a window open, focus it
                for (const client of clientList) {
                    if (client.url.includes('arra7') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// Handle subscription change
self.addEventListener('pushsubscriptionchange', function (event) {
    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true
        }).then(function (subscription) {
            // Re-subscribe with new subscription
            return fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription })
            });
        })
    );
});
