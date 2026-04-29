/**
 * shop-init.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Classic (non-module) script that bootstraps the shop engine.
 * Previously duplicated as 3–4 inline <script> blocks in every HTML shell.
 *
 * Depends on:
 *   • window.SHOP_CONFIG   — set by site-boot.js (must load first)
 *   • shop/js/config.js    — sets global CONFIG
 *   • shop/js/lang-bridge.js
 *   • shop/js/modules/*.js + shop/js/shop.js  (loaded dynamically below)
 *
 * Sequence guaranteed by <script> tag order in HTML shells:
 *   1. site-boot.js           (sets SHOP_CONFIG)
 *   2. shop/js/config.js      (sets CONFIG)
 *   3. shop/js/lang-bridge.js
 *   4. shop-init.js           ← this file (patches CONFIG, loads modules)
 *   5. <script type="module"> site-main.js
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
    'use strict';

    var cfg = window.SHOP_CONFIG || {};

    // ── 1. Patch CONFIG paths from SHOP_CONFIG (derived from base_path) ───────
    if (typeof CONFIG !== 'undefined') {
        var dp = cfg.dataPath || '';
        var jp = cfg.jsPath   || '';

        CONFIG.data.shippingCsv     = dp + 'shipping.csv';
        CONFIG.data.currenciesCsv   = dp + 'currencies.csv';
        CONFIG.data.langUiDir       = dp + 'lang/ui/';
        CONFIG.data.langProductsDir = dp + 'lang/products/';
        CONFIG.data.productsJson    = dp + 'products.json';

        CONFIG.modules = [
            jp + 'modules/currency.js',
            jp + 'modules/shipping.js',
            jp + 'modules/payment.js',
        ];

        // Share language storage key with parent site
        CONFIG.storageKeys.parentLangKey = 'dornori-lang';
        CONFIG.storageKeys.shopLangKey   = 'dornori-lang';
        CONFIG.defaultLanguage           = 'en';
        CONFIG.features.showLanguageSwitcher = false;
        CONFIG.features.showCurrencySelector = true;
    }

    // ── 2. Dynamic script loader ──────────────────────────────────────────────
    function loadScript(src) {
        return new Promise(function (resolve) {
            if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
            var s   = document.createElement('script');
            s.src   = src;
            s.onload  = resolve;
            s.onerror = function () {
                console.warn('[shop-init] failed to load:', src);
                resolve();
            };
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
        .then(function () { document.dispatchEvent(new Event('webshop:ready')); });

    // ── 4. webshop:ready handler ──────────────────────────────────────────────
    document.addEventListener('webshop:ready', function () {

        // Currency init (non-blocking)
        if (typeof Currency !== 'undefined') Currency.init();

        // Shipping must resolve before Shop.loadLang() (it sets supportedLanguages)
        var bootPromise = Promise.resolve();
        if (typeof Shipping !== 'undefined') bootPromise = Shipping.load();

        bootPromise.then(function () {
            return typeof Shop !== 'undefined' ? Shop.loadLang() : Promise.resolve();
        }).then(function () {
            _renderCartIcon();
            _mountCurrencySelector();
            _patchProductLinks();
            _registerEventListeners();
            console.log('[shop-init] Shop components initialized');
        }).catch(function (e) {
            console.warn('[shop-init] Shop boot error:', e);
        });
    });

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _cartUrl(lang) {
        // Mirror of SITE_CONFIG.cartUrl() but in plain JS for pre-module context.
        // Must stay in sync with url_slugs[lang].cart in js/config.js.
        var slugs = { en: 'cart', nl: 'winkelwagen', de: 'warenkorb', fr: 'panier' };
        var base  = cfg.basePath || '/shop/';           // SHOP_CONFIG.basePath
        // basePath is like '/test/shop/' — strip 'shop/' to get site base
        var siteBase = base.replace(/shop\/$/, '');
        var l        = lang || window.LANG || localStorage.getItem('dornori-lang') || 'en';
        return siteBase + l + '/' + (slugs[l] || 'cart') + '/';
    }

    function _renderCartIcon(lang) {
        if (typeof Shop === 'undefined' || typeof Shop.renderCartIcon !== 'function') return;
        var skel = document.getElementById('cart-skeleton');
        if (skel) skel.remove();
        var l = lang || window.LANG || localStorage.getItem('dornori-lang') || window.__PAGE_LANG__ || 'en';
        Shop.renderCartIcon({
            target:  '#cart-icon-slot',
            fixed:   false,
            cartUrl: _cartUrl(l),
        });
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
            var obs = new MutationObserver(function () {
                if (tryMount()) obs.disconnect();
            });
            obs.observe(document.body, { childList: true, subtree: true });
            setTimeout(function () { obs.disconnect(); }, 10000);
        }
    }

    function _patchProductLinks() {
        // Fix shop.js cart hover panel links: product.html?id= → correct SPA URL
        var siteBase = (cfg.basePath || '').replace(/shop\/$/, '');
        function fixLinks(root) {
            (root || document).querySelectorAll('a[href*="product.html?id="]').forEach(function (a) {
                var id = a.getAttribute('href').split('product.html?id=')[1];
                a.setAttribute('href', siteBase + 'en/product/?id=' + id);
            });
        }
        fixLinks(document);
        new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                m.addedNodes.forEach(function (n) { if (n.nodeType === 1) fixLinks(n); });
            });
        }).observe(document.body, { childList: true, subtree: true });
        document.addEventListener('shop:cartUpdated', function () { fixLinks(document); });
    }

    function _registerEventListeners() {
        // Re-render cart icon on language change
        document.addEventListener('shop:langChanged', function () {
            _renderCartIcon();
        });

        // Re-render prices on currency change
        document.addEventListener('currency:changed', function () {
            document.querySelectorAll('[data-base-price]').forEach(function (el) {
                var base = parseFloat(el.dataset.basePrice);
                if (!isNaN(base) && typeof Shop !== 'undefined') el.textContent = Shop.fmt(base);
            });
            if (typeof Shop !== 'undefined') {
                document.dispatchEvent(new CustomEvent('shop:cartUpdated', {
                    detail: { cart: Shop.getCart() }
                }));
            }
        });
    }

    function _renderBasicCurrencySelector(container) {
        if (!container || typeof Currency === 'undefined') return;
        function build() {
            Currency.waitForReady().then(function () {
                var active = Currency.getActive();
                container.className = 'profile-selector-wrap';
                container.innerHTML = 'CURRENCY ' +
                    '<select class="profile-select" aria-label="Currency">' +
                    Currency.list().map(function (c) {
                        return '<option value="' + c.code + '"' +
                               (c.code === active ? ' selected' : '') + '>' +
                               c.code + ' ' + c.symbol + '</option>';
                    }).join('') +
                    '</select>';
                container.querySelector('select')
                    .addEventListener('change', function (e) { Currency.setActive(e.target.value); });
            });
        }
        build();
        document.addEventListener('currency:changed', build);
    }

})();
