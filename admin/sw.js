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
            url: '/admin/dashboard.html'
        };
    }
    
    const title = data.title || 'New Ticket';
    const body = data.body || 'A new ticket was created';
    const url = data.url || '/admin/dashboard.html';
    
    event.waitUntil(
        self.registration.showNotification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            data: { url: url },
            vibrate: [200, 100, 200],
            requireInteraction: true
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    console.log('Notification clicked:', event.notification);
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/admin/dashboard.html')
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

// Listen for messages from the page
self.addEventListener('message', function(event) {
    if (event.data.type === 'test-notification') {
        self.registration.showNotification('Test from Service Worker', {
            body: 'If you see this, the service worker is working!',
            icon: '/favicon.ico'
        });
    }
});