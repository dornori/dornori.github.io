// page-loader.js - YOUR ORIGINAL FILE, just make sure it uses base_path
import SITE_CONFIG from './config.js';
import { mountSlideshow } from './slideshow.js';
import { initEmbedForms } from './embed-form.js';

export function initPageLoader() {
    const homeView = document.getElementById('home-view');
    const pageView = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');

    function contentPath(page) {
        const lang = window.LANG || 'en';
        const basePath = SITE_CONFIG.appearance.base_path;
        return `${basePath}content/${lang}/${page.file}`;
    }

    window.loadHome = async () => {
        try {
            const lang = window.LANG || 'en';
            const basePath = SITE_CONFIG.appearance.base_path;
            const res = await fetch(`${basePath}content/${lang}/home.html`);
            if (!res.ok) throw new Error();
            const html = await res.text();
            homeView.innerHTML = html;
            homeView.querySelectorAll('.slideshow-root').forEach(mountSlideshow);
            initEmbedForms();
            homeView.classList.remove('hidden');
            pageView.classList.add('hidden');
        } catch (err) {
            console.error('Home load error:', err);
        }
    };

    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) return;

        try {
            const res = await fetch(contentPath(page));
            if (!res.ok) throw new Error();
            const html = await res.text();
            pageContent.innerHTML = html;
            pageContent.querySelectorAll('.slideshow-root').forEach(mountSlideshow);
            initEmbedForms();
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
        } catch (err) {
            console.error('Page load error:', err);
        }
    };

    window.showHome = () => {
        window.loadHome();
    };

    // Parse URL to determine what to show
    function handleInitialURL() {
        const basePath = SITE_CONFIG.appearance.base_path;
        let path = window.location.pathname;
        
        // Remove base_path from URL
        if (basePath !== '/' && path.startsWith(basePath)) {
            path = path.slice(basePath.length - 1);
        }
        
        const parts = path.split('/').filter(Boolean);
        const langCodes = SITE_CONFIG.languages.map(l => l.code);
        
        let slug = '';
        if (parts.length >= 1 && langCodes.includes(parts[0])) {
            slug = parts[1] || '';
        } else if (parts.length >= 1) {
            slug = parts[0];
        }
        
        if (slug && SITE_CONFIG.pages[slug]) {
            window.viewPage(slug);
        } else {
            window.loadHome();
        }
    }

    handleInitialURL();
}
