/**
 * i18n.js — Language detection, JSON loading, and switching
 */

import SITE_CONFIG from './config.js';

const STORAGE_KEY = SITE_CONFIG.storageKeys.lang;

// ── DETECT ───────────────────────────────────────────────────────────────────
function detectLang() {
    const FALLBACK = SITE_CONFIG.fallbackLang();
    const supported = SITE_CONFIG.supportedLangCodes();

    const pageLang = window.__PAGE_LANG__;
    if (pageLang && supported.has(pageLang)) {
        localStorage.setItem(STORAGE_KEY, pageLang);
        return pageLang;
    }

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
    const FALLBACK = SITE_CONFIG.fallbackLang();
    const base     = SITE_CONFIG.appearance.base_path;
    const langDir  = SITE_CONFIG.paths.lang_dir;
    try {
        const res = await fetch(`${base}${langDir}${code}.json`);
        if (!res.ok) throw new Error();
        return await res.json();
    } catch {
        if (code !== FALLBACK) {
            const res = await fetch(`${base}${langDir}${FALLBACK}.json`);
            return await res.json();
        }
        return {};
    }
}

// ── HREFLANG ─────────────────────────────────────────────────────────────────
export function injectHreflangTags(slug = '') {
    const base     = SITE_CONFIG.appearance.root_url;
    const FALLBACK = SITE_CONFIG.fallbackLang();

    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    SITE_CONFIG.languages.forEach(({ code, hreflang }) => {
        const link    = document.createElement('link');
        link.rel      = 'alternate';
        link.hreflang = hreflang;
        if (slug) {
            const urlSlug = SITE_CONFIG.pageUrlSlug(slug, code);
            link.href = `${base}/${code}/${urlSlug}/`;
        } else {
            link.href = `${base}/`;
        }
        document.head.appendChild(link);
    });

    const xDef    = document.createElement('link');
    xDef.rel      = 'alternate';
    xDef.hreflang = 'x-default';
    xDef.href     = slug ? `${base}/${FALLBACK}/${SITE_CONFIG.pageUrlSlug(slug, FALLBACK)}/` : `${base}/`;
    document.head.appendChild(xDef);
}

// ── SET LANG (called from settings UI and geo-popup) ─────────────────────────
window.setLang = async (code) => {
    const supported = SITE_CONFIG.supportedLangCodes();
    if (!supported.has(code)) return;
    localStorage.setItem(STORAGE_KEY, code);
    window.LANG = code;
    document.documentElement.setAttribute('lang', code);

    window.T = await loadTranslations(code);

    if (typeof window.renderNav    === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();

    if (typeof Shop !== 'undefined' && typeof Shop.switchLanguage === 'function') {
        try { await Shop.switchLanguage(code); } catch (e) {}
    }

    const slug = window.CURRENT_SLUG || '';
    if (slug) {
        const FALLBACK = SITE_CONFIG.fallbackLang();
        const base     = SITE_CONFIG.appearance.base_path;
        const urlSlug  = SITE_CONFIG.pageUrlSlug(slug, code);
        const newUrl   = `${base}${code}/${urlSlug}/`;
        window.history.replaceState({ slug, lang: code }, '', newUrl);
        window.viewPage(slug);
    } else {
        window.loadHome();
    }

    const langSelect = document.getElementById('langSelect');
    if (langSelect) langSelect.value = code;
};

// ── INIT ─────────────────────────────────────────────────────────────────────
export async function initI18n() {
    await SITE_CONFIG.initCountries();      // load countries.json → derives languages
    const lang = detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    window.T = await loadTranslations(lang);
    injectHreflangTags();
    if (typeof window.renderNav    === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();
}
