import SITE_CONFIG from './config.js';

// Profiles are visual themes - these don't come from config (keep as is)
const PROFILES = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'cutting-mat', label: 'Cutting Mat' },
    { id: 'cutting-blue', label: 'Cutting Blue' },
];

const FALLBACK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <line x1="12" y1="8" x2="12" y2="13"/>
    <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none"/>
</svg>`;

const svgCache = new Map();
async function fetchSVG(path) {
    if (svgCache.has(path)) return svgCache.get(path);
    try {
        const fullPath = SITE_CONFIG.getAssetPath(path);
        const res = await fetch(fullPath);
        if (!res.ok) throw new Error();
        const svg = await res.text();
        svgCache.set(path, svg);
        return svg;
    } catch {
        svgCache.set(path, FALLBACK_SVG);
        return FALLBACK_SVG;
    }
}

function getPageUrl(slug) {
    const lang = window.LANG || SITE_CONFIG.default_language;
    return SITE_CONFIG.getPageUrl(lang, slug);
}

window.renderNav = () => {
    const T = window.T || {};

    const desktopNav = document.querySelector('.top-nav');
    if (desktopNav) {
        desktopNav.innerHTML = '';
        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;
            const t = T.nav?.[item.slug] || {};
            
            const a = document.createElement('a');
            a.href = getPageUrl(item.slug);
            a.className = item.type === 'button' ? 'nav-link nav-newsletter' : 'nav-link';
            
            const iconEl = document.createElement('span');
            iconEl.className = 'nav-icon';
            iconEl.innerHTML = FALLBACK_SVG;
            
            const labelEl = document.createElement('span');
            labelEl.textContent = t.label || item.slug;
            
            a.appendChild(iconEl);
            a.appendChild(labelEl);
            desktopNav.appendChild(a);
            
            if (item.icon) fetchSVG(item.icon).then(svg => { iconEl.innerHTML = svg; });
        });
    }

    const mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) {
        mobileNav.innerHTML = '';
        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;
            const t = T.nav?.[item.slug] || {};
            
            const a = document.createElement('a');
            a.href = getPageUrl(item.slug);
            a.className = item.type === 'button' ? 'mobile-nav-item mobile-nav-cta' : 'mobile-nav-item';
            
            const iconEl = document.createElement('span');
            iconEl.className = 'mobile-nav-icon';
            iconEl.innerHTML = FALLBACK_SVG;
            
            const labelEl = document.createElement('span');
            labelEl.className = 'mobile-nav-label';
            labelEl.textContent = t.mobileLabel || t.label || item.slug;
            
            a.appendChild(iconEl);
            a.appendChild(labelEl);
            mobileNav.appendChild(a);
            
            if (item.icon) fetchSVG(item.icon).then(svg => { iconEl.innerHTML = svg; });
        });
    }
};

export function initNavigation() {
    const THEME_KEY = 'dornori-theme';
    const root = document.documentElement;
    const saved = localStorage.getItem(THEME_KEY) || 'cutting-mat';
    root.setAttribute('data-theme', saved);

    const topBar = document.getElementById('topBar');
    if (topBar) {
        const T = window.T?.ui || {};

        // Profile selector
        const profileWrap = document.createElement('label');
        profileWrap.className = 'profile-selector-wrap';
        profileWrap.textContent = (T.profile || 'PROFILE') + ' ';
        const profileSelect = document.createElement('select');
        profileSelect.id = 'profileSelect';
        profileSelect.className = 'profile-select';
        profileSelect.setAttribute('aria-label', 'Choose colour profile');
        profileSelect.setAttribute('tabindex', '-1');
        
        PROFILES.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.label.toUpperCase();
            if (p.id === saved) opt.selected = true;
            profileSelect.appendChild(opt);
        });
        
        profileSelect.addEventListener('change', () => {
            root.setAttribute('data-theme', profileSelect.value);
            localStorage.setItem(THEME_KEY, profileSelect.value);
        });
        profileWrap.appendChild(profileSelect);
        topBar.appendChild(profileWrap);

        // Language selector - uses config languages
        const langWrap = document.createElement('label');
        langWrap.className = 'profile-selector-wrap';
        langWrap.textContent = (T.language || 'LANGUAGE') + ' ';
        const langSelect = document.createElement('select');
        langSelect.id = 'langSelect';
        langSelect.className = 'profile-select';
        langSelect.setAttribute('aria-label', 'Choose language');
        langSelect.setAttribute('tabindex', '-1');
        
        const currentLang = window.LANG || SITE_CONFIG.default_language;
        
        SITE_CONFIG.languages.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.code;
            opt.textContent = `${l.flag} ${l.label}`;
            if (l.code === currentLang) opt.selected = true;
            langSelect.appendChild(opt);
        });
        
        langSelect.addEventListener('change', () => {
            if (typeof window.setLang === 'function') window.setLang(langSelect.value);
        });
        langWrap.appendChild(langSelect);
        topBar.appendChild(langWrap);

        // Settings gear tab
        const tab = document.createElement('button');
        tab.id = 'topBar-tab';
        tab.setAttribute('aria-label', 'Open settings');
        tab.setAttribute('aria-expanded', 'false');
        tab.setAttribute('aria-controls', 'topBar');
        tab.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                 stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06
                         a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09
                         A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83
                         l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
                         A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83
                         l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09
                         a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83
                         l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09
                         a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>${T.settings || 'SETTINGS'}</span>
        `;
        topBar.appendChild(tab);

        const openBar = () => {
            topBar.classList.add('active');
            tab.setAttribute('aria-expanded', 'true');
            tab.setAttribute('aria-label', 'Close settings');
            profileSelect.setAttribute('tabindex', '0');
            langSelect.setAttribute('tabindex', '0');
            profileSelect.focus();
        };
        const closeBar = () => {
            topBar.classList.remove('active');
            tab.setAttribute('aria-expanded', 'false');
            tab.setAttribute('aria-label', 'Open settings');
            profileSelect.setAttribute('tabindex', '-1');
            langSelect.setAttribute('tabindex', '-1');
        };

        tab.addEventListener('click', e => {
            e.stopPropagation();
            topBar.classList.contains('active') ? closeBar() : openBar();
        });
        document.addEventListener('click', e => { if (!topBar.contains(e.target)) closeBar(); });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && topBar.classList.contains('active')) { closeBar(); tab.focus(); }
        });

        const isFinePointer = window.matchMedia('(pointer: fine)');
        if (isFinePointer.matches) {
            topBar.addEventListener('mouseenter', openBar);
            topBar.addEventListener('mouseleave', closeBar);
        }
        isFinePointer.addEventListener('change', e => {
            if (e.matches) {
                topBar.addEventListener('mouseenter', openBar);
                topBar.addEventListener('mouseleave', closeBar);
            } else {
                topBar.removeEventListener('mouseenter', openBar);
                topBar.removeEventListener('mouseleave', closeBar);
            }
        });
    }
    window.renderNav();
}
