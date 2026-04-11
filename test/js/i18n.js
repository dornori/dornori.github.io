/**
 * i18n.js — Language detection, JSON loading, and switching
 * ─────────────────────────────────────────────────────────────────────────────
 * - Detects language from localStorage, then navigator.languages, then fallback
 * - Fetches lang/{code}.json and exposes it as window.T
 * - Re-renders nav, footer, and page content when language is switched
 * - Injects hreflang tags for SEO
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

// ── DETECT ───────────────────────────────────────────────────────────────────
function detectLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supported.has(saved)) return saved;

    const match = (navigator.languages || [navigator.language])
        .map(l => l.split('-')[0].toLowerCase())
        .find(l => supported.has(l));

    if (match) {
        localStorage.setItem(STORAGE_KEY, match);
        return match;
    }

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
        // If translation file missing, fall back to English
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

// ── SET LANG (called from settings UI) ───────────────────────────────────────
window.setLang = async (code) => {
    if (!supported.has(code)) return;
    localStorage.setItem(STORAGE_KEY, code);
    window.LANG = code;
    document.documentElement.setAttribute('lang', code);

    window.T = await loadTranslations(code);

    // Re-render nav and footer with new labels
    if (typeof window.renderNav    === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();

    // Reload content in new language
    const slug = window.CURRENT_SLUG || '';
    if (slug) {
        window.viewPage(slug);
    } else {
        window.loadHome();
    }
};

// ── INIT ─────────────────────────────────────────────────────────────────────
export async function initI18n() {
    const lang = detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    window.T = await loadTranslations(lang);
    injectHreflangTags();
}
