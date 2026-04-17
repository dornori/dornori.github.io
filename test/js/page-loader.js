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

        // Build the canonical URL using the language URL slug
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical     = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        if (slug) {
            const urlSlug = SITE_CONFIG.pageUrlSlug(slug, lang);
            canonical.href = lang === 'en'
                ? `${base}/en/${urlSlug}`
                : `${base}/${lang}/${urlSlug}`;
        } else {
            canonical.href = base;
        }

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
        setOG('og:url',   canonical.href);
        setOG('og:title', document.title);
        setOG('og:description', descTag.content);

        // hreflang alternates
        injectHreflangTags(slug);

        // Track current slug so setLang() can reload the right page
        window.CURRENT_SLUG = slug;
    }

    // ── CONTENT PATH ─────────────────────────────────────────────────────────
    function contentPath(page) {
        const lang  = window.LANG || 'en';
        const base  = SITE_CONFIG.appearance.base_path;
        return `${base}content/${lang}/${page.file}`;
    }

    // ── BUILD CLEAN URL for history pushState ─────────────────────────────────
    function pageUrl(slug, lang) {
        const base    = SITE_CONFIG.appearance.base_path;
        const urlSlug = SITE_CONFIG.pageUrlSlug(slug, lang);
        return lang === 'en'
            ? `${base}en/${urlSlug}/`
            : `${base}${lang}/${urlSlug}/`;
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

            const lang = window.LANG || 'en';
            window.history.pushState({ slug, lang }, '', pageUrl(slug, lang));

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
        const base = SITE_CONFIG.appearance.base_path;
        window.history.pushState({}, '', base);
        updateSEO('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── HANDLE DIRECT URL ON FIRST LOAD ──────────────────────────────────────
    // Supports:  /test/en/about/
    //            /test/nl/over-ons/
    //            /test/en/about  (no trailing slash)
    function handleInitialURL() {
        const basePath = SITE_CONFIG.appearance.base_path; // e.g. '/test/'
        const rawPath  = window.location.pathname;

        // Strip the base_path prefix so we only deal with the relative part
        let relativePath = rawPath;
        if (basePath && basePath !== '/' && rawPath.startsWith(basePath)) {
            relativePath = rawPath.slice(basePath.length);
        }

        const parts = relativePath
            .replace(/^\/+|\/+$/g, '') // strip leading/trailing slashes
            .split('/')
            .filter(Boolean);

        const langCodes = new Set(SITE_CONFIG.languages.map(l => l.code));

        let lang = null;
        let urlSegment = null;

        if (parts.length >= 2 && langCodes.has(parts[0])) {
            // e.g.  en/about  or  nl/over-ons
            lang       = parts[0];
            urlSegment = parts[1];
        } else if (parts.length === 1 && langCodes.has(parts[0])) {
            // e.g. just /en/ — show home in that language
            lang = parts[0];
        } else if (parts.length === 1) {
            // e.g. /about (no language prefix) — treat as English
            lang       = 'en';
            urlSegment = parts[0];
        }

        // If a different language was detected from the URL, override stored pref
        if (lang && lang !== window.LANG) {
            window.LANG = lang;
            document.documentElement.setAttribute('lang', lang);
            // Re-fetch translations for this lang
            const base = SITE_CONFIG.appearance.base_path;
            fetch(`${base}lang/${lang}.json`)
                .then(r => r.json())
                .then(t => {
                    window.T = t;
                    if (typeof window.renderNav    === 'function') window.renderNav();
                    if (typeof window.renderFooter === 'function') window.renderFooter();
                    if (urlSegment) {
                        const slug = SITE_CONFIG.canonicalSlug(urlSegment, lang) || urlSegment;
                        if (SITE_CONFIG.pages[slug]) {
                            window.viewPage(slug);
                        } else {
                            window.loadHome(); updateSEO('');
                        }
                    } else {
                        window.loadHome(); updateSEO('');
                    }
                })
                .catch(() => {
                    window.loadHome(); updateSEO('');
                });
            return; // async path handled above
        }

        if (urlSegment) {
            const detectedLang = lang || window.LANG || 'en';
            const slug = SITE_CONFIG.canonicalSlug(urlSegment, detectedLang) || urlSegment;
            if (SITE_CONFIG.pages[slug]) {
                window.viewPage(slug);
                return;
            }
        }

        window.loadHome();
        updateSEO('');
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
}
