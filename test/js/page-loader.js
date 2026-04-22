// page-loader.js
import SITE_CONFIG from './config.js';
import { mountSlideshow } from './slideshow.js';
import { initEmbedForms }  from './embed-form.js';
import { injectHreflangTags } from './i18n.js';
import { mountShopEmbeds } from './shop-loader.js';

export function initPageLoader() {
    const homeView    = document.getElementById('home-view');
    const pageView    = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');

    // ── SEO ──────────────────────────────────────────────────────────────────
    function updateSEO(slug = '') {
        const base = SITE_CONFIG.appearance.root_url;
        const lang = window.LANG || 'en';

        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        if (slug) {
            const urlSlug = SITE_CONFIG.pageUrlSlug(slug, lang);
            canonical.href = lang === 'en'
                ? `${base}/en/${urlSlug}/`
                : `${base}/${lang}/${urlSlug}/`;
        } else {
            canonical.href = base + '/';
        }

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
        descTag.content = tPage?.description
            || 'Dornori — revolutionary outdoor lighting you build yourself.';

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

        injectHreflangTags(slug);
        window.CURRENT_SLUG = slug;
    }

    // ── CONTENT PATH ─────────────────────────────────────────────────────────
    function contentPath(page) {
        const lang = window.LANG || 'en';
        const base = SITE_CONFIG.appearance.base_path;
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
            mountShopEmbeds(homeView).catch(() => {});
        } catch {
            // Silently fail — home.html may not be translated yet
        }
        homeView.classList.remove('hidden');
        pageView.classList.add('hidden');
        const base = SITE_CONFIG.appearance.base_path;
        window.history.replaceState({}, '', base);
        updateSEO('');
    };

    // ── SHOP PAGE RENDERER ────────────────────────────────────────────────────
    // Waits for lumio:ready then calls Shop.renderShop / Cart render.
    async function renderShopPage(slug) {
        const base = SITE_CONFIG.appearance.base_path;

        // Show loading state immediately
        pageContent.innerHTML = `
            <div style="text-align:center;padding:80px 20px;">
                <div style="display:inline-block;width:36px;height:36px;border:3px solid var(--border);
                            border-radius:50%;border-top-color:var(--accent);
                            animation:spin .8s linear infinite;"></div>
                <p style="margin-top:20px;font-family:var(--font-mono);font-size:.8rem;
                           color:var(--text-muted);">Loading shop…</p>
            </div>`;
        homeView.classList.add('hidden');
        pageView.classList.remove('hidden');

        // Hide "Return Home" bar on shop/cart pages — they have their own back nav
        const returnBar = pageView.querySelector('[style*="margin-top: 50px"], [style*="margin-top:50px"]');
        if (returnBar) returnBar.style.display = 'none';

        // Wait for lumio:booted (fully initialised) or lumio:ready as fallback
        await new Promise(resolve => {
            if (typeof Shop !== 'undefined' && typeof Currency !== 'undefined') { resolve(); return; }
            let resolved = false;
            const done = () => { if (!resolved) { resolved = true; resolve(); } };
            document.addEventListener('lumio:booted', done, { once: true });
            document.addEventListener('lumio:ready',  done, { once: true });
            setTimeout(done, 10000);
        });

        if (typeof Shop === 'undefined') {
            pageContent.innerHTML = `<p style="padding:40px;font-family:var(--font-mono);color:var(--text-muted);">
                Shop could not be loaded. Please refresh.</p>`;
            return;
        }

        if (slug === 'cart') {
            // ── Cart page: load the cart.html content from the shop directory ──
            try {
                const res  = await fetch(base + 'shop/cart.html');
                const html = await res.text();

                // Extract just the <main> content from cart.html, stripping its
                // standalone <head>, <header>, and <script> bootstrap tags since
                // the scripts are already loaded globally by shop-loader.js
                const parser  = new DOMParser();
                const doc     = parser.parseFromString(html, 'text/html');
                const main    = doc.querySelector('main.lumio-page-main');

                if (main) {
                    pageContent.innerHTML = main.outerHTML;
                } else {
                    // Fallback: grab everything inside <body>, strip header
                    const body = doc.body;
                    const hdr  = body.querySelector('.lumio-page-header');
                    if (hdr) hdr.remove();
                    // Remove the standalone bootstrap <script> tags
                    body.querySelectorAll('script').forEach(s => s.remove());
                    pageContent.innerHTML = body.innerHTML;
                }

                // Re-run any inline <script> tags that were in the cart body
                // by extracting and eval-ing the lumio:ready listener block
                const scripts = doc.querySelectorAll('script:not([src])');
                scripts.forEach(origScript => {
                    const src = origScript.textContent;
                    // Skip the bootstrap loader (already loaded)
                    if (src.includes('loadScript') || src.includes('CONFIG.modules')) return;
                    const s = document.createElement('script');
                    s.textContent = src;
                    document.body.appendChild(s);
                });

                // Fire lumio:ready again so the cart listener wakes up
                document.dispatchEvent(new Event('lumio:ready'));

            } catch (e) {
                pageContent.innerHTML = `<p style="padding:40px;font-family:var(--font-mono);">
                    Cart could not be loaded. <a href="${base}shop/cart.html" style="color:var(--accent);">Open cart directly</a></p>`;
            }
        } else {
            // ── Shop page: use Shop.renderShop() ──────────────────────────────
            pageContent.innerHTML = `<div id="shop-embed-root"></div>`;
            try {
                await Shop.loadProducts();
                Shop.renderShop('shop-embed-root', {
                    cartUrl: '#',   // handled by goToCart()
                    onCartClick: () => window.viewPage('cart'),
                });
            } catch (e) {
                console.error('[page-loader] shop render error:', e);
                pageContent.innerHTML = `<p style="padding:40px;font-family:var(--font-mono);color:var(--text-muted);">
                    Shop could not be loaded. Please refresh.</p>`;
            }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ── VIEW PAGE ────────────────────────────────────────────────────────────
    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) {
            console.error(`Page "${slug}" not found in config`);
            return;
        }

        // ── Restore "Return Home" bar visibility for normal pages ─────────────
        const returnBar = pageView.querySelector('[style*="margin-top: 50px"], [style*="margin-top:50px"]');
        if (returnBar) returnBar.style.display = '';

        // ── Shop & cart pages bypass the normal HTML fetch ────────────────────
        if (page.isShop || page.isCart) {
            const lang = window.LANG || 'en';
            window.history.replaceState({ slug, lang }, '', pageUrl(slug, lang));
            updateSEO(slug);
            await renderShopPage(slug);
            return;
        }

        const fetchUrl = contentPath(page);

        try {
            const res = await fetch(fetchUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${fetchUrl}`);

            const html = await res.text();

            // Remove the static loading spinner if present
            const spinner = document.getElementById('page-loading-spinner');
            if (spinner) spinner.remove();

            pageContent.innerHTML = html;
            pageContent.querySelectorAll('.slideshow-root').forEach(mountSlideshow);
            initEmbedForms();

            // Render any shop product embeds declared in this content fragment
            mountShopEmbeds(pageContent).catch(() => {});

            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');

            const lang = window.LANG || 'en';
            window.history.replaceState({ slug, lang }, '', pageUrl(slug, lang));

            updateSEO(slug);
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error('Page load error:', err);
            const T = window.T?.ui || {};

            const spinner = document.getElementById('page-loading-spinner');
            if (spinner) spinner.remove();

            pageContent.innerHTML = `
                <h1>${T.errorTitle || 'Error'}</h1>
                <p>${T.errorMsg || 'Sorry, this content could not be loaded.'}</p>
                <p style="font-family:var(--font-mono);font-size:.8rem;color:var(--muted);">${err.message}</p>
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
        window.loadHome();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── HANDLE DIRECT URL ON FIRST LOAD ──────────────────────────────────────
    // Priority 1: use __PAGE_SLUG__ baked into the HTML shell at build time
    // Priority 2: parse the URL path
    function handleInitialURL() {
        // Fast path: shell tells us exactly what page this is
        if (window.__PAGE_SLUG__) {
            const slug = window.__PAGE_SLUG__;
            if (SITE_CONFIG.pages[slug]) {
                window.viewPage(slug);
                return;
            }
        }

        // Fallback: parse the URL
        const basePath    = SITE_CONFIG.appearance.base_path; // e.g. '/test/'
        const rawPath     = window.location.pathname;

        let relativePath = rawPath;
        if (basePath && basePath !== '/' && rawPath.startsWith(basePath)) {
            relativePath = rawPath.slice(basePath.length);
        }

        const parts = relativePath
            .replace(/^\/+|\/+$/g, '')
            .split('/')
            .filter(Boolean);

        const langCodes = new Set(SITE_CONFIG.languages.map(l => l.code));

        let lang = null;
        let urlSegment = null;

        if (parts.length >= 2 && langCodes.has(parts[0])) {
            lang       = parts[0];
            urlSegment = parts[1];
        } else if (parts.length === 1 && langCodes.has(parts[0])) {
            lang = parts[0];
        } else if (parts.length === 1) {
            lang       = 'en';
            urlSegment = parts[0];
        }

        if (urlSegment) {
            const detectedLang = lang || window.LANG || 'en';
            const slug = SITE_CONFIG.canonicalSlug(urlSegment, detectedLang) || urlSegment;
            if (SITE_CONFIG.pages[slug]) {
                window.viewPage(slug);
                return;
            }
        }

        // No page detected — show home
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

    handleInitialURL();
}
