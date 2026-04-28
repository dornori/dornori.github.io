/**
 * shop-loader.js  (v2)
 * ─────────────────────────────────────────────────────────────────────────────
 * Bootstraps the Lumio shop engine on every page of the Dornori site.
 *
 * Responsibilities:
 *   1. Load shop/js/config.js → patch all relative paths to absolute.
 *   2. Load modules (currency, shipping, payment) sequentially.
 *   3. Load lang-bridge.js then shop.js.
 *   4. Initialise Currency, Shipping, and Shop.loadLang() concurrently.
 *   5. Dispatch  "lumio:ready"   — shop engine is loaded but lang/currency may still init.
 *      Dispatch  "lumio:booted"  — everything is fully initialised (use this for UI).
 *   6. Render the currency selector in the topBar slot.
 *   7. Load shop-adapter.js (patches SPA navigation inside embedded cart/shop).
 *   8. Expose window.goToCart / window.goToShop helpers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import SITE_CONFIG from '/test/js/config.js';

const SHOP_BASE = SITE_CONFIG.appearance.base_path + 'shop/';

// ── Sequential script loader ──────────────────────────────────────────────────
function loadScript(src) {
    return new Promise(resolve => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s  = document.createElement('script');
        s.src    = src;
        s.onload = resolve;
        s.onerror = () => { console.warn('[shop-loader] failed to load:', src); resolve(); };
        document.head.appendChild(s);
    });
}

// ── Resolve relative data/image paths → absolute ─────────────────────────────
function absolutify(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        out[k] = typeof v === 'string' ? SHOP_BASE + v : v;
    }
    return out;
}

// ── Wire currency selector into the topBar slot ───────────────────────────────
function wireCurrencySlot() {
    const slot = document.getElementById('topBar-currency-slot');
    if (!slot || !slot.innerHTML.trim() === false) return; // already wired
    if (typeof Currency === 'undefined' || typeof Shop === 'undefined') return;

    Shop.renderCurrencySelector(slot);

    // Keep the inner <select> invisible to keyboard until the topBar is open
    requestAnimationFrame(() => {
        const sel = slot.querySelector('select');
        if (sel) sel.setAttribute('tabindex', '-1');
    });

    // Re-wire every time the theme changes (Shop.renderCurrencySelector replaces DOM)
    document.addEventListener('currency:changed', () => {
        requestAnimationFrame(() => {
            const sel = slot.querySelector('select');
            if (sel && !document.getElementById('topBar')?.classList.contains('active')) {
                sel.setAttribute('tabindex', '-1');
            }
        });
    });
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function initShop() {
    // ── 1. Load shop config ────────────────────────────────────────────────
    await loadScript(SHOP_BASE + 'js/config.js');

    if (typeof CONFIG === 'undefined') {
        console.warn('[shop-loader] CONFIG unavailable — shop disabled');
        return;
    }

    // ── 2. Patch all relative paths to absolute ────────────────────────────
    CONFIG.data   = absolutify(CONFIG.data);

    if (CONFIG.images) {
        CONFIG.images.imageDir = SHOP_BASE + (CONFIG.images.imageDir || 'images/products/');
    }

    // Payment redirect paths
    const successUrl = SHOP_BASE + 'success.html';
    const stayUrl    = window.location.pathname;
    if (CONFIG.payment?.paypal) {
        CONFIG.payment.paypal.returnPath = successUrl;
        CONFIG.payment.paypal.cancelPath = stayUrl;
    }
    if (CONFIG.payment?.stripe) {
        CONFIG.payment.stripe.returnPath = successUrl;
        CONFIG.payment.stripe.cancelPath = stayUrl;
    }

    // ── 3. Patch module paths ─────────────────────────────────────────────
    CONFIG.modules = (CONFIG.modules || []).map(m => SHOP_BASE + m);

    // ── 4. Sync language from parent site ────────────────────────────────
    const siteLang = localStorage.getItem('dornori-lang') || window.__PAGE_LANG__ || 'en';
    CONFIG.language = siteLang;
    localStorage.setItem('dornori-lang', siteLang);

    // ── 5. Load modules sequentially ─────────────────────────────────────
    for (const src of CONFIG.modules) {
        await loadScript(src);
    }

    // ── 6. Load lang-bridge then shop engine ─────────────────────────────
    await loadScript(SHOP_BASE + 'js/lang-bridge.js');
    await loadScript(SHOP_BASE + 'js/shop.js');

    // ── 7. Signal that scripts are loaded (cart.html listener wakes here) ─
    document.dispatchEvent(new Event('lumio:ready'));

    // ── 8. Initialise Currency, Shipping, and language concurrently ───────
    try {
        await Promise.all([
            typeof Currency  !== 'undefined' ? Currency.init()   : Promise.resolve(),
            typeof Shipping  !== 'undefined' ? Shipping.load()   : Promise.resolve(),
            typeof Shop      !== 'undefined' ? Shop.loadLang()   : Promise.resolve(),
        ]);
    } catch (e) {
        console.warn('[shop-loader] init warning:', e);
    }

    // ── 9. Wire currency into topBar ─────────────────────────────────────
    wireCurrencySlot();

    // ── 10. Load SPA navigation adapter ──────────────────────────────────
    await loadScript(SITE_CONFIG.appearance.base_path + 'js/shop-adapter.js');

    // ── 11. Signal fully booted ───────────────────────────────────────────
    document.dispatchEvent(new CustomEvent('lumio:booted', {
        detail: { lang: CONFIG.language, currency: typeof Currency !== 'undefined' ? Currency.getActive() : 'EUR' }
    }));

    // ── 12. Global SPA helpers ────────────────────────────────────────────
    window.goToCart = () => {
        if (typeof window.viewPage === 'function') window.viewPage('cart');
    };
    window.goToShop = () => {
        if (typeof window.viewPage === 'function') window.viewPage('shop');
    };

    // ── 13. Keep language in sync when parent site switches ───────────────
    window.addEventListener('storage', e => {
        if (e.key === 'dornori-lang' && e.newValue && typeof Shop !== 'undefined') {
            Shop.switchLanguage(e.newValue).catch(() => {});
            wireCurrencySlot();
        }
    });

    // Patch setLang so shop re-renders when language switches
    const _origSetLang = window.setLang;
    window.setLang = async function (code) {
        if (_origSetLang) await _origSetLang(code);
        if (typeof Shop !== 'undefined') {
            try { await Shop.switchLanguage(code); } catch (e) {}
        }
    };
}

/**
 * mountShopEmbeds()
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans the current page for elements with [data-shop-products] and renders
 * live product cards inside them using the already-loaded shop engine.
 *
 * Usage in content HTML (no JS needed in the file):
 *   <div data-shop-products="all"></div>
 *   <div data-shop-products="featured"></div>
 *   <div data-shop-products="arc-floor-lamp,globe-pendant"></div>
 *
 * Must be called AFTER the shop engine has booted (lumio:booted event).
 * page-loader.js calls this automatically after injecting any content fragment.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function mountShopEmbeds(root) {
    const scope = root || document;
    const slots = scope.querySelectorAll('[data-shop-products]');
    if (!slots.length) return;

    // Wait for shop engine if not yet ready
    if (typeof Shop === 'undefined' || typeof Currency === 'undefined') {
        await new Promise(resolve => {
            const done = () => resolve();
            document.addEventListener('lumio:booted', done, { once: true });
            document.addEventListener('lumio:ready',  done, { once: true });
            setTimeout(done, 8000);
        });
    }

    if (typeof Shop === 'undefined') return;

    const base = SITE_CONFIG.appearance.base_path;
    const cartHref = `${base}shop/cart.html`;

    let allProducts;
    try {
        await Shop.loadLang();
        allProducts = await Shop.loadProducts();
    } catch (e) {
        console.warn('[mountShopEmbeds] could not load products:', e);
        return;
    }

    slots.forEach(slot => {
        if (slot.dataset.shopMounted) return;   // already rendered
        slot.dataset.shopMounted = '1';

        const spec = slot.getAttribute('data-shop-products') || 'featured';

        let products;
        if (spec === 'all') {
            products = allProducts;
        } else if (spec === 'featured') {
            products = allProducts.filter(p => p.featured);
            if (!products.length) products = allProducts.slice(0, 3);
        } else {
            const ids = spec.split(',').map(s => s.trim()).filter(Boolean);
            products  = ids
                .map(id => allProducts.find(p => p.id === id))
                .filter(Boolean);
            if (!products.length) products = allProducts.filter(p => p.featured);
        }

        if (!products.length) return;

        // Build wrapper using shop's own CSS classes
        slot.className = (slot.className + ' lumio-shop-embed').trim();

        const grid = document.createElement('div');
        grid.className = 'lumio-grid';
        slot.appendChild(grid);

        products.forEach(p => {
            const card = document.createElement('div');
            card.className   = 'lumio-product-card';
            card.dataset.cat = p.category || '';
            card.innerHTML   = Shop.buildProductCard(p);
            grid.appendChild(card);
            Shop.wireProductCard(card, p);
        });

        // Cart link below the grid
        const cartLink = document.createElement('p');
        cartLink.style.cssText = 'text-align:right;margin-top:8px;font-family:var(--font-mono);font-size:.76rem;';
        cartLink.innerHTML = `<a href="${cartHref}" class="lumio-link" style="color:var(--c-accent,var(--accent));">
            View cart →
        </a>`;
        slot.appendChild(cartLink);
    });
}
