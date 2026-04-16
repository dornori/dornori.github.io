/**
 * i18n.js — Language detection, JSON loading, and switching
 * ─────────────────────────────────────────────────────────────────────────────
 * - Detects language from localStorage, then navigator.languages, then fallback
 * - Fetches lang/{code}.json and exposes it as window.T
 * - Re-renders nav, footer, and page content when language is switched
 * - Injects hreflang tags for SEO
 * - Provides getPageUrl(slug) for localized URL generation
 * - Provides parseUrlPath() for parsing incoming URLs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import SITE_CONFIG from './config.js';

const STORAGE_KEY = SITE_CONFIG.storageKey;
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

// ── URL HELPERS ──────────────────────────────────────────────────────────────
// Get the localized URL path for a given slug in a given language
export function getPageUrl(slug, lang = null) {
    const targetLang = lang || window.LANG || FALLBACK;
    const slugs = SITE_CONFIG.url_slugs[targetLang];
    const localSlug = slugs?.[slug] || slug;
    return targetLang === FALLBACK ? `/${localSlug}` : `/${targetLang}/${localSlug}`;
}

// Parse current URL path to extract { lang, slug }
// Returns { lang: 'en', slug: 'about' } or { lang: null, slug: null } for home
export function parseUrlPath(pathname) {
    const parts = pathname.replace(/^\//, '').split('/').filter(Boolean);
    if (parts.length === 0) return { lang: null, slug: null };
    
    // Check if first part is a language code
    const first = parts[0];
    const langMatch = SITE_CONFIG.languages.find(l => l.code === first);
    
    if (langMatch) {
        // /en/about  -> lang='en', rest='about'
        const rest = parts.slice(1).join('/');
        // Find canonical slug by reverse lookup in url_slugs for this language
        let canonicalSlug = null;
        const urlSlugsForLang = SITE_CONFIG.url_slugs[langMatch.code];
        for (const [canonical, localized] of Object.entries(urlSlugsForLang)) {
            if (rest === localized) {
                canonicalSlug = canonical;
                break;
            }
        }
        // If no match, maybe the rest is already a canonical slug (like 'about')
        if (!canonicalSlug && SITE_CONFIG.pages[rest]) {
            canonicalSlug = rest;
        }
        return { lang: langMatch.code, slug: canonicalSlug };
    } else {
        // /about  -> lang=fallback, slug='about'
        const canonicalSlug = SITE_CONFIG.pages[first] ? first : null;
        return { lang: FALLBACK, slug: canonicalSlug };
    }
}

// ── HREFLANG ─────────────────────────────────────────────────────────────────
export function injectHreflangTags(slug = '') {
    const base = SITE_CONFIG.appearance.root_url;
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    SITE_CONFIG.languages.forEach(({ code, hreflang }) => {
        const url = slug ? `${base}${getPageUrl(slug, code)}` : `${base}${code === FALLBACK ? '' : `/${code}`}`;
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = hreflang;
        link.href = url;
        document.head.appendChild(link);
    });

    const xDef = document.createElement('link');
    xDef.rel = 'alternate';
    xDef.hreflang = 'x-default';
    xDef.href = slug ? `${base}${getPageUrl(slug, FALLBACK)}` : base;
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
    if (typeof window.renderNav === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();

    // Reload content in new language, preserving current slug
    const slug = window.CURRENT_SLUG || '';
    if (slug) {
        // Push new URL for the same slug in the new language
        const newUrl = getPageUrl(slug, code);
        window.history.pushState({ slug, lang: code }, '', newUrl);
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
    // Render nav and footer now that T is ready
    if (typeof window.renderNav === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();
}
