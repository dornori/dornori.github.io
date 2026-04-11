/**
 * i18n.js — Language detection, storage, and switching
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. On first visit: fetches https://ipapi.co/json/ to get the user's country,
 *    maps it to a supported language, saves to localStorage.
 * 2. On subsequent visits: reads from localStorage (no extra network call).
 * 3. Exposes window.LANG (the active language code, e.g. 'en')
 *    and window.setLang(code) for the settings UI.
 * 4. Content files live at:  content/{lang}/about-us.html  etc.
 *    page-loader.js reads window.LANG to build the path.
 * 5. Injects <link rel="alternate" hreflang="..."> tags for all languages.
 *
 * ADDING A LANGUAGE
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Add it to SITE_CONFIG.languages in config.js
 * 2. Create the folder: content/{code}/
 * 3. Translate every content file into that folder
 * 4. Add country codes that should map to it in COUNTRY_TO_LANG below
 */

import SITE_CONFIG from './config.js';

const STORAGE_KEY = 'dornori-lang';
const FALLBACK    = SITE_CONFIG.languages[0].code; // 'en'


const supported = new Set(SITE_CONFIG.languages.map(l => l.code));

/**
 * Resolve which language to use, in priority order:
 *   1. localStorage (user already made a choice)
 *   2. IP geolocation
 *   3. navigator.language (browser setting, no network call)
 *   4. Fallback ('en')
 */
function detectLang() {
    // 1. Saved preference — user already chose manually
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supported.has(saved)) return saved;

    // 2. Browser/OS language list — navigator.languages is the ordered list
    //    the user has configured, e.g. ['de-DE', 'de', 'en-US', 'en'].
    //    No external call, no latency, no third-party traffic.
    const match = (navigator.languages || [navigator.language])
        .map(l => l.split('-')[0].toLowerCase())
        .find(l => supported.has(l));

    if (match) {
        localStorage.setItem(STORAGE_KEY, match);
        return match;
    }

    // 3. Fallback
    return FALLBACK;
}

/**
 * Inject <link rel="alternate" hreflang="..."> for every supported language.
 * Google uses these to understand which URL to serve per region.
 */
function injectHreflangTags(currentSlug = '') {
    const base = SITE_CONFIG.appearance.root_url;
    const path = currentSlug ? `/${currentSlug}` : '';

    // Remove any existing hreflang tags (so we can update on navigation)
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    SITE_CONFIG.languages.forEach(({ code, hreflang }) => {
        const link = document.createElement('link');
        link.rel      = 'alternate';
        link.hreflang = hreflang;
        link.href     = `${base}/${code}${path}`;
        document.head.appendChild(link);
    });

    // x-default points to the English (default) version
    const xDefault = document.createElement('link');
    xDefault.rel      = 'alternate';
    xDefault.hreflang = 'x-default';
    xDefault.href     = `${base}${path}`;
    document.head.appendChild(xDefault);
}

/**
 * Change language, persist, and reload the current page content.
 * Called by the settings UI in nav-loader.js.
 */
window.setLang = (code) => {
    if (!supported.has(code)) return;
    localStorage.setItem(STORAGE_KEY, code);
    window.LANG = code;

    // Update <html lang="">
    document.documentElement.setAttribute('lang', code);

    // Reload whatever page is currently showing
    const slug = window.CURRENT_SLUG || '';
    if (slug) {
        window.viewPage(slug);
    } else {
        // Reload home content
        window.loadHome();
    }
};

/**
 * Main init — call once before initPageLoader / initNavigation.
 * Returns the active language code so callers can await it.
 */
export function initI18n() {
    const lang = detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    injectHreflangTags();
    return lang;
}

// Let page-loader call this when navigation happens
export { injectHreflangTags };
