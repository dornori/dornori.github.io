import SITE_CONFIG from './config_DRAFT.js';
import { mountSlideshow } from './slideshow.js';

export function initPageLoader() {
    const pageContent = document.getElementById('page-content-inner');

    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) return;

        try {
            const res = await fetch(page.file);
            const html = await res.text();
            pageContent.innerHTML = html;
            
            // Automatically find and mount all slideshows in the new HTML
            pageContent.querySelectorAll('.slideshow-root[data-images]').forEach(mountSlideshow);

            window.history.pushState({ slug }, page.title, `/${slug}`);
            document.getElementById('home-view').classList.add('hidden');
            document.getElementById('page-view').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Loader Error:', err);
        }
    };
}
