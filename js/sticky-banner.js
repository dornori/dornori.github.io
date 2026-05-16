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
        const sy = window.scrollY;
        const t  = Math.min(1, Math.max(0, (sy - SCROLL_START) / (SCROLL_END - SCROLL_START)));
        // Logo size now controlled by CSS only - edit .billboard-logo-wrap width in main.css
        // logoWrap.style.width     = (13 - 5 * t) + 'vw';
        // wordmark.style.fontSize  = (3.2 - 1.2 * t) + 'vw';
        header.classList.toggle('header--scrolled', t > 0.5);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
}
