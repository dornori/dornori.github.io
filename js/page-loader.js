import SITE_CONFIG from './config.js';

export function initPageLoader() {
    const homeView = document.getElementById('home-view');
    const pageView = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');

    // Function to show a sub-page
    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) return;

        try {
            const res = await fetch(page.file);
            if (!res.ok) throw new Error('File not found');
            const html = await res.text();
            
            pageContent.innerHTML = `<h1>${page.title}</h1>` + html;
            
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            pageContent.innerHTML = "<h1>Error</h1><p>Content could not be loaded.</p>";
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
        }
    };

    // Function to return home
    window.showHome = () => {
        pageView.classList.add('hidden');
        homeView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}
