self.addEventListener('push', function(event) {
    console.log('📨 Push received (tickle)');

    // Fetch the latest ticket from the server
    const fetchPromise = fetch('/api/latest-ticket')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.ticketId) {
                console.log('📊 Latest ticket ID:', data.ticketId);
                // Show notification with ticket details
                return self.registration.showNotification(
                    'New Ticket: ' + (data.ticketNumber || ''),
                    {
                        body: data.subject || 'A new ticket was created',
                        icon: '/favicon.ico',
                        data: {
                            url: '/admin/dashboard.html',
                            ticketId: data.ticketId
                        },
                        tag: 'ticket-' + data.ticketId,
                        requireInteraction: true
                    }
                );
            } else {
                // Fallback
                return self.registration.showNotification('New Ticket', {
                    body: 'A new ticket was created',
                    icon: '/favicon.ico',
                    data: { url: '/admin/dashboard.html' }
                });
            }
        })
        .catch(err => {
            console.error('Failed to fetch latest ticket:', err);
            // Show generic notification
            return self.registration.showNotification('New Ticket', {
                body: 'A new ticket was created',
                icon: '/favicon.ico',
                data: { url: '/admin/dashboard.html' }
            });
        });

    event.waitUntil(fetchPromise);
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    const ticketId = event.notification.data && event.notification.data.ticketId;
    let url = '/admin/dashboard.html';
    
    if (ticketId) {
        url += '?ticket=' + encodeURIComponent(ticketId);
        console.log('🔗 Opening dashboard with ticket:', ticketId);
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var client of clientList) {
                if (client.url.includes('/admin/dashboard.html') && 'focus' in client) {
                    if (ticketId) {
                        client.postMessage({ 
                            action: 'focusTicket', 
                            ticketId: ticketId 
                        });
                    }
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

self.addEventListener('message', function(event) {
    console.log('📨 SW received message:', event.data);
    if (event.data.action === 'ping') {
        event.source.postMessage({ 
            action: 'pong', 
            message: 'SW is ready' 
        });
    }
});

self.addEventListener('install', function(event) {
    console.log('⚡ Service Worker installing...');
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    console.log('⚡ Service Worker activating...');
    event.waitUntil(clients.claim());
});