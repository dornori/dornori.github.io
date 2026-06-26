// ─── SERVICE WORKER CONTENT ─────────────────────────────────
const SW_CONTENT = `
self.addEventListener('push', function(event) {
    console.log('📨 Push received');
    console.log('📦 Raw event.data:', event.data);
    
    let data = {};
    let rawText = null;
    
    if (event.data) {
        try {
            rawText = event.data.text();
            console.log('📝 Raw text:', rawText);
            
            try {
                data = event.data.json();
                console.log('✅ Parsed JSON:', JSON.stringify(data));
            } catch(e) {
                console.log('❌ JSON parse error:', e.message);
                data = { raw: rawText };
            }
        } catch(e) {
            console.log('❌ Error reading data:', e.message);
            data = { error: 'Could not read data' };
        }
    } else {
        console.log('⚠️ Push data is null');
        data = { error: 'No data' };
    }

    // Show notification
    let notificationTitle = '🔔 New Ticket';
    let notificationBody = 'A new ticket was created';
    
    if (data.ticket_number) {
        notificationTitle = '🔔 New Ticket ' + data.ticket_number;
        notificationBody = data.body || data.subject || 'New ticket received';
    } else if (data.test !== undefined) {
        notificationTitle = '🔢 Test: ' + data.test;
        notificationBody = JSON.stringify(data);
    }

    const notifyPromise = self.registration.showNotification(notificationTitle, {
        body: notificationBody,
        icon: '/favicon.ico',
        data: { 
            url: data.url || '/admin/dashboard.html', 
            ticketId: data.ticket_id || null,
            ticketNumber: data.ticket_number || null
        }
    });

    // ✅ Send the FULL ticket data to the dashboard
    const messagePromise = clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
            console.log('📋 Clients found:', clientList.length);
            for (var client of clientList) {
                if (client.url.includes('/admin/dashboard.html') || client.url.includes('dashboard.html')) {
                    // Send the full ticket data
                    client.postMessage({ 
                        action: 'newTicket',
                        ticket: {
                            id: data.ticket_id,
                            ticket_id: data.ticket_id,
                            ticket_number: data.ticket_number,
                            category: data.category || 'support',
                            status: data.status || 'new',
                            subject: data.body || data.subject || 'New ticket',
                            sender_email: data.sender_email || 'unknown@example.com',
                            created_at: new Date().toISOString(),
                            language: data.language || 'en'
                        }
                    });
                    console.log('✅ postMessage sent with ticket data:', data.ticket_number);
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
`;