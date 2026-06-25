self.addEventListener('push', function(event) {
    console.log('📨 Push received');
    
    let data = {};
    try {
        data = event.data.json();
    } catch(e) {
        data = { title: 'New Ticket', body: 'A new ticket was created', url: '/admin/dashboard.html', ticket: null };
    }
    
    const ticket = data.ticket || null;
    
    // Show notification
    event.waitUntil(
        self.registration.showNotification(data.title || 'New Ticket', {
            body: data.body || 'A new ticket was created',
            icon: '/favicon.ico',
            data: { url: data.url || '/admin/dashboard.html' }
        })
    );
    
    // ✅ SEND MESSAGE TO DASHBOARD
    if (ticket) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                for (var client of clientList) {
                    if (client.url.includes('/admin/dashboard.html')) {
                        client.postMessage({
                            action: 'newTicket',
                            ticket: ticket
                        });
                        console.log('✅ Message sent to dashboard');
                    }
                }
            })
        );
    }
});

// ✅ LISTEN FOR MESSAGES FROM DASHBOARD
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