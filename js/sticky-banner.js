import SITE_CONFIG from './config.js';

/**
 * STICKY BANNER
 * Adds/removes the 'header--scrolled' class on <header> based on scroll position.
 * All visual changes (logo shrink, header slide-up) are handled by CSS transitions.
 * No layout measurement required — avoids all timing/rAF issues.
 */
export function initStickyBanner() {
    const header    = document.getElementById('main-header');
    const bannerImg = document.getElementById('banner-img');
    const mobileNav = document.getElementById('mobile-nav');
    if (!header || !bannerImg) return;

    bannerImg.onclick = (e) => {
        e.stopPropagation();
        if (typeof window.showHome === 'function') window.showHome();
        else window.location.href = SITE_CONFIG.appearance.base_path + (window.LANG || 'en') + '/';
    };

    // Scroll threshold (px) before the header compresses.
    // Small so it triggers quickly after scrolling starts.
    const SCROLL_THRESHOLD = 40;

    function onScroll() {
        const scrolled = window.scrollY > SCROLL_THRESHOLD;
        header.classList.toggle('header--scrolled', scrolled);
        if (mobileNav) mobileNav.classList.toggle('header--scrolled', scrolled);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll(); // apply on load in case page starts scrolled
}
