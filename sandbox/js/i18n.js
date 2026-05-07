/**
 * i18n.js — Data loaders, country/language helpers, and language switching
 */

import SITE_CONFIG from './config.js';

const STORAGE_KEY = SITE_CONFIG.storageKeys.lang;
const BASE        = () => SITE_CONFIG.appearance.base_path;

/**
 * Fallback supported languages if SITE_CONFIG.languages hasn't loaded yet.
 * These match the physical /lang/ directories and content slugs.
 * Keep in sync with directory structure; update only when adding/removing languages.
 */
const FALLBACK_LANGUAGES = ['en', 'de', 'es', 'fr', 'it', 'nl', 'pt', 'cs'];

// ── DATA LOADERS ─────────────────────────────────────────────────────────────

/**
 * FIX #5: Return cached countries instead of fetching again
 * site-main.js already fetched and cached in window.__countriesCache
 */
export async function loadCountries() {
    // Check window cache first (set by site-main.js)
    if (window.__countriesCache) {
        return window.__countriesCache;
    }
    
    // Fallback: fetch if somehow cache not available
    const url = BASE() + SITE_CONFIG.paths.countries_file;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`[i18n] Failed to load countries: ${res.status}`);
    const data = await res.json();
    window.__countriesCache = data;
    return data;
}

export async function loadLanguage(langCode) {
    const url = BASE() + SITE_CONFIG.paths.lang_dir + langCode + '/common.json';
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch {
        if (langCode !== 'en') return loadLanguage('en');
        return {};
    }
}

// ── COUNTRY HELPERS ───────────────────────────────────────────────────────

export function getActiveCountries(data) {
    return (data || []).filter(c => c.active === true);
}

export function getLanguageByCountry(data, code) {
    const country = (data || []).find(c => c.code === code?.toUpperCase());
    if (!country || !country.active) return null;
    return country.language || null;
}

export function getCurrencyByCountry(data, code) {
    const country = (data || []).find(c => c.code === code?.toUpperCase());
    return country?.currency || null;
}

// ── LANGUAGE DATA HELPERS ─────────────────────────────────────────────────────

export function getCountryName(langData, code, _targetLang) {
    return langData?.country_names?.[code?.toUpperCase()] || code;
}

export function getSlug(langData, pageKey) {
    return langData?.url_slugs?.[pageKey] || pageKey;
}

/** Reverse lookup: URL segment → canonical page key, given current lang bundle */
export function canonicalSlug(langData, urlSegment) {
    const slugs = langData?.url_slugs || {};
    const entry = Object.entries(slugs).find(([, v]) => v === urlSegment);
    return entry ? entry[0] : null;
}

export function cartUrl(basePath, langCode, langData) {
    const slug = langData?.url_slugs?.cart || 'cart';
    return `${basePath}${langCode}/${slug}/`;
}

export function getProfileLabel(langData, profileId) {
    return langData?.profiles?.[profileId] || profileId;
}

// ── STORAGE HELPERS ───────────────────────────────────────────────────────────

export function getStoredLanguage() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function setStoredLanguage(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
}

// ── HREFLANG ─────────────────────────────────────────────────────────────────

export function injectHreflangTags(slug, langData) {
    const languages = SITE_CONFIG.languages;
    const root      = SITE_CONFIG.appearance.root_url;
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    languages.forEach(({ code, hreflang }) => {
        const link    = document.createElement('link');
        link.rel      = 'alternate';
        link.hreflang = hreflang;
        link.href     = slug
            ? `${root}/${code}/${getSlug(langData, slug)}/`
            : `${root}/`;
        document.head.appendChild(link);
    });
    const xDef    = document.createElement('link');
    xDef.rel      = 'alternate';
    xDef.hreflang = 'x-default';
    xDef.href = slug ? `${root}/${SITE_CONFIG.languages[0].code}/${getSlug(langData, slug)}/` : `${root}/`;
    document.head.appendChild(xDef);
}

// ── LANGUAGE DETECTION ────────────────────────────────────────────────────────

/**
 * Get supported language codes, with fallback to hardcoded list if SITE_CONFIG.languages
 * hasn't populated yet (e.g., if countries.json is slow or fails to load).
 * 
 * CRITICAL FIX: This prevents crashes when detectLang() is called before
 * loadAndCacheCountries() finishes in site-main.js
 */
function getSupportedLanguages() {
    // Prefer SITE_CONFIG.languages if populated (ideal case)
    if (SITE_CONFIG.languages && SITE_CONFIG.languages.length > 0) {
        return new Set(SITE_CONFIG.languages.map(l => l.code));
    }
    
    // Fallback to hardcoded list if countries.json hasn't loaded yet
    // This ensures the page doesn't crash while waiting for data
    return new Set(FALLBACK_LANGUAGES);
}

/**
 * Detect the appropriate language for the user.
 * 
 * Priority order:
 * 1. window.__PAGE_LANG__ (set inline in every HTML file) — guaranteed to be set
 * 2. Stored language preference (if in supported set)
 * 3. Browser language (if in supported set)
 * 4. Fallback to 'en' (guaranteed to exist)
 * 
 * CRITICAL FIX: Doesn't crash if countries.json hasn't loaded yet.
 */
function detectLang() {
    const supported = getSupportedLanguages();
    
    // Priority 1: Page language set in HTML (always present, always valid)
    const pageLang = window.__PAGE_LANG__;
    if (pageLang && supported.has(pageLang)) {
        setStoredLanguage(pageLang);
        return pageLang;
    }

    // Priority 2: Stored language preference
    const saved = getStoredLanguage();
    if (saved && supported.has(saved)) return saved;

    // Priority 3: Browser language
    const match = (navigator.languages || [navigator.language])
        .map(l => l.split('-')[0].toLowerCase())
        .find(l => supported.has(l));
    if (match) { setStoredLanguage(match); return match; }

    // Priority 4: Fallback to 'en' (always supported, guaranteed to exist)
    return 'en';
}

// ── SET LANG ──────────────────────────────────────────────────────────────────

window.setLang = async (code) => {
    setStoredLanguage(code);
    window.LANG = code;
    document.documentElement.setAttribute('lang', code);

    window.T = await loadLanguage(code);
    window.__CART_URL__ = cartUrl(BASE(), code, window.T);

    if (typeof window.renderNav    === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();

    if (typeof Shop !== 'undefined' && typeof Shop.switchLanguage === 'function') {
        try {
            await Shop.switchLanguage(code);
            // switchLanguage dispatches shop:langChanged which triggers cart panel re-render
        } catch (e) { console.warn('[i18n] Shop.switchLanguage failed:', e); }
    }

    const slug = window.CURRENT_SLUG || '';
    if (slug) {
        const urlSlug = getSlug(window.T, slug);
        window.history.replaceState({ slug, lang: code }, '', `${BASE()}${code}/${urlSlug}/`);
        window.viewPage(slug);
    } else {
        window.loadHome();
    }

    const langSelect = document.getElementById('langSelect');
    if (langSelect) langSelect.value = code;
};

// ── INIT ──────────────────────────────────────────────────────────────────────

export async function initI18n() {
    const lang  = detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    window.T    = await loadLanguage(lang);
    window.__CART_URL__ = cartUrl(BASE(), lang, window.T);
    injectHreflangTags('', window.T);
}
