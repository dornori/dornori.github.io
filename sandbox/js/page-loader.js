// page-loader.js
import SITE_CONFIG from './config.js';
import { mountSlideshow } from './slideshow.js';
import { initEmbedForms }  from './embed-form.js';
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


// ── SCROLL LOCK ───────────────────────────────────────────────────────────────
// Hide scrollbar until content is rendered, reveal on first user scroll.
function lockScroll() {
    document.documentElement.style.overflow = 'hidden';
}
function unlockScroll() {
    document.documentElement.style.overflow = '';
    window.addEventListener('scroll', () => {
        document.documentElement.style.overflow = '';
    }, { once: true });
}

export function initPageLoader() {
    lockScroll();

    const homeView    = document.getElementById('home-view');
    const pageView    = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');

    const fallbackLang = () => SITE_CONFIG.languages[0].code;

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
    function pageUrl(slug, lang) {
        const base    = SITE_CONFIG.appearance.base_path;
        const urlSlug = getSlug(window.T, slug);
        return `${base}${lang}/${urlSlug}/`;
    }

    // ── LOAD HOME ─────────────────────────────────────────────────────────────
    window.loadHome = async () => {
        const lang = window.LANG || fallbackLang();
        // Only skip the fetch when English content is already loaded in the correct language.
        // After a NL→EN switch homeView holds Dutch content, so we must NOT take this shortcut.
        const alreadyPopulated = homeView.querySelector('h2, .slideshow-root, .webshop-product-card');
        const loadedLang       = homeView.dataset.loadedLang
                               || (window.__PAGE_LANG__ === 'en' ? 'en' : null);
        if (lang === 'en' && alreadyPopulated && loadedLang === 'en') {
            rewriteContentPaths(homeView);
            homeView.querySelectorAll('.slideshow-root').forEach(mountSlideshow);
            initEmbedForms();
            wireShopCards(homeView);
            mountShopEmbeds(homeView);
            homeView.classList.remove('hidden');
            pageView.classList.add('hidden');
            unlockScroll();
            const base    = SITE_CONFIG.appearance.base_path;
            const homeUrl = `${base}${lang}/`;
            window.history.replaceState({}, '', homeUrl);
            updateSEO('');
            return;
        }
        try {
            const base = SITE_CONFIG.appearance.base_path;
            const res  = await fetch(`${base}content/${lang}/home.html`);
            if (!res.ok) throw new Error();
            const html = await res.text();
            homeView.innerHTML = html;
            homeView.dataset.loadedLang = lang;   // ← record which lang is now displayed
        rewriteContentPaths(homeView);
            homeView.querySelectorAll('.slideshow-root').forEach(mountSlideshow);
            initEmbedForms();
            wireShopCards(homeView);
            mountShopEmbeds(homeView);
        } catch {
            // home.html may not exist for every language yet
            homeView.dataset.loadedLang = lang;
        }
        homeView.classList.remove('hidden');
        pageView.classList.add('hidden');
        unlockScroll();
        const base    = SITE_CONFIG.appearance.base_path;
        const homeUrl = `${base}${lang}/`;
        window.history.replaceState({}, '', homeUrl);
        updateSEO('');
    };

    // ── VIEW PAGE ────────────────────────────────────────────────────────────
    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) { console.error(`Page "${slug}" not found in config`); return; }

        try {
            const res = await fetch(contentPath(page));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const html = await res.text();
            const spinner = document.getElementById('page-loading-spinner');
            if (spinner) spinner.remove();

            pageContent.innerHTML = html;
            rewriteContentPaths(pageContent);
            pageContent.querySelectorAll('script').forEach(orig => {
                const s = document.createElement('script');
                [...orig.attributes].forEach(a => s.setAttribute(a.name, a.value));
                if (!orig.src) s.textContent = orig.textContent;
                orig.replaceWith(s);
            });

            pageContent.querySelectorAll('.slideshow-root').forEach(mountSlideshow);
            initEmbedForms();
            wireShopCards(pageContent);
            mountShopEmbeds(pageContent);
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
            unlockScroll();

            const lang = window.LANG || fallbackLang();
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
            unlockScroll();
        }
    };

    // ── SHOW HOME ────────────────────────────────────────────────────────────
    window.showHome = () => {
        pageView.classList.add('hidden');
        homeView.classList.remove('hidden');
        const lang    = window.LANG || fallbackLang();
        const base    = SITE_CONFIG.appearance.base_path;
        window.history.pushState({}, '', `${base}${lang}/`);
        updateSEO('');
        window.loadHome();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── HANDLE DIRECT URL ON FIRST LOAD ──────────────────────────────────────
    function handleInitialURL() {
        if (window.__PAGE_SLUG__) {
            const slug = window.__PAGE_SLUG__;
            if (SITE_CONFIG.pages[slug]) { window.viewPage(slug); return; }
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
            if (SITE_CONFIG.pages[slug]) { window.viewPage(slug); return; }
        }

        window.loadHome();
        updateSEO('');
    }

    window.addEventListener('popstate', (e) => {
        if (e.state?.slug) window.viewPage(e.state.slug);
        else window.showHome();
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !pageView.classList.contains('hidden')) window.showHome();
    });

    handleInitialURL();
}
