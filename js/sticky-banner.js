import SITE_CONFIG from './config.js';

export function initStickyBanner() {
    const header = document.getElementById('main-header');
    const bannerImg = document.getElementById('banner-img');
    if (!header || !bannerImg) return;

    bannerImg.onclick = () => window.location.href = SITE_CONFIG.appearance.root_url;

    const updateStickiness = () => {
        const offset = header.offsetHeight * SITE_CONFIG.appearance.bannerStickyOffset;
        header.style.top = `-${offset}px`;
    };

    window.addEventListener('load', updateStickiness);
    window.addEventListener('resize', updateStickiness);
    if (bannerImg.complete) updateStickiness();
}
