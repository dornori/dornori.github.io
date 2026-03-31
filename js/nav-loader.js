import SITE_CONFIG from './config.js';

export function initNavigation() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return;
    nav.innerHTML = '';

    SITE_CONFIG.navigation.forEach(item => {
        if (!item.enabled) return;
        const btn = document.createElement('button');
        btn.textContent = item.label;
        btn.className = item.type === 'button' ? 'nav-link nav-newsletter' : 'nav-link';
        
        // Link to the internal page loader slug
        btn.onclick = () => window.viewPage(item.slug);
        nav.appendChild(btn);
    });
}
