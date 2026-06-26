self.addEventListener('push', function(event) {
    console.log('📨 Push received');
    let data = {};
    try {
        data = event.data.json();
        console.log('✅ Parsed JSON, ticket:', data.ticket_number);
    } catch(e) {
        console.log('❌ JSON parse error:', e.message);
        data = {};
    }

    const notifyPromise = self.registration.showNotification(data.title || '🔔 New Ticket', {
        body: data.body || data.subject || 'A new ticket was created',
        icon: '/favicon.ico',
        data: { url: data.url || '/admin/dashboard.html', ticketId: data.ticket_id || null }
    });

    const messagePromise = clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
            for (var client of clientList) {
                if (client.url.includes('/admin/dashboard.html') || client.url.includes('dashboard.html')) {
                    client.postMessage({ action: 'newTicket', ticketId: data.ticket_id || null });
                    console.log('✅ postMessage sent, ticketId:', data.ticket_id);
                }
            }
        });

    event.waitUntil(Promise.all([notifyPromise, messagePromise]));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/admin/dashboard.html';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var client of clientList) {
                if (client.url.includes('/admin/dashboard.html') && 'focus' in client) {
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
        event.source.postMessage({ action: 'pong', message: 'SW is ready' });
    }
});

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(clients.claim());
});