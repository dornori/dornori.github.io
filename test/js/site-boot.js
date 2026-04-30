/**
 * site-boot.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs synchronously (classic <script>, NOT a module) before the ES module
 * bundle or shop scripts execute.
 *
 * Responsibilities:
 *   1. Apply saved language preference to <html lang> (prevents flash).
 *   2. Expose window.__PAGE_LANG__  — overridden per-shell when needed.
 *   3. Expose window.__CART_URL__   — derived from BASE_PATH (no hardcoding).
 *   4. Expose window.SHOP_CONFIG   — derived from BASE_PATH.
 *
 * Cart slugs are defined inline here for the synchronous boot phase only.
 * They mirror url_slugs.*.cart in config.js — if you change a cart slug
 * there, change it here too (or wire a build step to keep them in sync).
 *
 * !! BASE_PATH is the ONLY variable to change when the site moves. !!
 * It must match SITE_CONFIG.appearance.base_path in js/config.js.
 */
(function () {
    'use strict';

    // ── The one path constant ─────────────────────────────────────────────────
    var BASE_PATH = '/test/';

    // ── Cart slug map — mirrors url_slugs.*.cart in config.js ─────────────────
    // Keyed by site language code. Update when adding/renaming languages.
    var CART_SLUGS = {
        en: 'cart',
        nl: 'winkelwagen',
        de: 'warenkorb',
        fr: 'panier',
    };

    // ── Language detection ────────────────────────────────────────────────────
    var LANG_KEY = 'dornori-lang';
    var lang = localStorage.getItem(LANG_KEY) || 'en';

    if (!window.__PAGE_LANG__) {
        window.__PAGE_LANG__ = lang;
    } else {
        lang = window.__PAGE_LANG__;
    }

    document.documentElement.setAttribute('lang', lang);

    // ── Derived paths ─────────────────────────────────────────────────────────
    var cartSlug        = CART_SLUGS[lang] || 'cart';
    window.__CART_URL__ = BASE_PATH + lang + '/' + cartSlug + '/';

    window.SHOP_CONFIG = {
        basePath: BASE_PATH + 'shop/',
        dataPath: BASE_PATH + 'shop/data/',
        jsPath:   BASE_PATH + 'shop/js/',
    };

    if (window.__PAGE_SLUG__ === undefined) {
        window.__PAGE_SLUG__ = '';
    }
})();
