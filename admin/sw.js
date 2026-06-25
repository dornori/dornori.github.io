// IndexedDB storage for pending tickets
function getPendingTicketsDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('EdgeDesk', 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('pendingTickets')) {
                db.createObjectStore('pendingTickets', { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function storePendingTicket(ticket) {
    try {
        const db = await getPendingTicketsDB();
        const tx = db.transaction('pendingTickets', 'readwrite');
        tx.objectStore('pendingTickets').put({ id: ticket.id, ticket: ticket, timestamp: Date.now() });
    } catch (e) {
        console.error('Failed to store pending ticket:', e);
    }
}

self.addEventListener('push', function(event) {
    console.log('📨 Push received');
    
    let data = {};
    try {
        data = event.data.json();
    } catch(e) {
        data = { title: 'New Ticket', body: 'A new ticket was created', url: '/admin/dashboard.html', ticket: null };
    }
    
    const ticket = data.ticket || null;

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(data.title || 'New Ticket', {
                body: data.body || 'A new ticket was created',
                icon: '/favicon.ico',
                data: { url: data.url || '/admin/dashboard.html', ticket: ticket }
            }),
            ticket ? storePendingTicket(ticket) : Promise.resolve()
        ]).then(function() {
            if (!ticket) return;
            return clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then(function(clientList) {
                    for (var client of clientList) {
                        if (client.url.includes('/admin/dashboard.html')) {
                            client.postMessage({ action: 'newTicket', ticket: ticket });
                            console.log('✅ Message sent to dashboard');
                        }
                    }
                });
        })
    );
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/admin/dashboard.html';
    const ticket = event.notification.data && event.notification.data.ticket;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                for (var client of clientList) {
                    if (client.url.includes('/admin/dashboard.html')) {
                        if (ticket) client.postMessage({ action: 'newTicket', ticket: ticket });
                        return client.focus();
                    }
                }
                return clients.openWindow(url);
            })
    );
});

// Listen for messages from dashboard
self.addEventListener('message', function(event) {
    console.log('📨 SW received message:', event.data);
    if (event.data.action === 'ping') {
        event.source.postMessage({ action: 'pong', message: 'SW is ready' });
    }
    if (event.data.action === 'getPendingTickets') {
        getPendingTicketsDB().then(function(db) {
            const tx = db.transaction('pendingTickets', 'readonly');
            const req = tx.objectStore('pendingTickets').getAll();
            req.onsuccess = function() {
                event.source.postMessage({ action: 'pendingTickets', tickets: req.result });
                // Clear after sending
                db.transaction('pendingTickets', 'readwrite').objectStore('pendingTickets').clear();
            };
        }).catch(() => {
            event.source.postMessage({ action: 'pendingTickets', tickets: [] });
        });
    }
});

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(clients.claim());
});