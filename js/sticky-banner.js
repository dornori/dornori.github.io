import SITE_CONFIG from './config.js';

/**
 * STICKY BANNER
 * Directly drives logo width and wordmark font-size via inline styles
 * interpolated from scroll position. Bypasses CSS class toggling entirely
 * so there is no dependency on class specificity, load order, or SW cache.
 */
export function initStickyBanner() {
    const header    = document.getElementById('main-header');
    const bannerImg = document.getElementById('banner-img');
    if (!header || !bannerImg) return;

    bannerImg.onclick = (e) => {
        e.stopPropagation();
        if (typeof window.showHome === 'function') window.showHome();
        else window.location.href = SITE_CONFIG.appearance.base_path + (window.LANG || 'en') + '/';
    };

    const logoWrap = bannerImg.parentElement;  // .billboard-logo-wrap
    const wordmark = logoWrap?.querySelector('.billboard-wordmark');
    const mobileNav = document.getElementById('mobile-nav');

    if (!logoWrap || !wordmark) return;

    const SCROLL_START = 10;   // px
    const SCROLL_END   = 80;   // px

    function onScroll() {
        const sy = window.scrollY;
        const t = Math.min(1, Math.max(0, (sy - SCROLL_START) / (SCROLL_END - SCROLL_START)));

        // Logo wrap: 13vw → 8vw
        logoWrap.style.width = (13 - 5 * t) + 'vw';

        // Wordmark: 3.2vw → 2.0vw (or just use relative font-size)
        wordmark.style.fontSize = (3.2 - 1.2 * t) + 'vw';

        // Class for other CSS if needed
        header.classList.toggle('header--scrolled', t > 0.5);
        if (mobileNav) mobileNav.classList.toggle('header--scrolled', t > 0.5);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
}
