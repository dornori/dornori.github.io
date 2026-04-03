import SITE_CONFIG from './config.js';

/**
 * NAV LOADER MODULE - 
 * Handles the top-right menu. 
 * Updated to handle the 'Newsletter' scroll-to-focus behavior.
 */

function toggleTheme() {
    document.body.classList.toggle("light-theme");
}

export function initNavigation() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return;
    nav.innerHTML = '';

    SITE_CONFIG.navigation.forEach(item => {
        if (!item.enabled) return;
        
        const btn = document.createElement('button');
        btn.textContent = item.label;
        
        // Apply different styles for standard links vs the primary button
        btn.className = item.type === 'button' ? 'nav-link nav-newsletter' : 'nav-link';
        
        btn.onclick = () => {
            if (item.slug === 'newsletter') {
                // If they click Newsletter, go home and focus the input
                window.showHome(true); 
            } else {
                // Otherwise, load the specific sub-page
                window.viewPage(item.slug);
            }
        };
        
        nav.appendChild(btn);
    });
}
