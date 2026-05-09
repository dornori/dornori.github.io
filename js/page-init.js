/**
 * Page Initialization  (js/page-init.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles global page context setup and scroll event listeners.
 * Replaces inline scripts duplicated across all 383 HTML files (~150KB savings).
 * 
 * Auto-detects language and page slug from URL path on DOMContentLoaded.
 */

export function initPageContext(lang = 'en', slug = '') {
    window.__PAGE_LANG__ = lang;
    window.__PAGE_SLUG__ = slug;
}

export function initScrollListener() {
    // Passive scroll listener (better performance, won't block scroll)
    window.addEventListener('scroll', () => {
        const html = document.documentElement;
        if (window.scrollY === 0) {
            html.classList.add('at-top');
        } else {
            html.classList.remove('at-top');
            html.style.overflowY = '';
        }
    }, { passive: true });
}

/**
 * Auto-initialize on page load
 * Detects language from URL path structure: /en/, /de/, /nl/, etc.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Parse URL path to extract language and page slug
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const supportedLangs = ['en', 'de', 'nl', 'no', 'fr', 'es', 'it', 'pt', 'cs'];
    
    let lang = 'en';  // default
    let slug = '';
    
    if (supportedLangs.includes(pathSegments[0])) {
        lang = pathSegments[0];
        slug = pathSegments[1] || '';
    }
    
    initPageContext(lang, slug);
    initScrollListener();
});
