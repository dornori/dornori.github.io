/**
 * i18n.js — Language detection and switching
 * All paths derived from config.js only.
 */

import SITE_CONFIG from './config.js';

const STORAGE_KEY = 'dornori-lang';
const FALLBACK    = SITE_CONFIG.languages[0].code;
const supported   = new Set(SITE_CONFIG.languages.map(l => l.code));

export function detectLangFromURL() {
    const base = SITE_CONFIG.appearance.base_path;
    let path = window.location.pathname;

    // Remove base_path prefix if present
    if (base && base !== '/' && path.startsWith(base.slice(0, -1))) {
        path = path.slice(base.length - 1);
    }

    const parts = path.replace(/^\//, '').split('/').filter(Boolean);
    if (parts.length > 0 && supported.has(parts[0])) {
        return parts[0];
    }
    return null;
}

function detectLang() {
    const fromURL = detectLangFromURL();
    if (fromURL) {
        localStorage.setItem(STORAGE_KEY, fromURL);
        return fromURL;
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

export function injectHreflangTags(slug = '') {
    const base = SITE_CONFIG.appearance.root_url;
    const path = slug ? `/${slug}/` : '/';

    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    SITE_CONFIG.languages.forEach(({ code, hreflang }) => {
        const link    = document.createElement('link');
        link.rel      = 'alternate';
        link.hreflang = hreflang;
        link.href     = code === FALLBACK 
            ? `${base}${path}` 
            : `${base}/${code}${path}`;
        document.head.appendChild(link);
    });

    const xDef = document.createElement('link');
    xDef.rel = 'alternate';
    xDef.hreflang = 'x-default';
    xDef.href = `${base}${path}`;
    document.head.appendChild(xDef);
}

window.setLang = async (code) => {
    if (!supported.has(code)) return;
    localStorage.setItem(STORAGE_KEY, code);
    window.LANG = code;
    document.documentElement.setAttribute('lang', code);

    window.T = await loadTranslations(code);

    if (typeof window.renderNav    === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();

    const langSelect = document.getElementById('langSelect');
    if (langSelect) langSelect.value = code;

    const slug = window.CURRENT_SLUG || '';
    if (slug) window.viewPage(slug);
    else window.showHome();
};

export async function initI18n() {
    const lang = detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    window.T = await loadTranslations(lang);
    injectHreflangTags();
    if (typeof window.renderNav    === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();
}
