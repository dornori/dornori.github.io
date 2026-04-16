import SITE_CONFIG from './config.js';

const STORAGE_KEY = 'dornori-lang';
const FALLBACK = SITE_CONFIG.languages[0].code;
const supported = new Set(SITE_CONFIG.languages.map(l => l.code));

function detectLang() {
    // 1. Check URL path for language (/test/en/about/ -> 'en')
    const pathMatch = window.location.pathname.match(/\/test\/([a-z]{2})\//);
    if (pathMatch && supported.has(pathMatch[1])) {
        const urlLang = pathMatch[1];
        localStorage.setItem(STORAGE_KEY, urlLang);
        return urlLang;
    }
    
    // 2. Check saved preference
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supported.has(saved)) {
        return saved;
    }

    // 3. Fallback to browser language
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
    const basePath = SITE_CONFIG.appearance.base_path || '/';
    try {
        const res = await fetch(`${basePath}lang/${code}.json`);
        if (!res.ok) throw new Error();
        return await res.json();
    } catch {
        if (code !== FALLBACK) {
            const res = await fetch(`${basePath}lang/${FALLBACK}.json`);
            return await res.json();
        }
        return {};
    }
}

window.setLang = (code) => {
    if (!supported.has(code)) return;
    
    localStorage.setItem(STORAGE_KEY, code);
    
    let currentPath = window.location.pathname;
    const currentLang = detectLang();
    
    // Replace language in path
    let newPath = currentPath.replace(`/test/${currentLang}/`, `/test/${code}/`);
    
    if (newPath === currentPath) {
        const basePath = SITE_CONFIG.appearance.base_path || '/';
        const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
        const rest = currentPath.replace(cleanBase, '');
        newPath = `${cleanBase}/${code}${rest}`;
    }
    
    window.location.href = newPath;
};

export async function initI18n() {
    const lang = detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    window.T = await loadTranslations(lang);
    
    // Update language selector dropdown
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.value = lang;
    }
    
    // Re-render nav and footer with new translations
    if (typeof window.renderNav === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();
}
