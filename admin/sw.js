self.addEventListener('push', function(event) {
    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = { action: 'unknown' };
    }

    if (data.action === 'newTicket' && data.ticket) {
        const ticket = data.ticket;
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
                for (const client of clientList) {
                    client.postMessage({
                        action: 'newTicket',
                        ticket: ticket
                    });
                }
                const title = 'New Ticket ' + ticket.ticket_number;
                const body = ticket.subject + ' from ' + (ticket.sender_name || ticket.sender_email);
                return self.registration.showNotification(title, {
                    body: body,
                    icon: '/icon.png',
                    data: { url: '/?ticket=' + ticket.id }
                });
            })
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = event.notification.data.url || '/';
    event.waitUntil(clients.openWindow(url));
});