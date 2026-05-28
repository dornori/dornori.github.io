// page-loader.js
import SITE_CONFIG from './config.js';
import ENV_CONFIG from './env-config.js';
import { mountSlideshow } from './slideshow.js';
import { injectHreflangTags, getSlug, canonicalSlug } from './i18n.js';
import { mountShopEmbeds } from './shop-loader.js';

// Rewrite absolute asset paths in injected content to use BASE_PATH
function rewriteContentPaths(container) {
    const base = SITE_CONFIG.appearance.base_path;
    if (!base || base === '/') return; // nothing to rewrite at root

    // src and srcset attributes: /assets/ → base + assets/
    container.querySelectorAll('[src]').forEach(el => {
        const s = el.getAttribute('src');
        if (s && s.startsWith('/') && !s.startsWith('//') && !s.startsWith(base)) {
            el.setAttribute('src', base + s.slice(1));
        }
    });
    container.querySelectorAll('[srcset]').forEach(el => {
        el.setAttribute('srcset', el.getAttribute('srcset').replace(
            /(^|,\s*)(\/(?!\/))([^ ,]+)/g,
            (m, pre, slash, rest) => pre + base + rest
        ));
    });
    // href attributes: only internal absolute paths (not http/mailto/#)
    container.querySelectorAll('[href]').forEach(el => {
        const h = el.getAttribute('href');
        if (h && h.startsWith('/') && !h.startsWith('//') && !h.startsWith(base)) {
            el.setAttribute('href', base + h.slice(1));
        }
    });
    // Inline onclick / data-href
    container.querySelectorAll('[data-href]').forEach(el => {
        const h = el.getAttribute('data-href');
        if (h && h.startsWith('/') && !h.startsWith('//')) {
            el.setAttribute('data-href', base + h.slice(1));
        }
    });
}


// ── GLOBAL SHOP CARD WIRER ────────────────────────────────────────────────────
const _pendingWire = [];
let   _shopReady   = false;

function _onShopReady() {
    _shopReady = true;
    _pendingWire.forEach(c => _doWireShopCards(c));
    _pendingWire.length = 0;
}

document.addEventListener('webshop:ready', _onShopReady);
if (typeof Shop !== 'undefined') _onShopReady();

function wireShopCards(container) {
    if (_shopReady && typeof Shop !== 'undefined') {
        _doWireShopCards(container);
    } else {
        _pendingWire.push(container);
    }
}

function _doWireShopCards(container) {
    if (typeof Shop === 'undefined') return;

    container.querySelectorAll('.webshop-product-card[data-product-id]').forEach(card => {
        if (card._wired) return;
        card._wired = true;

        const productId  = card.dataset.productId;
        const priceEl    = card.querySelector('[data-base-price]');
        const basePrice  = priceEl ? parseFloat(priceEl.dataset.basePrice) : 0;
        const titleEl    = card.querySelector('.webshop-card-title');
        const name       = titleEl ? titleEl.textContent.trim() : productId;

        let qty               = 1;
        let selectedVariantId = null;
        let selectedColor     = null;

        const variantBtns = card.querySelectorAll('.webshop-variant-btn:not([disabled])');
        variantBtns.forEach(btn => {
            if (btn.classList.contains('active')) selectedVariantId = btn.dataset.variantId;
            btn.addEventListener('click', () => {
                variantBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedVariantId = btn.dataset.variantId;
            });
        });

        const colorBtns = card.querySelectorAll('.webshop-color:not([disabled])');
        colorBtns.forEach(btn => {
            if (btn.classList.contains('webshop-color--active')) selectedColor = btn.dataset.color;
            btn.addEventListener('click', () => {
                colorBtns.forEach(b => b.classList.remove('webshop-color--active'));
                btn.classList.add('webshop-color--active');
                selectedColor = btn.dataset.color;
            });
        });

        const qtySpan = card.querySelector('.webshop-qty-val');
        card.querySelector('.webshop-qty-btn--minus')?.addEventListener('click', () => {
            qty = Math.max(1, qty - 1);
            if (qtySpan) qtySpan.textContent = qty;
        });
        card.querySelector('.webshop-qty-btn--plus')?.addEventListener('click', () => {
            qty = Math.min(99, qty + 1);
            if (qtySpan) qtySpan.textContent = qty;
        });

        card.querySelector('.webshop-card-quick-add')?.addEventListener('click', () => {
            Shop.addToCart({ id: productId, name, price: basePrice, weight: 0 }, 1, selectedVariantId, selectedColor);
            if (typeof Shop.toast === 'function') Shop.toast(name + ' added!');
        });

        card.querySelectorAll('.webshop-card-atc, .webshop-modal-atc').forEach(btn => {
            if (btn._wired) return;
            btn._wired = true;
            btn.addEventListener('click', () => {
                Shop.addToCart(
                    { id: productId, name, price: basePrice, weight: 0 },
                    qty, selectedVariantId, selectedColor
                );
                if (typeof Shop.toast === 'function')
                    Shop.toast(name + (Shop.t ? ' ' + Shop.t('added', 'added to cart') : ' added to cart'));
            });
        });

        if (priceEl) {
            document.addEventListener('currency:changed', () => { priceEl.textContent = Shop.fmt(basePrice); });
            priceEl.textContent = Shop.fmt(basePrice);
        }
    });

    container.querySelectorAll('[data-base-price]:not([data-currency-wired])').forEach(el => {
        el.dataset.currencyWired = '1';
        const base = parseFloat(el.dataset.basePrice);
        if (!isNaN(base)) {
            document.addEventListener('currency:changed', () => { el.textContent = Shop.fmt(base); });
            el.textContent = Shop.fmt(base);
        }
    });
}




export function initPageLoader() {
    const pageView    = document.getElementById('page-view');
    const pageContent = pageView;

    const fallbackLang = () => (SITE_CONFIG.languages && SITE_CONFIG.languages[0] ? SITE_CONFIG.languages[0].code : 'en');

    // ── SEO ──────────────────────────────────────────────────────────────────
    function updateSEO(slug = '') {
        const base = SITE_CONFIG.appearance.root_url;
        const lang = window.LANG || fallbackLang();

        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        if (slug) {
            const urlSlug = getSlug(window.T, slug);
            canonical.href = `${base}/${lang}/${urlSlug}/`;
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
        descTag.content = tPage?.description || 'Dornori — revolutionary outdoor lighting you build yourself.';

        const setOG = (prop, val) => {
            let tag = document.querySelector(`meta[property="${prop}"]`);
            if (!tag) { tag = document.createElement('meta'); tag.setAttribute('property', prop); document.head.appendChild(tag); }
            tag.setAttribute('content', val);
        };
        setOG('og:url',         canonical.href);
        setOG('og:title',       document.title);
        setOG('og:description', descTag.content);

        injectHreflangTags(slug, window.T);
        window.CURRENT_SLUG = slug;
    }

    // ── CONTENT PATH ─────────────────────────────────────────────────────────
    function contentPath(page) {
        const lang = window.LANG || fallbackLang();
        const base = SITE_CONFIG.appearance.base_path;
        return `${base}content/${lang}/${page.file}`;
    }

    // ── PAGE URL ─────────────────────────────────────────────────────────────
    function pageUrl(slug, lang, extra) {
        const base    = SITE_CONFIG.appearance.base_path;
        const urlSlug = getSlug(window.T, slug);
        return `${base}${lang}/${urlSlug}/${extra || ''}`;
    }

    // ── LOAD HOME ─────────────────────────────────────────────────────────────
    window.loadHome = async () => {
        const lang = window.LANG || fallbackLang();
        // Only skip the fetch when English content is already loaded in the correct language.
        const alreadyPopulated = pageView.querySelector('h2, .slideshow-root, .webshop-product-card');
        const loadedLang       = pageView.dataset.loadedLang || null;
        if (alreadyPopulated && loadedLang === lang) {
            rewriteContentPaths(pageView);
            pageView.querySelectorAll('.slideshow-root').forEach(mountSlideshow);

            wireShopCards(pageView);
            mountShopEmbeds(pageView);
            pageView.classList.remove('hidden');
            window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
            updateSEO('');
            document.dispatchEvent(new CustomEvent('home:ready'));
            return;
        }
        try {
            const base = SITE_CONFIG.appearance.base_path;
            const res  = await fetch(`${base}content/${lang}/home.html`);
            if (!res.ok) throw new Error();
            const html = await res.text();
            pageView.innerHTML = html;
            pageView.dataset.loadedLang = lang;   // ← record which lang is now displayed
        rewriteContentPaths(pageView);
            pageView.querySelectorAll('.slideshow-root').forEach(mountSlideshow);

            wireShopCards(pageView);
            mountShopEmbeds(pageView);
        } catch {
            // home.html may not exist for every language yet
            pageView.dataset.loadedLang = lang;
        }
        pageView.classList.remove('hidden');
        window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
        updateSEO('');
        document.dispatchEvent(new CustomEvent('home:ready'));
    };

    // ── SPINNER HELPERS ───────────────────────────────────────────────────────
    function showSpinner() {
        if (document.getElementById('page-loading-spinner')) return;
        const el = document.createElement('div');
        el.id = 'page-loading-spinner';
        el.innerHTML = '<div class="page-spinner"></div>';
        pageContent.innerHTML = '';
        pageContent.appendChild(el);
    }

    function removeSpinner() {
        const el = document.getElementById('page-loading-spinner');
        if (el) el.remove();
    }

    if (!document.getElementById('spinner-styles')) {
        const s = document.createElement('style');
        s.id = 'spinner-styles';
        s.textContent = '@keyframes page-spin{to{transform:rotate(360deg)}}' +
            '#page-loading-spinner{display:flex;justify-content:center;align-items:center;min-height:40vh;}' +
            '.page-spinner{width:36px;height:36px;border:3px solid var(--border,rgba(255,255,255,.15));' +
            'border-top-color:var(--accent,#a8d5b5);border-radius:50%;animation:page-spin 0.7s linear infinite;}';
        document.head.appendChild(s);
    }

    // ── VIEW PAGE ────────────────────────────────────────────────────────────
    window.viewPage = async (slug, productId, fromPopstate = false) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) { if (ENV_CONFIG.DEBUG) console.error(`Page "${slug}" not found in config`); return; }

        showSpinner();

        try {
            const res = await fetch(contentPath(page));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const html = await res.text();
            removeSpinner();

            pageContent.innerHTML = html;
            if (productId) window.__PRODUCT_ID__ = productId;
            rewriteContentPaths(pageContent);
            pageContent.querySelectorAll('script').forEach(orig => {
                // Skip scripts that try to load already-loaded core scripts
                if (orig.src && (
                    orig.src.includes('site-boot.js') ||
                    orig.src.includes('page-init.js') ||
                    orig.src.includes('shop.js')
                )) {
                    orig.remove();
                    return;
                }
                
                const s = document.createElement('script');
                [...orig.attributes].forEach(a => s.setAttribute(a.name, a.value));
                if (!orig.src) {
                    // Wrap inline scripts in IIFE to scope const/let declarations
                    // Prevents "Identifier already declared" errors on re-navigation
                    s.textContent = `(function(){${orig.textContent}})();`;
                }
                orig.replaceWith(s);
            });

            pageContent.querySelectorAll('.slideshow-root').forEach(mountSlideshow);

            wireShopCards(pageContent);
            mountShopEmbeds(pageContent);
            window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0;

            const lang = window.LANG || fallbackLang();
            const qs   = productId ? `?id=${productId}` : '';
            if (!fromPopstate) {
                window.history.pushState({ slug, lang, productId }, '', pageUrl(slug, lang, qs));
            }
            updateSEO(slug);
            document.dispatchEvent(new CustomEvent('page:ready'));

        } catch (err) {
            if (ENV_CONFIG.DEBUG) console.error('Page load error:', err);
            const T = window.T?.ui || {};
            removeSpinner();
            pageContent.innerHTML = `
                <h1>${T.errorTitle || 'Error'}</h1>
                <p>${T.errorMsg || 'Sorry, this content could not be loaded.'}</p>
                <p style="font-family:var(--font-mono);font-size:.8rem;color:var(--muted);">${err.message}</p>
                <button onclick="window.showHome()">${T.returnHome || 'Return Home'}</button>
            `;
            window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
        }
    };

    // ── SHOW HOME ────────────────────────────────────────────────────────────
    window.showHome = () => {
        window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
        const lang    = window.LANG || fallbackLang();
        const base    = SITE_CONFIG.appearance.base_path;
        window.history.pushState({ slug: '', lang }, '', `${base}${lang}/`);
        updateSEO('');
        window.loadHome();
    };

    // ── HANDLE DIRECT URL ON FIRST LOAD ──────────────────────────────────────
    function handleInitialURL() {
        if (window.__PAGE_SLUG__ && window.__PAGE_SLUG__ !== 'home') {
            const slug = window.__PAGE_SLUG__;
            if (SITE_CONFIG.pages[slug]) {
                // fromPopstate=true prevents viewPage from pushing a NEW history entry
                // on top of the one the browser already created for this URL
                window.viewPage(slug, null, true);
                return;
            }
        }

        const basePath   = SITE_CONFIG.appearance.base_path;
        const rawPath    = window.location.pathname;
        let relativePath = rawPath;
        if (basePath && basePath !== '/' && rawPath.startsWith(basePath)) {
            relativePath = rawPath.slice(basePath.length);
        }

        const parts      = relativePath.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
        const langCodes  = new Set(SITE_CONFIG.languages.map(l => l.code));

        let lang = null, urlSegment = null;
        if (parts.length >= 2 && langCodes.has(parts[0])) {
            lang = parts[0]; urlSegment = parts[1];
        } else if (parts.length === 1 && langCodes.has(parts[0])) {
            lang = parts[0];
        } else if (parts.length === 1) {
            lang = 'en'; urlSegment = parts[0];
        }

        if (urlSegment) {
            // Reverse-lookup using current lang bundle (window.T was loaded by initI18n)
            const slug = canonicalSlug(window.T, urlSegment) || urlSegment;
            if (SITE_CONFIG.pages[slug]) {
                const pid = new URLSearchParams(window.location.search).get('id') || null;
                window.viewPage(slug, pid);
                return;
            }
        }

        const base    = SITE_CONFIG.appearance.base_path;
        const initLang = lang || fallbackLang();
        window.history.replaceState({ slug: '', lang: initLang }, '', `${base}${initLang}/`);
        window.loadHome();
        updateSEO('');
    }

    window.addEventListener('popstate', (e) => {
        if (e.state?.slug) {
            // Restore a page view without pushing new history
            window.viewPage(e.state.slug, e.state.productId || null, true);
        } else {
            // Restore home view without pushing new history
            window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
            window.loadHome();
            updateSEO('');
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !pageView.classList.contains('hidden')) window.showHome();
    });

    // ── INTERCEPT PRODUCT LINKS ───────────────────────────────────────────────
    // ── INTERCEPT ALL INTERNAL NAVIGATION LINKS ─────────────────────────────
    // Handles any <a href> pointing to a URL within this site so navigation
    // stays within the SPA shell and the browser back button keeps working.
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (!a) return;
        // Let external, mailto:, tel: etc. through
        const href = a.getAttribute('href');
        if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;

        let url;
        try { url = new URL(a.href, window.location.href); } catch { return; }
        // Only handle same-origin links
        if (url.origin !== window.location.origin) return;

        const base = SITE_CONFIG.appearance.base_path;
        const pathname = url.pathname;

        // Strip base path to get a relative path like "en/product/" or "nl/winkel/"
        let rel = pathname;
        if (base && base !== '/' && rel.startsWith(base)) {
            rel = rel.slice(base.length);
        }
        rel = rel.replace(/^\/+|\/+$/g, ''); // trim slashes
        const parts = rel.split('/').filter(Boolean);

        // Must have at least lang + slug segment
        const langCodes = new Set((SITE_CONFIG.languages || []).map(l => l.code));
        if (parts.length < 1) return;

        const lang = langCodes.has(parts[0]) ? parts[0] : null;
        const urlSegment = lang ? parts[1] : parts[0];

        // Home URL: /en/ with no further segment
        if (lang && !urlSegment) {
            e.preventDefault();
            if (window.LANG !== lang) {
                window.setLang(lang);
            } else {
                window.showHome();
            }
            return;
        }

        if (!urlSegment) return;

        // Resolve URL slug to canonical page key
        const slug = canonicalSlug(window.T, urlSegment) || urlSegment;
        if (!SITE_CONFIG.pages[slug]) return; // unknown page — let browser handle it

        e.preventDefault();

        // Switch language silently if the link points to a different lang
        const switchLang = lang && lang !== (window.LANG || fallbackLang());
        if (switchLang) {
            // Update LANG first so viewPage fetches the right content file
            window.LANG = lang;
            localStorage.setItem(SITE_CONFIG.storageKeys.lang, lang);
            document.documentElement.setAttribute('lang', lang);
            import('./i18n.js').then(m => {
                m.loadLanguage(lang).then(T => {
                    window.T = T;
                    const pid = url.searchParams.get('id') || null;
                    window.viewPage(slug, pid);
                });
            }).catch(() => {
                const pid = url.searchParams.get('id') || null;
                window.viewPage(slug, pid);
            });
        } else {
            const pid = url.searchParams.get('id') || null;
            window.viewPage(slug, pid);
        }
    });

    handleInitialURL();
}
