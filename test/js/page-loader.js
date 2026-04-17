import SITE_CONFIG from './config.js';
import { mountSlideshow } from './slideshow.js';
import { initEmbedForms } from './embed-form.js';
import { injectHreflangTags } from './i18n.js';

export function initPageLoader() {
    const homeView    = document.getElementById('home-view');
    const pageView    = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');

    function buildCleanURL(slug = '') {
        const lang = window.LANG || SITE_CONFIG.languages[0].code;
        const base = SITE_CONFIG.appearance.base_path;
        const fallback = SITE_CONFIG.languages[0].code;
        const path = slug ? `${slug}/` : '';
        return lang === fallback ? `${base}${path}` : `${base}${lang}/${path}`;
    }

    function updateSEO(slug = '') {
        const base = SITE_CONFIG.appearance.root_url;
        const url = buildCleanURL(slug);

        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = `${base}${slug ? '/' + slug + '/' : '/'}`;

        const tPage = window.T?.pages?.[slug];
        document.title = tPage 
            ? `${tPage.title} — Dornori` 
            : 'Dornori — Build Your Own Rising Star Lamp';

        let descTag = document.querySelector('meta[name="description"]');
        if (!descTag) {
            descTag = document.createElement('meta');
            descTag.name = 'description';
            document.head.appendChild(descTag);
        }
        descTag.content = tPage?.description || 'Dornori — Build your own Star-A rising kinetic lamp.';

        const setOG = (prop, val) => {
            let tag = document.querySelector(`meta[property="${prop}"]`);
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute('property', prop);
                document.head.appendChild(tag);
            }
            tag.content = val;
        };
        setOG('og:url', url);
        setOG('og:title', document.title);
        setOG('og:description', descTag.content);

        injectHreflangTags(slug);
        window.CURRENT_SLUG = slug;
    }

    window.loadHome = async () => {
        homeView.classList.remove('hidden');
        pageView.classList.add('hidden');
        updateSEO('');
    };

    window.viewPage = async (slug) => {
        if (!SITE_CONFIG.pages[slug]) return;

        try {
            const base = SITE_CONFIG.appearance.base_path;
            const lang = window.LANG || SITE_CONFIG.languages[0].code;
            const path = slug ? `${slug}/` : '';
            const full = lang === SITE_CONFIG.languages[0].code 
                ? `${base}${path}` 
                : `${base}${lang}/${path}`;

            const res = await fetch(full + 'content.html');
            if (!res.ok) throw new Error();

            const html = await res.text();
            pageContent.innerHTML = html;

            pageContent.querySelectorAll('.slideshow-root').forEach(mountSlideshow);
            initEmbedForms();

            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');

            const cleanUrl = buildCleanURL(slug);
            window.history.pushState({ slug }, '', cleanUrl);

            updateSEO(slug);
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error('Page load error:', err);
            const T = window.T?.ui || {};
            pageContent.innerHTML = `
                <h1>${T.errorTitle || 'Error'}</h1>
                <p>${T.errorMsg || 'Sorry, this content could not be loaded.'}</p>
                <button onclick="window.showHome()">${T.returnHome || 'Return Home'}</button>
            `;
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
        }
    };

    window.showHome = () => {
        pageView.classList.add('hidden');
        homeView.classList.remove('hidden');
        const cleanUrl = buildCleanURL('');
        window.history.pushState({}, '', cleanUrl);
        window.CURRENT_SLUG = '';
        updateSEO('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function handleInitialURL() {
        const base = SITE_CONFIG.appearance.base_path;
        let path = window.location.pathname;

        if (base && base !== '/' && path.startsWith(base.slice(0, -1))) {
            path = path.slice(base.length - 1) || '/';
        }

        const parts = path.replace(/^\//, '').split('/').filter(Boolean);
        let slug = '';
        let langFromURL = '';

        if (parts.length >= 2 && SITE_CONFIG.languages.some(l => l.code === parts[0])) {
            langFromURL = parts[0];
            slug = parts[1];
        } else if (parts.length === 1) {
            if (SITE_CONFIG.languages.some(l => l.code === parts[0])) {
                langFromURL = parts[0];
            } else {
                slug = parts[0];
            }
        }

        if (langFromURL && langFromURL !== window.LANG) {
            window.LANG = langFromURL;
            document.documentElement.setAttribute('lang', langFromURL);
        }

        if (slug && SITE_CONFIG.pages[slug]) {
            window.viewPage(slug);
        } else {
            window.loadHome();
            updateSEO('');
        }
    }

    window.addEventListener('popstate', (e) => {
        if (e.state?.slug) {
            window.viewPage(e.state.slug);
        } else {
            window.showHome();
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !pageView.classList.contains('hidden')) {
            window.showHome();
        }
    });

    handleInitialURL();
    updateSEO('');
}

initPageLoader();
