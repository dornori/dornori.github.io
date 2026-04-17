/**
 * i18n.js — Language detection, JSON loading, and switching
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

    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    SITE_CONFIG.languages.forEach(({ code, hreflang }) => {
        const link    = document.createElement('link');
        link.rel      = 'alternate';
        link.hreflang = hreflang;
        if (slug) {
            const urlSlug = SITE_CONFIG.pageUrlSlug(slug, code);
            link.href = code === FALLBACK
                ? `${base}/en/${urlSlug}/`
                : `${base}/${code}/${urlSlug}/`;
        } else {
            link.href = `${base}/`;
        }
        document.head.appendChild(link);
    });

    const xDef    = document.createElement('link');
    xDef.rel      = 'alternate';
    xDef.hreflang = 'x-default';
    xDef.href     = slug ? `${base}/en/${SITE_CONFIG.pageUrlSlug(slug, 'en')}/` : `${base}/`;
    document.head.appendChild(xDef);
}

// ── SET LANG (called from settings UI) ───────────────────────────────────────
window.setLang = async (code) => {
    if (!supported.has(code)) return;
    localStorage.setItem(STORAGE_KEY, code);
    window.LANG = code;
    document.documentElement.setAttribute('lang', code);

    window.T = await loadTranslations(code);

    // Re-render nav and footer with new labels and new URLs
    if (typeof window.renderNav    === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();

    // Reload content in new language and update URL
    const slug = window.CURRENT_SLUG || '';
    if (slug) {
        // Update URL to match the new language's pretty URL for this page
        const base    = SITE_CONFIG.appearance.base_path;
        const urlSlug = SITE_CONFIG.pageUrlSlug(slug, code);
        const newUrl  = code === 'en'
            ? `${base}en/${urlSlug}/`
            : `${base}${code}/${urlSlug}/`;
        window.history.replaceState({ slug, lang: code }, '', newUrl);

        window.viewPage(slug);
    } else {
        window.loadHome();
    }

    // Update lang select to reflect new choice
    const langSelect = document.getElementById('langSelect');
    if (langSelect) langSelect.value = code;
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
