import SITE_CONFIG from './config.js';

const STORAGE_KEY = 'dornori-lang';

function detectLang() {
    const basePath = SITE_CONFIG.base_path;
    const cleanBase = basePath === '/' ? '' : basePath.replace(/\/$/, '');
    
    const langCodes = SITE_CONFIG.languages.map(l => l.code).join('|');
    const pattern = cleanBase 
        ? new RegExp(`^/${cleanBase}/(${langCodes})/`)
        : new RegExp(`^/(${langCodes})/`);
    
    const match = window.location.pathname.match(pattern);
    
    if (match && SITE_CONFIG.languages.some(l => l.code === match[1])) {
        localStorage.setItem(STORAGE_KEY, match[1]);
        return match[1];
    }
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SITE_CONFIG.languages.some(l => l.code === saved)) {
        return saved;
    }

    const browserMatch = (navigator.languages || [navigator.language])
        .map(l => l.split('-')[0].toLowerCase())
        .find(l => SITE_CONFIG.languages.some(lang => lang.code === l));

    if (browserMatch) {
        localStorage.setItem(STORAGE_KEY, browserMatch);
        return browserMatch;
    }

    return SITE_CONFIG.default_language;
}

async function loadTranslations(code) {
    const basePath = SITE_CONFIG.base_path;
    try {
        const res = await fetch(`${basePath}lang/${code}.json`);
        if (!res.ok) throw new Error();
        return await res.json();
    } catch {
        if (code !== SITE_CONFIG.default_language) {
            const res = await fetch(`${basePath}lang/${SITE_CONFIG.default_language}.json`);
            return await res.json();
        }
        return {};
    }
}

window.setLang = (code) => {
    if (!SITE_CONFIG.languages.some(l => l.code === code)) return;
    
    localStorage.setItem(STORAGE_KEY, code);
    
    const currentPath = window.location.pathname;
    const currentLang = detectLang();
    const basePath = SITE_CONFIG.base_path;
    const cleanBase = basePath === '/' ? '' : basePath.replace(/\/$/, '');
    
    const oldPattern = cleanBase ? `/${cleanBase}/${currentLang}/` : `/${currentLang}/`;
    const newPattern = cleanBase ? `/${cleanBase}/${code}/` : `/${code}/`;
    
    const newPath = currentPath.replace(oldPattern, newPattern);
    window.location.href = newPath;
};

export async function initI18n() {
    const lang = detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    window.T = await loadTranslations(lang);
    
    const langSelect = document.getElementById('langSelect');
    if (langSelect) langSelect.value = lang;
    
    if (typeof window.renderNav === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();
}
