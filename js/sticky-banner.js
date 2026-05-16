import SITE_CONFIG from './config.js';

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

    const START_PCT = 13;   // logo width at top (matches CSS)
    const END_PCT   = 8;    // logo width when fully scrolled
    let maxOffset   = 0;
    let initialized = false;

    function calcMaxOffset() {
        const h = header.getBoundingClientRect().height || header.offsetHeight;
        maxOffset = h * SITE_CONFIG.appearance.bannerStickyOffset;
    }

    function applyScroll() {
        if (!initialized || maxOffset <= 0) return;
        const offset   = Math.min(window.scrollY, maxOffset);
        const progress = offset / maxOffset;              // 0 → 1

        header.style.top = `-${offset}px`;

        if (logoWrap) {
            logoWrap.style.width = `${START_PCT - (START_PCT - END_PCT) * progress}%`;
        }

        if (mobileNav) {
            mobileNav.style.top = `${header.offsetHeight - offset}px`;
        }
    }

    function setup() {
        calcMaxOffset();
        if (maxOffset <= 0) {
            // Layout not ready yet — retry after a frame
            requestAnimationFrame(setup);
            return;
        }
        initialized = true;
        header.style.top = '0px';
        if (mobileNav) mobileNav.style.top = `${header.offsetHeight}px`;
        window.addEventListener('scroll', applyScroll, { passive: true });
        applyScroll();
    }

    window.addEventListener('resize', () => { calcMaxOffset(); applyScroll(); });

    // Wait for image to have real dimensions before measuring the header.
    // The image src is injected by site-boot.js on DOMContentLoaded (which has
    // already fired by the time this ES-module code runs), so src is already set.
    if (bannerImg.complete && bannerImg.naturalWidth > 0) {
        // Cached / already loaded — wait two frames for layout to settle
        requestAnimationFrame(() => requestAnimationFrame(setup));
    } else {
        bannerImg.addEventListener('load', () => {
            requestAnimationFrame(() => requestAnimationFrame(setup));
        }, { once: true });
    }
}
