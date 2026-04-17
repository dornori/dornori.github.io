import SITE_CONFIG from './config.js';

export function initStickyBanner() {
    const header = document.getElementById('main-header');
    const bannerImg = document.getElementById('banner-img');
    const mobileNav = document.getElementById('mobile-nav');
    if (!header || !bannerImg) return;

    bannerImg.onclick = () => window.location.href = SITE_CONFIG.appearance.root_url;

    let maxOffset = 0;

    const calcMaxOffset = () => {
        maxOffset = header.offsetHeight * SITE_CONFIG.appearance.bannerStickyOffset;
    };

    const onScroll = () => {
        const scrollY = window.scrollY;
        const offset = Math.min(scrollY, maxOffset);
        header.style.top = `-${offset}px`;

        if (mobileNav) {
            const bannerVisibleBottom = header.offsetHeight - offset;
            mobileNav.style.top = `${bannerVisibleBottom}px`;
        }
    };

    const init = () => {
        calcMaxOffset();
        header.style.top = '0px';
        if (mobileNav) mobileNav.style.top = `${header.offsetHeight}px`;
        window.addEventListener('scroll', onScroll, { passive: true });
    };

    window.addEventListener('resize', () => {
        calcMaxOffset();
        onScroll();
    });

    if (bannerImg.complete) init();
    else bannerImg.addEventListener('load', init);
}
