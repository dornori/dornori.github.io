import SITE_CONFIG from './config.js';

const STORAGE_KEY = 'dornori-lang';
const FALLBACK = SITE_CONFIG.languages[0].code;
const supported = new Set(SITE_CONFIG.languages.map(l => l.code));

function detectLang() {
    // First, check URL path for language
    const pathMatch = window.location.pathname.match(/^\/([a-z]{2})\//);
    if (pathMatch && supported.has(pathMatch[1])) {
        return pathMatch[1];
    }
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supported.has(saved)) return saved;

    const browserMatch = (navigator.languages || [navigator.language])
        .map(l => l.split('-')[0].toLowerCase())
        .find(l => supported.has(l));

    if (browserMatch) {
        localStorage.setItem(STORAGE_KEY, browserMatch);
        return browserMatch;
    }

    return FALLBACK;
}

async function loadTranslations(code) {
    try {
        const res = await fetch(`/lang/${code}.json`);
        if (!res.ok) throw new Error();
        return await res.json();
    } catch {
        if (code !== FALLBACK) {
            const res = await fetch(`/lang/${FALLBACK}.json`);
            return await res.json();
        }
        return {};
    }
}

export function injectHreflangTags(slug = '') {
    const base = SITE_CONFIG.appearance.root_url;
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    SITE_CONFIG.languages.forEach(({ code, hreflang }) => {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = hreflang;
        link.href = slug ? `${base}/${code}/${slug}/` : `${base}/${code}/`;
        document.head.appendChild(link);
    });
}

// Language switcher - redirect to same page in new language
window.setLang = (code) => {
    if (!supported.has(code)) return;
    localStorage.setItem(STORAGE_KEY, code);
    
    // Get current path and replace language prefix
    const currentPath = window.location.pathname;
    const currentLang = detectLang();
    const newPath = currentPath.replace(`/${currentLang}/`, `/${code}/`);
    
    window.location.href = newPath;
};

export async function initI18n() {
    const lang = detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    window.T = await loadTranslations(lang);
    injectHreflangTags();
}
