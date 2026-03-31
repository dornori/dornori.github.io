import SITE_CONFIG from './config.js';

export function initNavigation() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return;
    nav.innerHTML = '';
    SITE_CONFIG.navigation.forEach(item => {
        if (!item.enabled) return;
        const a = document.createElement('a');
        a.href = item.link;
        a.textContent = item.label;
        a.className = item.type === 'button' ? 'nav-link nav-newsletter' : 'nav-link';
        nav.appendChild(a);
    });
}
