// page-loader.js
import SITE_CONFIG from './config.js';
import { mountSlideshow } from './slideshow.js';
import { initEmbedForms }  from './embed-form.js';
import { injectHreflangTags } from './i18n.js';

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

        // Title + description
        const page = SITE_CONFIG.pages[slug];
        document.title = page
            ? `${page.title} — Dornori`
            : 'Dornori — Build Your Own Rising Star Lamp';

        let descTag = document.querySelector('meta[name="description"]');
        if (!descTag) {
            descTag      = document.createElement('meta');
            descTag.name = 'description';
            document.head.appendChild(descTag);
        }
        descTag.content = page?.description
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
        setOG('og:url',   `${base}${path}`);
        setOG('og:title', document.title);
        setOG('og:description', descTag.content);

        // hreflang alternates
        injectHreflangTags(slug);

        // Track current slug so setLang() can reload the right page
        window.CURRENT_SLUG = slug;
    }

    // ── CONTENT PATH ─────────────────────────────────────────────────────────
    // All content lives at:  content/{lang}/{file}
    // The `file` in config is just the filename, e.g. 'about-us.html'
    function contentPath(page) {
        const lang  = window.LANG || 'en';
        const base  = SITE_CONFIG.appearance.base_path;
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

            // Push a clean URL — use base_path prefix
            const lang = window.LANG || 'en';
            const base = SITE_CONFIG.appearance.base_path;
            const url  = lang === 'en'
                ? `${base}${slug}`
                : `${base}${lang}/${slug}`;
            window.history.pushState({ slug, lang }, page.title, url);

            updateSEO(slug);
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error('Page load error:', err);
            pageContent.innerHTML = `
                <h1>Error</h1>
                <p>Sorry, this content could not be loaded.</p>
                <button onclick="window.showHome()">Return Home</button>
            `;
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
        }
    };

    // ── SHOW HOME ────────────────────────────────────────────────────────────
    window.showHome = () => {
        pageView.classList.add('hidden');
        homeView.classList.remove('hidden');
        const base = SITE_CONFIG.appearance.base_path;
        window.history.pushState({}, '', base);
        updateSEO('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── HANDLE DIRECT URL ON FIRST LOAD ──────────────────────────────────────
    // Works with GitHub Pages 404.html redirect trick.
    // URL patterns supported:  /about  or  /de/about
    function handleInitialURL() {
        const parts = window.location.pathname
            .replace(/^\//, '')   // strip leading slash
            .split('/')
            .filter(Boolean);

        // Try to detect  /{lang}/{slug}  or just  /{slug}
        const langs   = new Set(SITE_CONFIG.languages.map(l => l.code));
        let slug = '';
        if (parts.length >= 2 && langs.has(parts[0])) {
            slug = parts[1];
        } else if (parts.length === 1) {
            slug = parts[0];
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
            window.viewPage(e.state.slug);
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
