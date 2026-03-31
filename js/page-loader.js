import SITE_CONFIG from './config.js';

/**
 * PAGE LOADER MODULE
 * Swaps the center content between Home (Newsletter) and Sub-pages.
 */
export function initPageLoader() {
    const homeView = document.getElementById('home-view');
    const pageView = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');

    // EXPOSE TO WINDOW for onclick attributes in HTML
    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) return;

        try {
            const res = await fetch(page.file);
            if (!res.ok) throw new Error('File not found');
            const html = await res.text();
            
            // Inject content
            pageContent.innerHTML = `<h1>${page.title}</h1>` + html;
            
            // Toggle visibility
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
            
            // Scroll to top of content
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error("Dornori Engine: Page load failed", err);
            pageContent.innerHTML = "<h1>Error</h1><p>The requested content could not be loaded. Please try again later.</p>";
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
        }
    };

    window.showHome = () => {
        pageView.classList.add('hidden');
        homeView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Close page view on Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === "Escape" && !pageView.classList.contains('hidden')) {
            window.showHome();
        }
    });
}
