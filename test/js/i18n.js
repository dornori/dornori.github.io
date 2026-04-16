import SITE_CONFIG from './config.js';

const STORAGE_KEY = 'dornori-lang';
const FALLBACK = SITE_CONFIG.default_language;
const supported = new Set(SITE_CONFIG.getLanguageCodes());

function detectLang() {
    // Get base path from config dynamically
    const cleanBase = SITE_CONFIG.getCleanBasePath();
    const basePattern = cleanBase ? `/${cleanBase}/` : '/';
    
    // Build regex pattern dynamically from config
    const langPattern = SITE_CONFIG.getLanguageCodes().join('|');
    const pattern = new RegExp(`^${basePattern}(${langPattern})/`);
    const pathMatch = window.location.pathname.match(pattern);
    
    if (pathMatch && supported.has(pathMatch[1])) {
        const urlLang = pathMatch[1];
        localStorage.setItem(STORAGE_KEY, urlLang);
        return urlLang;
    }
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supported.has(saved)) {
        return saved;
    }

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
    const basePath = SITE_CONFIG.base_path || '/';
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
    const cleanBase = SITE_CONFIG.getCleanBasePath();
    const basePattern = cleanBase ? `/${cleanBase}/` : '/';
    
    let newPath = currentPath.replace(`${basePattern}${currentLang}/`, `${basePattern}${code}/`);
    
    if (newPath === currentPath) {
        newPath = SITE_CONFIG.getPageUrl(code);
    }
    
    window.location.href = newPath;
};

export async function initI18n() {
    const lang = detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    window.T = await loadTranslations(lang);
    
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.value = lang;
    }
    
    if (typeof window.renderNav === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();
}
