// page-loader_DRAFT.js
import SITE_CONFIG        from './config_DRAFT.js';
import { mountSlideshow } from './slideshow.js';

export function initPageLoader() {
    const homeView    = document.getElementById('home-view');
    const pageView    = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');
    const emailInput  = document.querySelector('#waitlist-form input[type="email"]');

    function initPageSlideshows() {
        // Find any .slideshow-root with data attributes that hasn't been mounted yet
        pageContent.querySelectorAll('.slideshow-root[data-images]').forEach(root => {
            mountSlideshow(root);
        });
    }

    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) return;

        try {
            const res = await fetch(page.file);
            if (!res.ok) throw new Error(`Failed to load ${page.file}`);
            const html = await res.text();

            pageContent.innerHTML = html;
            
            // Auto-init all slideshows in the new HTML
            initPageSlideshows();

            window.history.pushState({ slug }, page.title, `/${slug}`);
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error('Page load error:', err);
            pageContent.innerHTML = `<h1>Error</h1><p>${err.message}</p>`;
        }
    };

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        const slug = link.getAttribute('data-page');
        if (slug && SITE_CONFIG.pages[slug]) {
            e.preventDefault();
            window.viewPage(slug);
        }
    });

    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.slug) window.viewPage(e.state.slug);
        else window.showHome();
    });

    window.showHome = () => {
        pageView.classList.add('hidden');
        homeView.classList.remove('hidden');
        window.history.pushState({}, '', '/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}
