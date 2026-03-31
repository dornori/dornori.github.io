import SITE_CONFIG from './config.js';

export function initStickyBanner() {
    const header = document.getElementById('main-header');
    const bannerImg = document.getElementById('banner-img');

    const updateHeaderStickiness = () => {
        const offset = header.offsetHeight * SITE_CONFIG.appearance.bannerStickyOffset;
        header.style.top = `-${offset}px`;
    };

    window.addEventListener('load', updateHeaderStickiness);
    window.addEventListener('resize', updateHeaderStickiness);
    if (bannerImg) bannerImg.onload = updateHeaderStickiness;
}
