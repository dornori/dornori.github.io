self.addEventListener('push', function(event) {
    console.log('📨 Push received in service worker!');
    
    let data = {};
    try {
        data = event.data.json();
        console.log('Push data:', data);
    } catch (e) {
        console.log('No JSON data, using defaults');
        data = { 
            title: 'New Ticket', 
            body: 'A new ticket was created',
            url: '/admin/dashboard.html',
            ticket: null
        };
    }
    
    const title = data.title || 'New Ticket';
    const body = data.body || 'A new ticket was created';
    const url = data.url || '/admin/dashboard.html';
    const ticket = data.ticket || null;
    
    // Show notification
    event.waitUntil(
        self.registration.showNotification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            data: { url: url, ticket: ticket },
            vibrate: [200, 100, 200],
            requireInteraction: true
        })
    );
    
    // ✅ FIX: Send message to all open dashboard pages
    if (ticket) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then(function(clientList) {
                    for (var i = 0; i < clientList.length; i++) {
                        var client = clientList[i];
                        if (client.url && client.url.includes('/admin/dashboard.html')) {
                            client.postMessage({
                                action: 'newTicket',
                                ticket: ticket
                            });
                            console.log('📤 Sent newTicket message to dashboard');
                        }
                    }
                })
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    console.log('Notification clicked:', event.notification);
    event.notification.close();
    const url = event.notification.data?.url || '/admin/dashboard.html';
    event.waitUntil(
        clients.openWindow(url)
    );
});

self.addEventListener('install', function(event) {
    console.log('Service worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    console.log('Service worker activated');
    event.waitUntil(clients.claim());
});