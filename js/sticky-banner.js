import SITE_CONFIG from './config.js';

export function initStickyBanner() {
    const header = document.getElementById('main-header');
    const bannerImg = document.getElementById('banner-img');

    if (!header || !bannerImg) return;

    // Apply pointer cursor to signal clickability
    bannerImg.style.cursor = 'pointer';

    // Navigation logic
    bannerImg.addEventListener('click', () => {
        window.location.href = SITE_CONFIG.appearance.root_url;
    });

    const updateHeaderStickiness = () => {
        const offset = header.offsetHeight * SITE_CONFIG.appearance.bannerStickyOffset;
        header.style.top = `-${offset}px`;
    };

    window.addEventListener('load', updateHeaderStickiness);
    window.addEventListener('resize', updateHeaderStickiness);
    
    if (bannerImg.complete) {
        updateHeaderStickiness();
    } else {
        bannerImg.onload = updateHeaderStickiness;
    }
}
