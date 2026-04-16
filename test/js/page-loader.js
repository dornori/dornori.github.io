// page-loader.js
import SITE_CONFIG from './config.js';
import { mountSlideshow } from './slideshow.js';
import { initEmbedForms }  from './embed-form.js';
import { injectHreflangTags, detectLangFromURL } from './i18n.js';

export function initPageLoader() {
    const homeView    = document.getElementById('home-view');
    const pageView    = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');

    // ── SEO ──────────────────────────────────────────────────────────────────
    function updateSEO(slug = '') {
        const base = SITE_CONFIG.appearance.root_url;
        const lang = window.LANG || 'en';
        const path = slug ? `/${slug}` : '';

        // Canonical — always points to the clean URL on the main domain
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical     = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = `${base}${path}`;

        // Title + description — read from window.T (lang JSON) so they're translated
        const tPage = window.T?.pages?.[slug];
        document.title = tPage
            ? `${tPage.title} — Dornori`
            : 'Dornori — Build Your Own Rising Star Lamp';

        let descTag = document.querySelector('meta[name="description"]');
        if (!descTag) {
            descTag      = document.createElement('meta');
            descTag.name = 'description';
            document.head.appendChild(descTag);
        }
        descTag.content = tPage?.description
            || 'Dornori — revolutionary outdoor lighting you build yourself.';

        // OG tags
        const setOG = (prop, val) => {
            let tag = document.querySelector(`meta[property="${prop}"]`);
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute('property', prop);
                document.head.appendChild(tag);
            }
            tag.setAttribute('content', val);
        };
        setOG('og:url',         `${base}${path}`);
        setOG('og:title',       document.title);
        setOG('og:description', descTag.content);

        // hreflang alternates
        injectHreflangTags(slug);

        // Track current slug so setLang() can reload the right page
        window.CURRENT_SLUG = slug;
    }

    // ── CONTENT PATH ─────────────────────────────────────────────────────────
    // All content lives at:  content/{lang}/{file}
    function contentPath(page) {
        const lang = window.LANG || 'en';
        const base = SITE_CONFIG.appearance.base_path;
        return `${base}content/${lang}/${page.file}`;
    }

    // ── LOAD HOME ─────────────────────────────────────────────────────────────
    window.loadHome = async () => {
        try {
            const lang = window.LANG || 'en';
            const base = SITE_CONFIG.appearance.base_path;
            const res  = await fetch(`${base}content/${lang}/home.html`);
            if (!res.ok) throw new Error();
            const html = await res.text();
            homeView.innerHTML = html;
            homeView.querySelectorAll('.slideshow-root').forEach(mountSlideshow);
            initEmbedForms();
        } catch {
            // Silently fail — home.html may not be translated yet
        }
    };

    // ── VIEW PAGE ────────────────────────────────────────────────────────────
    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) {
            console.error(`Page "${slug}" not found in config`);
            return;
        }

        try {
            const res = await fetch(contentPath(page));
            if (!res.ok) throw new Error(`Failed to load ${contentPath(page)}`);

            const html = await res.text();

            pageContent.innerHTML = html;
            pageContent.querySelectorAll('.slideshow-root').forEach(mountSlideshow);
            initEmbedForms();

            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');

            // Push a clean URL — lang prefix only for non-English
            const lang = window.LANG || 'en';
            const base = SITE_CONFIG.appearance.base_path;
            const FALLBACK = SITE_CONFIG.languages[0].code;
            const url  = lang === FALLBACK
                ? `${base}${slug}`
                : `${base}${lang}/${slug}`;
            window.history.pushState({ slug, lang }, '', url);

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

    // ── SHOW HOME ────────────────────────────────────────────────────────────
    window.showHome = () => {
        pageView.classList.add('hidden');
        homeView.classList.remove('hidden');

        const lang     = window.LANG || 'en';
        const base     = SITE_CONFIG.appearance.base_path;
        const FALLBACK = SITE_CONFIG.languages[0].code;
        const url      = lang === FALLBACK ? base : `${base}${lang}/`;
        window.history.pushState({}, '', url);

        window.CURRENT_SLUG = '';
        updateSEO('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── HANDLE DIRECT URL ON FIRST LOAD ──────────────────────────────────────
    // Parses the path after stripping base_path.
    // Supported patterns:
    //   /              → home (English)
    //   /about         → about page (English)
    //   /de/           → home (German)
    //   /de/about      → about page (German)
    //   /test/         → home (English, base_path = /test/)
    //   /test/de/about → about page (German, base_path = /test/)
    function handleInitialURL() {
        const base     = SITE_CONFIG.appearance.base_path; // e.g. '/test/'
        const FALLBACK = SITE_CONFIG.languages[0].code;
        const langs    = new Set(SITE_CONFIG.languages.map(l => l.code));

        // Strip base_path from pathname
        let path = window.location.pathname;
        if (base && base !== '/') {
            // base is like '/test/' — strip without the trailing slash for comparison
            const baseNoTrail = base.endsWith('/') ? base.slice(0, -1) : base;
            if (path.startsWith(baseNoTrail)) {
                path = path.slice(baseNoTrail.length) || '/';
            }
        }

        // Split into clean parts
        const parts = path.replace(/^\//, '').split('/').filter(Boolean);

        let slug = '';
        let langFromURL = '';

        if (parts.length >= 2 && langs.has(parts[0])) {
            // e.g. ['de', 'about']
            langFromURL = parts[0];
            slug        = parts[1];
        } else if (parts.length === 1) {
            if (langs.has(parts[0])) {
                // e.g. ['de'] — language home
                langFromURL = parts[0];
                slug        = '';
            } else {
                // e.g. ['about'] — English page
                slug = parts[0];
            }
        }
        // parts.length === 0 → root home, slug stays ''

        // If the URL specified a language that differs from what initI18n() set,
        // switch language now (translations already loaded so just update state).
        // initI18n() already called detectLangFromURL() so window.LANG is correct,
        // but we sync just in case.
        if (langFromURL && langFromURL !== window.LANG) {
            // This shouldn't normally happen because initI18n() reads URL first,
            // but guard anyway.
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

    // ── BACK / FORWARD ───────────────────────────────────────────────────────
    window.addEventListener('popstate', (e) => {
        if (e.state?.slug) {
            // Restore language if it was stored in history state
            if (e.state.lang && e.state.lang !== window.LANG) {
                window.setLang(e.state.lang).then(() => window.viewPage(e.state.slug));
            } else {
                window.viewPage(e.state.slug);
            }
        } else {
            window.showHome();
        }
    });

    // ── ESCAPE KEY ───────────────────────────────────────────────────────────
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !pageView.classList.contains('hidden')) {
            window.showHome();
        }
    });

    // Run on boot
    handleInitialURL();
    updateSEO('');
}

// Auto-init when imported directly
initPageLoader();
