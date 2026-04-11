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

// Maps ISO 3166-1 alpha-2 country codes → language codes.
// Only countries that should differ from English need to be listed.
const COUNTRY_TO_LANG = {
    // German
    DE: 'de', AT: 'de', CH: 'de', LI: 'de',
    // Dutch
    NL: 'nl', BE: 'nl',
    // French
    FR: 'fr', MC: 'fr', LU: 'fr',
    // Add more as you expand language support
};

const supported = new Set(SITE_CONFIG.languages.map(l => l.code));

/**
 * Resolve which language to use, in priority order:
 *   1. localStorage (user already made a choice)
 *   2. IP geolocation
 *   3. navigator.language (browser setting, no network call)
 *   4. Fallback ('en')
 */
async function detectLang() {
    // 1. Saved preference
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supported.has(saved)) return saved;

    // 2. IP geolocation — fast, ~40ms, free tier allows 1k req/day
    try {
        const res  = await fetch('https://ipapi.co/json/', { cache: 'force-cache' });
        const data = await res.json();
        const lang = COUNTRY_TO_LANG[data.country_code];
        if (lang && supported.has(lang)) {
            localStorage.setItem(STORAGE_KEY, lang);
            return lang;
        }
    } catch {
        // network error or blocked — fall through
    }

    // 3. Browser language header (e.g. 'de-DE' → 'de')
    const browserLang = (navigator.language || '').split('-')[0].toLowerCase();
    if (supported.has(browserLang)) {
        localStorage.setItem(STORAGE_KEY, browserLang);
        return browserLang;
    }

    // 4. Fallback
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
export async function initI18n() {
    const lang = await detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    injectHreflangTags();
    return lang;
}

// Let page-loader call this when navigation happens
export { injectHreflangTags };
