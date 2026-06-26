// Changes to sw.js v1.1:
// SIMPLIFIED: Removed test payload logging
// KEPT: Real ticket push notification handling

// REPLACE this section in sw.js (around line 1 - the push event listener):

/*
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
        notificationTitle = '🔔 Ticket ' + data.ticket_number;
        notificationBody = data.body || data.subject || 'New ticket received';
    }

    const notifyPromise = self.registration.showNotification(notificationTitle, {
        body: notificationBody,
        icon: '/favicon.ico',
        data: { 
            url: '/admin/dashboard.html', 
            ticketId: data.ticket_id || null,
            ticketNumber: data.ticket_number || null
        }
    });

    const messagePromise = clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
            console.log('📋 Clients found:', clientList.length);
            for (var client of clientList) {
                if (client.url.includes('/admin/dashboard.html') || client.url.includes('dashboard.html')) {
                    client.postMessage({ 
                        action: data.ticket_id ? 'newTicket' : 'push',
                        ticketId: data.ticket_id || null,
                        data: data
                    });
                    console.log('✅ postMessage sent:', data.ticket_id ? 'newTicket' : 'push');
                }
            }
        });

    event.waitUntil(Promise.all([notifyPromise, messagePromise]));
});
*/

// WITH THIS (no test payload handling, just real tickets):
/*
self.addEventListener('push', function(event) {
    console.log('📨 Push received');
    
    let data = {};
    
    if (event.data) {
        try {
            data = event.data.json();
            console.log('✅ Decrypted payload:', data.ticket_number);
        } catch(e) {
            console.log('❌ JSON parse error:', e.message);
            data = {};
        }
    }

    // Show notification
    let notificationTitle = '🔔 New Ticket';
    let notificationBody = 'A new ticket was created';
    
    if (data.ticket_number) {
        notificationTitle = '🔔 Ticket ' + data.ticket_number;
        notificationBody = data.subject || 'New ticket received';
    }

    const notifyPromise = self.registration.showNotification(notificationTitle, {
        body: notificationBody,
        icon: '/favicon.ico',
        data: { 
            url: '/admin/dashboard.html', 
            ticketId: data.ticket_id || null,
            ticketNumber: data.ticket_number || null
        }
    });

    const messagePromise = clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
            for (var client of clientList) {
                if (client.url.includes('/admin/dashboard.html') || client.url.includes('dashboard.html')) {
                    client.postMessage({ 
                        action: 'newTicket',
                        ticketId: data.ticket_id || null,
                        data: data
                    });
                    console.log('✅ Sent newTicket to dashboard');
                }
            }
        });

    event.waitUntil(Promise.all([notifyPromise, messagePromise]));
});
*/
