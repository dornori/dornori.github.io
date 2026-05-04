/**
 * site-boot.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs synchronously (classic <script>, NOT a module) so values are available
 * before the ES module bundle or shop scripts execute.
 *
 * Responsibilities:
 *   1. Apply saved language preference to <html lang> (prevents flash).
 *   2. Expose window.__PAGE_LANG__  — overridden per-shell when needed.
 *   3. Expose window.__CART_URL__   — provisional; overridden by i18n after load.
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
    var BASE_PATH = '/sandbox';

    // ── Language detection ────────────────────────────────────────────────────
    var LANG_KEY = 'dornori-lang'; // mirrors SITE_CONFIG.storageKeys.lang
    var lang = localStorage.getItem(LANG_KEY) || 'en';

    if (!window.__PAGE_LANG__) {
        window.__PAGE_LANG__ = lang;
    } else {
        lang = window.__PAGE_LANG__;
    }

    document.documentElement.setAttribute('lang', lang);

    // ── Provisional cart URL ───────────────────────────────────────────────────
    // Uses only lang code; i18n.js will override with the localised slug once
    // the lang bundle loads (cartUrl(base, lang, langData)).
    window.__CART_URL__ = BASE_PATH + lang + '/cart/';

    window.SHOP_CONFIG = {
        basePath: BASE_PATH + 'shop/',
        dataPath: BASE_PATH + 'shop/data/',
        jsPath:   BASE_PATH + 'shop/js/',
    };

    if (window.__PAGE_SLUG__ === undefined) {
        window.__PAGE_SLUG__ = '';
    }
})();
