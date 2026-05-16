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
    const mobileNav = document.getElementById('mobile-nav');
    if (!header || !bannerImg) return;

    bannerImg.onclick = (e) => {
        e.stopPropagation();
        if (typeof window.showHome === 'function') window.showHome();
        else window.location.href = SITE_CONFIG.appearance.base_path + (window.LANG || 'en') + '/';
    };

    const logoWrap  = bannerImg.closest('.billboard-logo-wrap') || bannerImg.parentElement;
    const wordmark  = header.querySelector('.billboard-wordmark');

    // Logo wrap: 13vw at top → 8vw when scrolled
    const WRAP_MAX  = 13;   // vw
    const WRAP_MIN  = 8;    // vw

    // Wordmark font-size: 3.2vw at top → 2.0vw when scrolled
    const FONT_MAX  = 3.2;  // vw
    const FONT_MIN  = 2.0;  // vw

    // Scroll range over which the transition happens
    const SCROLL_START = 10;   // px — start shrinking immediately
    const SCROLL_END   = 80;   // px — fully shrunk by here

    // CSS transition on the elements so it feels smooth even between rAF ticks
    if (logoWrap) {
        logoWrap.style.transition = 'width 0.25s ease, opacity 0.3s';
    }
    if (wordmark) {
        wordmark.style.transition = 'font-size 0.25s ease';
    }

    let lastScrollY = -1;
    let rafPending  = false;

    function applyScroll() {
        rafPending = false;
        const sy = window.scrollY;
        if (sy === lastScrollY) return;
        lastScrollY = sy;

        // 0 at top, 1 when fully scrolled
        const t = Math.min(1, Math.max(0, (sy - SCROLL_START) / (SCROLL_END - SCROLL_START)));

        const wrapW = WRAP_MAX + (WRAP_MIN - WRAP_MAX) * t;
        const fontS = FONT_MAX + (FONT_MIN - FONT_MAX) * t;

        if (logoWrap) logoWrap.style.width = wrapW + 'vw';
        if (wordmark) wordmark.style.fontSize = fontS + 'vw';

        // Keep the CSS class in sync for any other CSS that depends on it
        header.classList.toggle('header--scrolled', t > 0.5);
        if (mobileNav) mobileNav.classList.toggle('header--scrolled', t > 0.5);
    }

    function onScroll() {
        if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(applyScroll);
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', applyScroll);
    applyScroll(); // apply immediately on load
}
