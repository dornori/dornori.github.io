// edgedeskconfig.js
window.EDGEDESK_CONFIG = {
    API_BASE: 'https://dornori-ticketing.dornori-info.workers.dev',
    APP_NAME: 'EdgeDesk',
    VERSION: '1.1.0',
    NAV_ITEMS: [
        { id: 'nav-dashboard',  page: 'dashboard',  href: 'dashboard.html',  label: '🎫 Dashboard' },
        { id: 'nav-reports',    page: 'reports',    href: 'reports.html',    label: '📊 Reports' },
        { id: 'nav-newsletter', page: 'newsletter', href: 'newsletter.html', label: '📧 Newsletter' },
        { id: 'nav-settings',   page: 'settings',   href: 'settings.html',   label: '⚙️ Settings' },
        { id: 'nav-users',      page: 'users',      href: 'users.html',      label: '👥 Users' }
    ],
    ENDPOINTS: {
        CACHE_PURGE: '/api/admin/cache/purge'
    }
};