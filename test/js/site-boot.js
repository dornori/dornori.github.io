/**
 * site-boot.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs synchronously (classic <script>, NOT a module) so values are available
 * before the ES module bundle or shop scripts execute.
 *
 * Responsibilities:
 *   1. Apply saved language preference to <html lang> (prevents flash).
 *   2. Expose window.__PAGE_LANG__  — overridden per-shell when needed.
 *   3. Expose window.__CART_URL__   — derived from BASE_PATH (no hardcoding).
 *   4. Expose window.SHOP_CONFIG   — derived from BASE_PATH (no hardcoding).
 *
 * !! BASE_PATH is the ONLY variable to change when the site moves. !!
 * It must match SITE_CONFIG.appearance.base_path in js/config.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
    'use strict';

    // ── The one path constant ──────────────────────────────────────────────────
    // Keep in sync with SITE_CONFIG.appearance.base_path (js/config.js).
    var BASE_PATH = '/test/';

    // ── Cart URL slug map — mirrors SITE_CONFIG.url_slugs[lang].cart ──────────
    // Keep in sync with the url_slugs.*.cart entries in js/config.js.
    var CART_SLUGS = {
        en: 'cart',
        nl: 'winkelwagen',
        de: 'warenkorb',
        fr: 'panier',
    };

    // ── Language detection ────────────────────────────────────────────────────
    var LANG_KEY = 'dornori-lang'; // mirrors SITE_CONFIG.storageKeys.lang
    var lang = localStorage.getItem(LANG_KEY) || 'en';

    // __PAGE_LANG__ may be overridden by the shell's own inline snippet
    // (e.g. window.__PAGE_LANG__ = 'de') which runs BEFORE this script in the
    // per-language shell pages.  Only set it here as a fallback.
    if (!window.__PAGE_LANG__) {
        window.__PAGE_LANG__ = lang;
    } else {
        lang = window.__PAGE_LANG__;
    }

    document.documentElement.setAttribute('lang', lang);

    // ── Derived paths — no raw strings, everything from BASE_PATH ────────────
    var cartSlug     = CART_SLUGS[lang] || 'cart';
    window.__CART_URL__ = BASE_PATH + lang + '/' + cartSlug + '/';

    window.SHOP_CONFIG = {
        basePath: BASE_PATH + 'shop/',
        dataPath: BASE_PATH + 'shop/data/',
        jsPath:   BASE_PATH + 'shop/js/',
    };

    // __PAGE_SLUG__ default — overridden per-shell for page-specific shells
    if (window.__PAGE_SLUG__ === undefined) {
        window.__PAGE_SLUG__ = '';
    }
})();
