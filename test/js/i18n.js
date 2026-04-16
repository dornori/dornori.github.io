/**
 * i18n.js — Language detection, JSON loading, and switching
 * ─────────────────────────────────────────────────────────────────────────────
 * Priority order for language detection:
 *   1. URL path  (e.g. /de/about  or  /test/fr/kit)   ← highest priority
 *   2. localStorage saved preference
 *   3. navigator.languages browser preference
 *   4. Fallback (first language in config = English)
 *
 * This ensures that sharing a /de/ URL always loads German, even on a device
 * that previously had English saved in localStorage.
 * ─────────────────────────────────────────────────────────────────────────────
 * TO ADD A LANGUAGE:
 *   1. Add entry to SITE_CONFIG.languages in config.js
 *   2. Create lang/{code}.json (copy en.json and translate)
 *   3. Create content/{code}/ folder and translate HTML files
 *   That's it.
 */

import SITE_CONFIG from './config.js';

const STORAGE_KEY = 'dornori-lang';
const FALLBACK    = SITE_CONFIG.languages[0].code;
const supported   = new Set(SITE_CONFIG.languages.map(l => l.code));

// ── DETECT LANGUAGE FROM URL PATH ────────────────────────────────────────────
// Strips base_path prefix, then checks if the first path segment is a known
// language code.  e.g. /test/de/about → 'de',  /test/about → null
export function detectLangFromURL() {
    const base = SITE_CONFIG.appearance.base_path; // e.g. '/test/'
    let   path = window.location.pathname;

    // Remove base_path prefix so we work with the relative part only
    if (base && base !== '/' && path.startsWith(base.slice(0, -1))) {
        path = path.slice(base.length - 1); // keep the leading /
    }

    // Split and grab first non-empty segment
    const parts = path.replace(/^\//, '').split('/').filter(Boolean);
    if (parts.length > 0 && supported.has(parts[0])) {
        return parts[0];
    }
    return null;
}

// ── DETECT (full priority chain) ─────────────────────────────────────────────
function detectLang() {
    // 1. URL path
    const fromURL = detectLangFromURL();
    if (fromURL) {
        localStorage.setItem(STORAGE_KEY, fromURL);
        return fromURL;
    }

    // 2. localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supported.has(saved)) return saved;

    // 3. Browser preference
    const match = (navigator.languages || [navigator.language])
        .map(l => l.split('-')[0].toLowerCase())
        .find(l => supported.has(l));

    if (match) {
        localStorage.setItem(STORAGE_KEY, match);
        return match;
    }

    // 4. Fallback
    return FALLBACK;
}

// ── LOAD JSON ─────────────────────────────────────────────────────────────────
async function loadTranslations(code) {
    const base = SITE_CONFIG.appearance.base_path;
    try {
        const res = await fetch(`${base}lang/${code}.json`);
        if (!res.ok) throw new Error();
        return await res.json();
    } catch {
        if (code !== FALLBACK) {
            const res = await fetch(`${base}lang/${FALLBACK}.json`);
            return await res.json();
        }
        return {};
    }
}

// ── HREFLANG ─────────────────────────────────────────────────────────────────
export function injectHreflangTags(slug = '') {
    const base = SITE_CONFIG.appearance.root_url;
    const path = slug ? `/${slug}` : '';

    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    SITE_CONFIG.languages.forEach(({ code, hreflang }) => {
        const link    = document.createElement('link');
        link.rel      = 'alternate';
        link.hreflang = hreflang;
        link.href     = code === FALLBACK ? `${base}${path}` : `${base}/${code}${path}`;
        document.head.appendChild(link);
    });

    const xDef    = document.createElement('link');
    xDef.rel      = 'alternate';
    xDef.hreflang = 'x-default';
    xDef.href     = `${base}${path}`;
    document.head.appendChild(xDef);
}

// ── SET LANG (called from settings UI or page-loader) ────────────────────────
window.setLang = async (code) => {
    if (!supported.has(code)) return;
    localStorage.setItem(STORAGE_KEY, code);
    window.LANG = code;
    document.documentElement.setAttribute('lang', code);

    window.T = await loadTranslations(code);

    // Re-render nav and footer with new labels
    if (typeof window.renderNav    === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();

    // Update the language selector dropdown to match (if it exists)
    const langSelect = document.getElementById('langSelect');
    if (langSelect) langSelect.value = code;

    // Reload content in new language — push new URL
    const slug = window.CURRENT_SLUG || '';
    if (slug) {
        window.viewPage(slug);
    } else {
        window.loadHome();
        // Update URL to reflect new language
        const base   = SITE_CONFIG.appearance.base_path;
        const newURL = code === FALLBACK ? base : `${base}${code}/`;
        window.history.pushState({}, '', newURL);
    }
};

// ── INIT ─────────────────────────────────────────────────────────────────────
export async function initI18n() {
    const lang = detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    window.T = await loadTranslations(lang);
    injectHreflangTags();
    if (typeof window.renderNav    === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();
}
