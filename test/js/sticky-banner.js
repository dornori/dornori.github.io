import SITE_CONFIG from './config.js';

/**
 * STICKY BANNER + MOBILE NAV
 * ─────────────────────────────────────────────────────────────────────────────
 * Banner:     starts fully visible, scrolls up until bannerStickyOffset (35%)
 *             has gone out of view, then locks.
 * Mobile nav: positioned just below the banner's visible bottom edge at all
 *             times — it moves up with the banner and locks with it.
 *             Uses position:fixed + a top value updated on scroll.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function initStickyBanner() {
    const header    = document.getElementById('main-header');
    const bannerImg = document.getElementById('banner-img');
    const mobileNav = document.getElementById('mobile-nav');
    if (!header || !bannerImg) return;

    bannerImg.onclick = () => {
        if (typeof window.showHome === 'function') window.showHome();
        else window.location.href = SITE_CONFIG.appearance.root_url;
    };

    let maxOffset = 0;

    const calcMaxOffset = () => {
        maxOffset = header.offsetHeight * SITE_CONFIG.appearance.bannerStickyOffset;
    };

    const onScroll = () => {
        const scrollY  = window.scrollY;
        const offset   = Math.min(scrollY, maxOffset);

        // Banner slides up then locks
        header.style.top = `-${offset}px`;

        // Mobile nav tracks the bottom edge of the banner
        if (mobileNav) {
            const bannerVisibleBottom = header.offsetHeight - offset;
            mobileNav.style.top = `${bannerVisibleBottom}px`;
        }
    };

    const init = () => {
        calcMaxOffset();
        header.style.top = '0px';

        // Position mobile nav immediately below banner on load
        if (mobileNav) {
            mobileNav.style.top = `${header.offsetHeight}px`;
        }

        window.addEventListener('scroll', onScroll, { passive: true });
    };

    window.addEventListener('resize', () => {
        calcMaxOffset();
        onScroll();
    });

    if (bannerImg.complete) {
        init();
    } else {
        bannerImg.addEventListener('load', init);
    }
}
