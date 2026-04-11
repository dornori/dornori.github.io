/**
 * nav-loader.js
 */

import SITE_CONFIG from './config.js';

const PROFILES = [
    { id: 'dark',        label: 'Dark'        },
    { id: 'light',       label: 'Light'       },
    { id: 'cutting-mat', label: 'Cutting Mat' },
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
        const res = await fetch(path);
        if (!res.ok) throw new Error();
        const svg = await res.text();
        svgCache.set(path, svg);
        return svg;
    } catch {
        svgCache.set(path, FALLBACK_SVG);
        return FALLBACK_SVG;
    }
}

function navHref(slug) {
    const lang = window.LANG || 'en';
    const base = SITE_CONFIG.appearance.base_path;
    return lang === 'en' ? `${base}${slug}` : `${base}${lang}/${slug}`;
}

window.renderNav = () => {
    const T = window.T || {};
    const desktopNav = document.querySelector('.top-nav');

    if (!desktopNav) return;

    desktopNav.innerHTML = '';

    SITE_CONFIG.navigation.forEach(item => {
        if (!item.enabled) return;

        const t = T.nav?.[item.slug] || {};

        const a = document.createElement('a');
        a.href = navHref(item.slug);
        a.className = 'nav-link';
        a.setAttribute('data-slug', item.slug);

        const iconEl = document.createElement('span');
        iconEl.className = 'nav-icon';
        iconEl.innerHTML = FALLBACK_SVG;

        const labelEl = document.createElement('span');
        labelEl.textContent = t.label || item.slug;

        a.appendChild(iconEl);
        a.appendChild(labelEl);

        a.addEventListener('click', e => {
            e.preventDefault();
            window.viewPage(item.slug);
        });

        desktopNav.appendChild(a);

        if (item.icon) {
            fetchSVG(item.icon).then(svg => {
                iconEl.innerHTML = svg;
            });
        }
    });
};

export function initNavigation() {

    const THEME_KEY = 'dornori-theme';
    const root = document.documentElement;
    const saved = localStorage.getItem(THEME_KEY) || 'cutting-mat';
    root.setAttribute('data-theme', saved);

    const topBar = document.getElementById('topBar');
    if (!topBar) return;

    const T = window.T?.ui || {};

    /* ===== PROFILE ===== */
    const profileWrap = document.createElement('label');
    profileWrap.className = 'profile-selector-wrap';
    profileWrap.textContent = (T.profile || 'PROFILE') + ' ';

    const profileSelect = document.createElement('select');
    profileSelect.className = 'profile-select';

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

    /* ===== LANGUAGE ===== */
    const langWrap = document.createElement('label');
    langWrap.className = 'profile-selector-wrap';
    langWrap.textContent = (T.language || 'LANGUAGE') + ' ';

    const langSelect = document.createElement('select');
    langSelect.className = 'profile-select';

    SITE_CONFIG.languages.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.code;
        opt.textContent = `${l.flag} ${l.label}`;
        langSelect.appendChild(opt);
    });

    langSelect.addEventListener('change', () => {
        if (window.setLang) window.setLang(langSelect.value);
    });

    langWrap.appendChild(langSelect);
    topBar.appendChild(langWrap);

    /* ===== SETTINGS TAB ===== */
    const tab = document.createElement('button');
    tab.id = 'topBar-tab';
    tab.textContent = '⚙ SETTINGS';
    topBar.appendChild(tab);

    const isTouch = window.matchMedia("(hover: none)").matches;

    if (isTouch) {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            topBar.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!topBar.contains(e.target)) {
                topBar.classList.remove('active');
            }
        });
    }

    window.renderNav();
}
