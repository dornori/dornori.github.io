import SITE_CONFIG from './config.js';
import { mountSlideshow } from './slideshow.js';
import { initEmbedForms } from './embed-form.js';
import { injectHreflangTags } from './i18n.js';

export function initPageLoader() {
    const homeView = document.getElementById('home-view');
    const pageView = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');

    function updateSEO(slug = '') {
        const lang = window.LANG || 'en';
        const prefix = SITE_CONFIG.appearance.getLangPrefix(lang);
        const path = slug ? `/${slug}/` : '/';

        // Update canonical, title, description, etc.
        const base = SITE_CONFIG.appearance.root_url;
        const canonical = document.querySelector('link[rel="canonical"]') || document.createElement('link');
        canonical.rel = 'canonical';
        canonical.href = `${base}${prefix}${path}`;
        if (!canonical.parentNode) document.head.appendChild(canonical);

        window.CURRENT_SLUG = slug;
        injectHreflangTags(slug);
    }

    window.viewPage = (slug) => {
        const lang = window.LANG || 'en';
        const prefix = SITE_CONFIG.appearance.getLangPrefix(lang);
        window.location.href = `${prefix}/${slug}/`;
    };

    window.showHome = () => {
        const lang = window.LANG || 'en';
        const prefix = SITE_CONFIG.appearance.getLangPrefix(lang);
        window.location.href = `${prefix}/`;
    };

    // Handle direct URL access (for static files)
    function handleInitialURL() {
        const path = window.location.pathname.replace(SITE_CONFIG.appearance.base_path, '');
        const parts = path.split('/').filter(Boolean);
        let lang = 'en';
        let slug = '';

        if (parts.length >= 1 && SITE_CONFIG.languages.some(l => l.code === parts[0])) {
            lang = parts[0];
            slug = parts[1] || '';
        } else if (parts.length >= 1) {
            slug = parts[0];
        }

        window.LANG = lang;
        document.documentElement.setAttribute('lang', lang);

        if (slug && SITE_CONFIG.pages[slug]) {
            // For static pages, we rely on the server serving index.html
            // JS can still run for interactivity
            updateSEO(slug);
        } else {
            updateSEO('');
        }
    }

    window.addEventListener('popstate', handleInitialURL);

    handleInitialURL();
    updateSEO('');
}

initPageLoader();