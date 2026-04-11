import { mountSlideshow } from './slideshow.js';
import { initEmbedForms } from './embed-form.js';
import SITE_CONFIG from './config.js';

export function initPageLoader() {
    const pageContent = document.getElementById('page-content-inner');

    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) return;

        try {
            const res = await fetch(page.file);
            pageContent.innerHTML = await res.text();
            
            // Mount galleries and forms in the freshly injected content
            pageContent.querySelectorAll('.slideshow-root').forEach(mountSlideshow);
            initEmbedForms();

            document.getElementById('home-view').classList.add('hidden');
            document.getElementById('page-view').classList.remove('hidden');
            window.scrollTo(0, 0);
        } catch (err) {
            console.error("Page Load Error", err);
        }
    };
}
