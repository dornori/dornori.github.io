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
        Promise.resolve()
        .then(function() {
            // Store ticket in cache storage (simpler than IndexedDB)
            if (ticket) {
                return caches.open('EdgeDesk-tickets').then(function(cache) {
                    const ticketKey = 'ticket-' + ticket.id;
                    const ticketJson = JSON.stringify({ ticket: ticket, timestamp: Date.now() });
                    return cache.put(ticketKey, new Response(ticketJson));
                }).catch(function(e) {
                    console.error('Cache storage failed:', e);
                    return Promise.resolve();
                });
            }
            return Promise.resolve();
        })
        .then(function() {
            // Show notification
            return self.registration.showNotification(data.title || 'New Ticket', {
                body: data.body || 'A new ticket was created',
                icon: '/favicon.ico',
                data: { url: data.url || '/admin/dashboard.html', ticket: ticket }
            });
        })
        .then(function() {
            // Try to send message to open tabs
            if (!ticket) return Promise.resolve();
            
            return clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then(function(clientList) {
                    let sent = false;
                    for (var client of clientList) {
                        if (client.url.includes('/admin/dashboard.html')) {
                            client.postMessage({
                                action: 'newTicket',
                                ticket: ticket
                            });
                            sent = true;
                            console.log('✅ Message sent to dashboard');
                        }
                    }
                    if (!sent) console.log('⚠️ No dashboard window found to receive message');
                    return Promise.resolve();
                });
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/admin/dashboard.html';
    const ticket = event.notification.data && event.notification.data.ticket;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                for (var client of clientList) {
                    if (client.url.includes('/admin/dashboard.html')) {
                        if (ticket) {
                            client.postMessage({ action: 'newTicket', ticket: ticket });
                        }
                        return client.focus();
                    }
                }
                return clients.openWindow(url);
            })
    );
});

self.addEventListener('message', function(event) {
    console.log('📨 SW received message:', event.data);
    if (event.data.action === 'ping') {
        event.source.postMessage({ action: 'pong', message: 'SW is ready' });
    }
    if (event.data.action === 'getStoredTickets') {
        caches.open('EdgeDesk-tickets').then(function(cache) {
            return cache.keys().then(function(requests) {
                var promises = [];
                for (var req of requests) {
                    promises.push(
                        cache.match(req).then(function(response) {
                            return response.text();
                        })
                    );
                }
                return Promise.all(promises);
            }).then(function(ticketTexts) {
                var tickets = [];
                for (var text of ticketTexts) {
                    try {
                        var data = JSON.parse(text);
                        tickets.push(data.ticket);
                    } catch (e) {}
                }
                event.source.postMessage({ action: 'storedTickets', tickets: tickets });
                
                // Clear cache after sending
                return caches.open('EdgeDesk-tickets').then(function(cache) {
                    return cache.keys().then(function(requests) {
                        return Promise.all(requests.map(function(req) { return cache.delete(req); }));
                    });
                });
            }).catch(function(e) {
                console.error('Failed to get stored tickets:', e);
                event.source.postMessage({ action: 'storedTickets', tickets: [] });
            });
        });
    }
});

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(clients.claim());
});