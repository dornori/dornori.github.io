import SITE_CONFIG from './config.js';

// ... (keep everything else, but change the detection function)

const STORAGE_KEY = SITE_CONFIG.storageKey;
const FALLBACK    = SITE_CONFIG.languages[0].code;
const supported   = new Set(SITE_CONFIG.languages.map(l => l.code));

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

export function getPageUrl(slug, lang = null) {
    const targetLang = lang || window.LANG || FALLBACK;
    const slugs = SITE_CONFIG.url_slugs[targetLang];
    const localSlug = slugs?.[slug] || slug;
    return targetLang === FALLBACK ? `/${localSlug}` : `/${targetLang}/${localSlug}`;
}

export function parseUrlPath(pathname) {
    const parts = pathname.replace(/^\//, '').split('/').filter(Boolean);
    if (parts.length === 0) return { lang: null, slug: null };
    
    const first = parts[0];
    const langMatch = SITE_CONFIG.languages.find(l => l.code === first);
    
    if (langMatch) {
        const rest = parts.slice(1).join('/');
        let canonicalSlug = null;
        const urlSlugsForLang = SITE_CONFIG.url_slugs[langMatch.code];
        for (const [canonical, localized] of Object.entries(urlSlugsForLang)) {
            if (rest === localized) {
                canonicalSlug = canonical;
                break;
            }
        }
        if (!canonicalSlug && SITE_CONFIG.pages[rest]) {
            canonicalSlug = rest;
        }
        return { lang: langMatch.code, slug: canonicalSlug };
    } else {
        const canonicalSlug = SITE_CONFIG.pages[first] ? first : null;
        return { lang: FALLBACK, slug: canonicalSlug };
    }
}

export function injectHreflangTags(slug = '') {
    const base = SITE_CONFIG.appearance.root_url;
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    SITE_CONFIG.languages.forEach(({ code, hreflang }) => {
        const url = slug ? `${base}${getPageUrl(slug, code)}` : `${base}${code === FALLBACK ? '' : `/${code}`}`;
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = hreflang;
        link.href = url;
        document.head.appendChild(link);
    });

    const xDef = document.createElement('link');
    xDef.rel = 'alternate';
    xDef.hreflang = 'x-default';
    xDef.href = slug ? `${base}${getPageUrl(slug, FALLBACK)}` : base;
    document.head.appendChild(xDef);
}

window.setLang = async (code) => {
    if (!supported.has(code)) return;
    localStorage.setItem(SITE_CONFIG.storageKey, code);
    window.LANG = code;
    document.documentElement.setAttribute('lang', code);

    window.T = await loadTranslations(code);

    if (typeof window.renderNav === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();

    const slug = window.CURRENT_SLUG || '';
    if (slug) {
        const newUrl = getPageUrl(slug, code);
        window.history.pushState({ slug, lang: code }, '', newUrl);
        window.viewPage(slug);
    } else {
        window.loadHome();
    }
};

export async function initI18n() {
    const lang = detectLang();
    window.LANG = lang;
    document.documentElement.setAttribute('lang', lang);
    window.T = await loadTranslations(lang);
    injectHreflangTags();
    if (typeof window.renderNav === 'function') window.renderNav();
    if (typeof window.renderFooter === 'function') window.renderFooter();
}
