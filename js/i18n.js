/**
 * i18n.js — Data loaders, country/language helpers, and language switching
 */

import SITE_CONFIG from './config.js';
import ENV_CONFIG  from './env-config.js';

const STORAGE_KEY = SITE_CONFIG.storageKeys.lang;
const BASE        = () => SITE_CONFIG.appearance.base_path;

// Hardcoded fallback languages (matches your /lang/XX/ directory structure)
const FALLBACK_LANGUAGES = [
    { code: 'en', hreflang: 'en' },
    { code: 'de', hreflang: 'de' },
    { code: 'es', hreflang: 'es' },
    { code: 'fr', hreflang: 'fr' },
    { code: 'it', hreflang: 'it' },
    { code: 'nl', hreflang: 'nl' },
    { code: 'pt', hreflang: 'pt' },
    { code: 'cs', hreflang: 'cs' },
];

// Get supported languages with fallback if countries.json hasn't loaded
function getSupportedLanguages() {
    if (SITE_CONFIG.languages && SITE_CONFIG.languages.length > 0) {
        return SITE_CONFIG.languages;
    }
    return FALLBACK_LANGUAGES;
}

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
    const languages = getSupportedLanguages();
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
    xDef.href = slug ? `${root}/${languages[0].code}/${getSlug(langData, slug)}/` : `${root}/`;
    document.head.appendChild(xDef);
}

// ── LANGUAGE DETECTION ────────────────────────────────────────────────────────

function detectLang() {
    const languages = getSupportedLanguages();
    const supported = new Set(languages.map(l => l.code));

    const pageLang = window.__PAGE_LANG__;
    if (pageLang && supported.has(pageLang)) {
        setStoredLanguage(pageLang);
        return pageLang;
    }

    const saved = getStoredLanguage();
    if (saved && supported.has(saved)) return saved;

    const match = (navigator.languages || [navigator.language])
        .map(l => l.split('-')[0].toLowerCase())
        .find(l => supported.has(l));
    if (match) { setStoredLanguage(match); return match; }

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

    if (typeof window.Shop !== 'undefined' && typeof window.Shop.switchLanguage === 'function') {
        try {
            await window.Shop.switchLanguage(code);
        } catch (e) {
            if (ENV_CONFIG.DEBUG) console.warn('[i18n] Shop.switchLanguage failed:', e);
        }
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
