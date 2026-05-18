/**
 * shop-init.js
 * Bootstraps the shop engine. Runs as a classic (non-module) script.
 *
 * Load order in HTML shells:
 *   1. site-boot.js           → sets SHOP_CONFIG
 *   2. shop/js/config.js      → sets CONFIG
 *   3. shop/js/lang-bridge.js
 *   4. shop-init.js           ← this file
 *   5. <script type="module"> site-main.js
 */
(function () {
    'use strict';

    var cfg     = window.SHOP_CONFIG || {};
    var sitBase = cfg.basePath || '/'; // basePath is now the site root directly

    // ── 1. Patch CONFIG to use new unified data paths ─────────────────────────
    if (typeof CONFIG !== 'undefined') {
        // All data now lives under /data/ — no more shop/data/
        if (!CONFIG.data) CONFIG.data = {};
        if (!CONFIG.storageKeys) CONFIG.storageKeys = {};
        if (!CONFIG.features) CONFIG.features = {};
        if (!CONFIG.shipping) CONFIG.shipping = {};
        if (!CONFIG.images) CONFIG.images = {};
        CONFIG.data.shippingJson     = sitBase + 'data/shipping.json';
        CONFIG.data.countriesJson    = sitBase + 'data/countries.json';
        CONFIG.data.productsJson     = sitBase + 'data/products.json';
        CONFIG.data.langDir          = sitBase + 'lang/';

        // Patch imageDir so relative paths resolve from site root, not page URL depth
        if (!CONFIG.images.imageDir || !CONFIG.images.imageDir.startsWith('/')) {
            CONFIG.images.imageDir = sitBase + (CONFIG.images.imageDir || 'images/products/');
        }

        CONFIG.modules = [
            cfg.jsPath + 'modules/currency.js',
            cfg.jsPath + 'modules/shipping.js',
            cfg.jsPath + 'modules/payment.js',
        ];

        CONFIG.storageKeys.parentLangKey     = 'dornori-lang';
        CONFIG.storageKeys.shopLangKey       = 'dornori-lang';
        CONFIG.defaultLanguage               = 'en';
        CONFIG.features.showLanguageSwitcher = false;
        CONFIG.features.showCurrencySelector = true;
    }

    window.__shopConfigPatched = true;

    // ── 2. Script loader ──────────────────────────────────────────────────────
    function loadScript(src) {
        return new Promise(function (resolve) {
            if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
            var s     = document.createElement('script');
            s.src     = src;
            s.onload  = resolve;
            s.onerror = function () { console.warn('[shop-init] failed:', src); resolve(); };
            document.head.appendChild(s);
        });
    }

    // ── 3. Load modules → shop.js → dispatch webshop:ready ───────────────────
    var modules = (typeof CONFIG !== 'undefined' && CONFIG.modules) || [
        (cfg.jsPath || '') + 'modules/currency.js',
        (cfg.jsPath || '') + 'modules/shipping.js',
        (cfg.jsPath || '') + 'modules/payment.js',
    ];

    Promise.all(modules.map(loadScript))
        .then(function () { return loadScript((cfg.jsPath || '') + 'shop.js'); })
        .then(function () { window.__shopInitReady = true; document.dispatchEvent(new Event('webshop:ready')); });

    // ── 4. webshop:ready handler ──────────────────────────────────────────────
    document.addEventListener('webshop:ready', function () {
        if (typeof Currency !== 'undefined') Currency.init();

        var bootPromise = Promise.resolve();
        if (typeof Shipping !== 'undefined') bootPromise = Shipping.load();

        bootPromise.then(function () {
            return typeof Shop !== 'undefined' ? Shop.loadLang() : Promise.resolve();
        }).then(function () {
            _renderCartIcon();
            _mountCurrencySelector();
            _patchProductLinks();
            _registerEventListeners();
        }).catch(function (e) {
            console.warn('[shop-init] Boot error:', e);
        });
    });

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _cartUrl(lang) {
        var l    = lang || window.LANG || localStorage.getItem('dornori-lang') || 'en';
        var slug = (window.T && window.T.url_slugs && window.T.url_slugs.cart) || 'cart';
        return sitBase + l + '/' + slug + '/';
    }

    function _renderCartIcon(lang) {
        if (typeof Shop === 'undefined' || typeof Shop.renderCartIcon !== 'function') return;
        var skel = document.getElementById('cart-skeleton');
        if (skel) skel.remove();
        Shop.renderCartIcon({ target: '#cart-icon-slot', fixed: false, cartUrl: _cartUrl(lang) });
        _renderMobileCartIcon(lang);
    }

    function _renderMobileCartIcon(lang) {
        if (typeof Shop === 'undefined' || typeof Shop.renderCartIcon !== 'function') return;
        var slot = document.getElementById('mobile-cart-icon-slot');
        if (slot) {
            // FIX #7: Slot exists - render immediately (happy path with proper load order)
            Shop.renderCartIcon({ target: '#mobile-cart-icon-slot', fixed: false, cartUrl: _cartUrl(lang) }); } else {
            // Slot not yet created — nav-loader.js still initialising.
            // Wait for nav:ready event which fires once nav DOM is built.
            var capturedLang = lang;
            function onNavReady() {
                document.removeEventListener('nav:ready', onNavReady);
                var s = document.getElementById('mobile-cart-icon-slot');
                if (s && typeof Shop !== 'undefined' && typeof Shop.renderCartIcon === 'function') {
                    Shop.renderCartIcon({ target: '#mobile-cart-icon-slot', fixed: false, cartUrl: _cartUrl(capturedLang) });
                }
            }
            document.addEventListener('nav:ready', onNavReady);
        }
    }

    function _mountCurrencySelector() {
        function tryMount() {
            var slot = document.getElementById('topBar-currency-slot')
                    || document.getElementById('currency-selector-slot');
            if (!slot) return false;
            if (slot.querySelector('select, .webshop-currency-selector')) return true;
            if (typeof Currency === 'undefined' || typeof Shop === 'undefined') return false;
            if (typeof Shop.renderCurrencySelector === 'function') {
                Shop.renderCurrencySelector(slot);
            } else {
                _renderBasicCurrencySelector(slot);
            }
            return true;
        }
        if (!tryMount()) {
            var obs = new MutationObserver(function () { if (tryMount()) obs.disconnect(); });
            obs.observe(document.body, { childList: true, subtree: true });
            setTimeout(function () { obs.disconnect(); }, 10000);
        }
    }

    function _patchProductLinks() {
        function fixLinks(root) {
            var lang = window.LANG || localStorage.getItem('dornori-lang') || 'en';
            var slug = (window.T && window.T.url_slugs && window.T.url_slugs.product) || 'product';
            (root || document).querySelectorAll('a[href*="product.html?id="]').forEach(function (a) {
                var id = a.getAttribute('href').split('product.html?id=')[1];
                a.setAttribute('href', sitBase + lang + '/' + slug + '/?id=' + id);
            });
        }
        fixLinks(document);
        new MutationObserver(function (ms) {
            ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) fixLinks(n); }); });
        }).observe(document.body, { childList: true, subtree: true });
        document.addEventListener('shop:cartUpdated', function () { fixLinks(document); });
    }

    function _registerEventListeners() {
        // Re-render cart icon (and update URL slug) on language change
        document.addEventListener('shop:langChanged', function (e) {
            var lang = (e && e.detail && e.detail.lang) || window.LANG || 'en';
            _renderCartIcon(lang);
            // Force hover-panel re-render by dispatching cartUpdated
            // (covers the case where renderCartIcon ran before this listener was attached)
            setTimeout(function () {
                document.dispatchEvent(new CustomEvent('shop:cartUpdated', {
                    detail: { cart: typeof Shop !== 'undefined' ? Shop.getCart() : [] }
                }));
            }, 50);
        });

        // Re-render prices on currency change
        document.addEventListener('currency:changed', function () {
            document.querySelectorAll('[data-base-price]').forEach(function (el) {
                var base = parseFloat(el.dataset.basePrice);
                if (!isNaN(base) && typeof Shop !== 'undefined') el.textContent = Shop.fmt(base);
            });
            if (typeof Shop !== 'undefined') {
                document.dispatchEvent(new CustomEvent('shop:cartUpdated', { detail: { cart: Shop.getCart() } }));
            }
        });
    }

    function _renderBasicCurrencySelector(container) {
        if (!container || typeof Currency === 'undefined') return;
        function build() {
            Currency.waitForReady().then(function () {
                var active = Currency.getActive();
                container.className = 'profile-selector-wrap';
                container.innerHTML = (typeof Shop !== 'undefined' ? Shop.t("ui.currency","Currency") : "Currency").toUpperCase() + ' <select class="profile-select" aria-label="Currency">' +
                    Currency.list().map(function (c) {
                        return '<option value="' + c.code + '"' + (c.code === active ? ' selected' : '') + '>' +
                               c.code + ' ' + c.symbol + '</option>';
                    }).join('') + '</select>';
                container.querySelector('select')
                    .addEventListener('change', function (e) { Currency.setActive(e.target.value); });
            });
        }
        build();
        document.addEventListener('currency:changed', build);
    }

})();
