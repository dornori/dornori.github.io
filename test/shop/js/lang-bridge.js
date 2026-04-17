/**
 * lang-bridge.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Bridges language preference from the main Dornori site into the shop.
 *
 * HOW IT WORKS:
 *   Main site stores language in localStorage key: 'dornori-lang'  (e.g. 'nl')
 *   Shop reads language from:  CONFIG.language  (set from 'lumio_lang')
 *
 *   This script reads 'dornori-lang' and, if it's a language the shop supports,
 *   writes it into both CONFIG.language and 'lumio_lang' so shop.js picks it up.
 *
 * LOAD ORDER — include AFTER config.js, BEFORE shop.js:
 *   <script src="js/config.js"></script>
 *   <script src="js/lang-bridge.js"></script>
 *   <script src="js/shop.js"></script>
 *
 * TO EXTEND to new languages:
 *   1. Add lang code to SUPPORTED below (must match a file in data/lang/)
 *   2. Add the dornori-lang → shop-lang mapping to LANG_MAP if codes differ
 *      (currently they're identical: 'en'→'en', 'nl'→'nl', 'de'→'de', 'fr'→'fr')
 *   3. Create data/lang/{code}.json in the shop
 */
(function () {
    // Languages the shop has translation files for (data/lang/{code}.json)
    var SUPPORTED = ['en', 'nl', 'no', 'de', 'fr'];

    // Map main-site lang codes → shop lang codes (add entries if they differ)
    var LANG_MAP = {
        'en': 'en',
        'nl': 'nl',
        'de': 'de',
        'fr': 'fr',
        // 'no' is shop-only; 'de'/'fr' fall back to 'en' if no shop file exists
    };

    var siteLang  = localStorage.getItem('dornori-lang');
    var shopLang  = siteLang && LANG_MAP[siteLang] ? LANG_MAP[siteLang] : null;

    // Verify the mapped lang is actually supported (has a data/lang file)
    if (shopLang && SUPPORTED.indexOf(shopLang) === -1) {
        shopLang = null;
    }

    // Fallback chain: dornori-lang → lumio_lang → CONFIG default → 'en'
    var finalLang = shopLang
        || localStorage.getItem('lumio_lang')
        || (typeof CONFIG !== 'undefined' && CONFIG.language)
        || 'en';

    // Write into CONFIG (which shop.js reads via loadLang())
    if (typeof CONFIG !== 'undefined') {
        CONFIG.language = finalLang;
    }

    // Keep lumio_lang in sync so shop's own language switcher reflects it
    localStorage.setItem('lumio_lang', finalLang);
})();
