import SITE_CONFIG from './config.js';

const STORAGE_KEY = 'dornori-lang';
const FALLBACK    = SITE_CONFIG.languages[0].code; // Usually 'en'
const supported   = new Set(SITE_CONFIG.languages.map(l => l.code));

/**
 * Resolve which language to use following web standards:
 * 1. Explicit User Choice (localStorage)
 * 2. Browser Preference (navigator.languages)
 * 3. Fallback ('en')
 */
async function detectLang() {
    // 1. Saved preference (The user has manually interacted with your site before)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supported.has(saved)) return saved;

    // 2. Browser Preferences (Modern standard)
    // navigator.languages returns an array like ['en-US', 'fr-FR', 'de']
    const browserLanguages = navigator.languages || [navigator.language || ''];
    
    for (const lang of browserLanguages) {
        const code = lang.split('-')[0].toLowerCase();
        if (supported.has(code)) {
            // We don't save to localStorage yet; let them browse first
            return code;
        }
    }

    // 3. Fallback
    return FALLBACK;
}

/**
 * Standard-compliant Hreflang injection
 */
function injectHreflangTags(currentSlug = '') {
    const base = SITE_CONFIG.appearance.root_url;
    const path = currentSlug ? `/${currentSlug}` : '';

    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    SITE_CONFIG.languages.forEach(({ code, hreflang }) => {
        const link = document.createElement('link');
        link.rel      = 'alternate';
        link.hreflang = hreflang;
        // Standard: Always provide absolute URLs for hreflang
        link.href     = `${base}/${code}${path}`;
        document.head.appendChild(link);
    });

    // x-default is critical for SEO - it tells Google what to show if no language matches
    const xDefault = document.createElement('link');
    xDefault.rel      = 'alternate';
    xDefault.hreflang = 'x-default';
    xDefault.href     = `${base}${path}`;
    document.head.appendChild(xDefault);
}

window.setLang = (code) => {
    if (!supported.has(code)) return;
    localStorage.setItem(STORAGE_KEY, code);
    window.LANG = code;
    document.documentElement.setAttribute('lang', code);

    const slug = window.CURRENT_SLUG || '';
    slug ? window.viewPage(slug) : window.loadHome();
};

export async function initI18n() {
    const lang = await detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    injectHreflangTags();
    return lang;
}

export { injectHreflangTags };
