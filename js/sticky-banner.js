import SITE_CONFIG from './config.js';

export function initStickyBanner() {
    const header    = document.getElementById('main-header');
    const bannerImg = document.getElementById('banner-img');
    if (!header || !bannerImg) return;

    bannerImg.onclick = (e) => {
        e.stopPropagation();
        if (typeof window.showHome === 'function') window.showHome();
        else window.location.href = SITE_CONFIG.appearance.base_path + (window.LANG || 'en') + '/';
    };

    const logoWrap = bannerImg.parentElement;
    const wordmark = logoWrap?.querySelector('.billboard-wordmark');

    if (!logoWrap || !wordmark) return;

    const SCROLL_START = 10;
    const SCROLL_END   = 80;

    function onScroll() {
        // Header shrinking on scroll has been removed.
        // Logo and wordmark now remain at full size regardless of scroll position.
        // const sy = window.scrollY;
        // const t  = Math.min(1, Math.max(0, (sy - SCROLL_START) / (SCROLL_END - SCROLL_START)));
        // logoWrap.style.width     = (8 - 5 * t) + 'vw';
        // wordmark.style.fontSize  = (3.2 - 1.2 * t) + 'vw';
        // header.classList.toggle('header--scrolled', t > 0.5);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
}
