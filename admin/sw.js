self.addEventListener('push', function(event) {
    console.log('📨 Push received');

    let data = {};
    try {
        data = event.data.json();
        console.log('✅ Parsed JSON:', JSON.stringify(data));
    } catch(e) {
        console.log('❌ JSON parse error:', e.message);
        data = { 
            title: 'New Ticket', 
            body: 'A new ticket was created', 
            url: '/admin/dashboard.html', 
            ticket_id: null 
        };
    }

    // ✅ FIX: Ensure ticket_id is properly handled
    const ticketId = data.ticket_id || data.id || null;
    console.log('🔑 Ticket ID from payload:', ticketId);

    const notifyPromise = self.registration.showNotification(data.title || 'New Ticket', {
        body: data.body || 'A new ticket was created',
        icon: '/favicon.ico',
        data: { 
            url: data.url || '/admin/dashboard.html', 
            ticketId: ticketId 
        }
    });

    // Send message to all open dashboard windows
    const messagePromise = clients.matchAll({ 
        type: 'window', 
        includeUncontrolled: true 
    }).then(function(clientList) {
        console.log('📋 Clients found:', clientList.length);
        for (var client of clientList) {
            console.log('🔍 Client URL:', client.url);
            if (client.url.includes('/admin/dashboard.html') || client.url.includes('/admin/')) {
                // ✅ FIX: Send the ticket ID properly
                client.postMessage({ 
                    action: 'newTicket', 
                    ticketId: ticketId 
                });
                console.log('✅ postMessage sent with ticketId:', ticketId);
            }
        }
    });

    event.waitUntil(Promise.all([notifyPromise, messagePromise]));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // ✅ FIX: Get the ticket ID from notification data
    const ticketId = event.notification.data && event.notification.data.ticketId;
    let url = (event.notification.data && event.notification.data.url) || '/admin/dashboard.html';
    
    // If we have a ticket ID, add it as a parameter
    if (ticketId) {
        url += '?ticket=' + encodeURIComponent(ticketId);
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var client of clientList) {
                if (client.url.includes('/admin/') && 'focus' in client) {
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