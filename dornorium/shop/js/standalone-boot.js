/**
 * standalone-boot.js
 * ─────────────────────────────────────────────────────────────────────────
 * Minimal replacement for the full site's site-boot.js, scoped to just the
 * shop/cart module. Sets the two globals shop-init.js expects
 * (window.SHOP_CONFIG, window.__BASE_PATH__), then loads window.T so the
 * data-i18n / T() calls already in cart.html, product.html etc. have real
 * strings instead of just their hardcoded fallbacks.
 *
 * Load this AFTER js/config.js and BEFORE js/shop-init.js.
 * ─────────────────────────────────────────────────────────────────────────
 */
(function () {
    'use strict';

    // Everything in this package lives flat under one folder, so paths are
    // relative to whatever page loaded this script — no absolute /-rooted
    // paths, so the package can be dropped in a subfolder or its own domain.
    var BASE_PATH = './';
    window.__BASE_PATH__ = BASE_PATH;

    window.SHOP_CONFIG = {
        basePath: BASE_PATH,
        dataPath: BASE_PATH + 'data/',
        jsPath:   BASE_PATH + 'js/',
    };

    if (window.__PAGE_SLUG__ === undefined) window.__PAGE_SLUG__ = '';

    var LANG_KEY = (typeof CONFIG !== 'undefined' && CONFIG.storageKeys && CONFIG.storageKeys.parentLangKey) || 'dornori-lang';
    var lang = localStorage.getItem(LANG_KEY) || 'en';
    window.LANG = lang;
    window.__PAGE_LANG__ = lang;
    document.documentElement.setAttribute('lang', lang);

    // Populate window.T early. shop.js/shop-init.js only read window.T for
    // optional things (url slugs, currency-selector label) and always have a
    // fallback, but the inline page scripts (cart.html, product.html) use it
    // for on-screen copy via data-i18n / T(), so give it real values.
    fetch(BASE_PATH + 'lang/' + lang + '/common.json')
        .then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function () { return {}; })
        .then(function (data) { window.T = data; });
})();
