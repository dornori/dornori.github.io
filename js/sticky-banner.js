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
    const logoWrap  = document.querySelector('.billboard-logo-wrap');
    if (!header || !bannerImg) return;

    bannerImg.onclick = (e) => {
        e.stopPropagation();
        if (typeof window.showHome === 'function') window.showHome();
        else window.location.href = SITE_CONFIG.appearance.base_path + (window.LANG || 'en') + '/';
    };

    let maxOffset = 0;
    let scrollListenerAdded = false;

    const calcMaxOffset = () => {
        maxOffset = header.offsetHeight * SITE_CONFIG.appearance.bannerStickyOffset;
    };

    const onScroll = () => {
        const scrollY  = window.scrollY;
        const offset   = Math.min(scrollY, maxOffset);

        // Banner slides up then locks
        header.style.top = `-${offset}px`;

        // Logo scales from 13% to 8% based on scroll progress
        if (logoWrap) {
            const progress = maxOffset > 0 ? Math.min(offset / maxOffset, 1) : 0;
            const startSize = 13;
            const endSize = 8;
            const currentSize = startSize - (startSize - endSize) * progress;
            logoWrap.style.width = `${currentSize}%`;
        }

        // Mobile nav tracks the bottom edge of the banner
        if (mobileNav) {
            const bannerVisibleBottom = header.offsetHeight - offset;
            mobileNav.style.top = `${bannerVisibleBottom}px`;
        }
    };

    const init = () => {
        calcMaxOffset();
        header.style.top = '0px';

        if (mobileNav) {
            mobileNav.style.top = `${header.offsetHeight}px`;
        }

        if (!scrollListenerAdded) {
            scrollListenerAdded = true;
            window.addEventListener('scroll', onScroll, { passive: true });
        }

        onScroll();
    };

    window.addEventListener('resize', () => {
        calcMaxOffset();
        onScroll();
    });

    // Called once the image has its natural dimensions so header.offsetHeight is real
    const onImageReady = () => {
        requestAnimationFrame(() => init());
    };

    if (bannerImg.src && bannerImg.complete && bannerImg.naturalWidth > 0) {
        // Image already loaded
        onImageReady();
    } else {
        // Wait for load — covers both: src already set (loading) and src not yet set (injected later)
        bannerImg.addEventListener('load', onImageReady, { once: true });
    }
}
