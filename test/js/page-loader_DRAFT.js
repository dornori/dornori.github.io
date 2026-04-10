import { mountSlideshow } from './slideshow.js';
import SITE_CONFIG from './config_DRAFT.js';

export function initPageLoader() {
    const pageContent = document.getElementById('page-content-inner');

    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) return;

        try {
            const res = await fetch(page.file);
            pageContent.innerHTML = await res.text();
            
            // Just scan the new HTML and mount the slideshows
            pageContent.querySelectorAll('.slideshow-root').forEach(mountSlideshow);

            document.getElementById('home-view').classList.add('hidden');
            document.getElementById('page-view').classList.remove('hidden');
            window.scrollTo(0, 0);
        } catch (err) {
            console.error("Page Load Error", err);
        }
    };
}
