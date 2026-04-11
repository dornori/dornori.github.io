/**
 * nav-loader.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Theme setup + persistence
 * 2. Settings tab (#topBar) — profile selector + language selector
 * 3. Desktop nav  (.top-nav)  — <a href> tags so Google can crawl them
 * 4. Mobile nav   (#mobile-nav) — same, <a href> tags
 *
 * WHY <a> INSTEAD OF <button>
 * ─────────────────────────────────────────────────────────────────────────────
 * Google does not reliably execute JavaScript when crawling. Using real
 * <a href="/about"> tags means the crawler can discover and index all pages.
 * We intercept the click in JS to keep the SPA behaviour (no full page reload).
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
        if (!res.ok) throw new Error(`${res.status}`);
        const svg = await res.text();
        svgCache.set(path, svg);
        return svg;
    } catch {
        svgCache.set(path, FALLBACK_SVG);
        return FALLBACK_SVG;
    }
}

// Build the href for a nav item.
// English uses clean /slug; other languages use /lang/slug.
function navHref(slug) {
    const lang = window.LANG || 'en';
    const base = SITE_CONFIG.appearance.base_path;
    return lang === 'en' ? `${base}${slug}` : `${base}${lang}/${slug}`;
}

export function initNavigation() {

    /* ── 1. THEME ────────────────────────────────────────────────────────── */
    const THEME_KEY = 'dornori-theme';
    const root      = document.documentElement;
    const saved     = localStorage.getItem(THEME_KEY) || 'cutting-mat';
    root.setAttribute('data-theme', saved);

    /* ── 2. SETTINGS TAB + TOPBAR ────────────────────────────────────────── */
    const topBar = document.getElementById('topBar');
    let profileSelect = null;
    let langSelect    = null;

    if (topBar) {

        // ── Profile selector ──────────────────────────────────────────────
        const profileWrap     = document.createElement('label');
        profileWrap.className = 'profile-selector-wrap';
        profileWrap.textContent = 'PROFILE ';

        profileSelect           = document.createElement('select');
        profileSelect.id        = 'profileSelect';
        profileSelect.className = 'profile-select';
        profileSelect.setAttribute('aria-label', 'Choose colour profile');
        profileSelect.setAttribute('tabindex', '-1');

        PROFILES.forEach(p => {
            const opt       = document.createElement('option');
            opt.value       = p.id;
            opt.textContent = p.label.toUpperCase();
            if (p.id === saved) opt.selected = true;
            profileSelect.appendChild(opt);
        });

        profileSelect.addEventListener('change', () => {
            const next = profileSelect.value;
            root.setAttribute('data-theme', next);
            localStorage.setItem(THEME_KEY, next);
        });

        profileWrap.appendChild(profileSelect);
        topBar.appendChild(profileWrap);

        // ── Language selector ─────────────────────────────────────────────
        const langWrap     = document.createElement('label');
        langWrap.className = 'profile-selector-wrap';
        langWrap.textContent = 'LANGUAGE ';

        langSelect           = document.createElement('select');
        langSelect.id        = 'langSelect';
        langSelect.className = 'profile-select';
        langSelect.setAttribute('aria-label', 'Choose language');
        langSelect.setAttribute('tabindex', '-1');

        SITE_CONFIG.languages.forEach(l => {
            const opt       = document.createElement('option');
            opt.value       = l.code;
            opt.textContent = `${l.flag} ${l.label}`;
            langSelect.appendChild(opt);
        });

        // Set initial value once LANG is available (may be set async)
        const setLangSelectValue = () => {
            langSelect.value = window.LANG || 'en';
        };
        // Try now and also after a tick in case i18n is still resolving
        setLangSelectValue();
        setTimeout(setLangSelectValue, 200);

        langSelect.addEventListener('change', () => {
            if (typeof window.setLang === 'function') {
                window.setLang(langSelect.value);
            }
        });

        langWrap.appendChild(langSelect);
        topBar.appendChild(langWrap);

        // ── Settings gear tab ─────────────────────────────────────────────
        const tab  = document.createElement('button');
        tab.id     = 'topBar-tab';
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
            <span>SETTINGS</span>
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

        document.addEventListener('click', e => {
            if (!topBar.contains(e.target)) closeBar();
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && topBar.classList.contains('active')) {
                closeBar();
                tab.focus();
            }
        });
    }

    /* ── 3. DESKTOP NAV ──────────────────────────────────────────────────── */
    const desktopNav = document.querySelector('.top-nav');
    if (desktopNav) {
        desktopNav.innerHTML = '';

        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;

            // Use <a href> so Google can crawl it — intercept click for SPA
            const a   = document.createElement('a');
            a.href    = navHref(item.slug);
            a.className = item.type === 'button' ? 'nav-link nav-newsletter' : 'nav-link';
            a.setAttribute('data-slug', item.slug);

            const iconEl  = document.createElement('span');
            iconEl.className = 'nav-icon';
            iconEl.innerHTML = FALLBACK_SVG;

            const labelEl = document.createElement('span');
            labelEl.textContent = item.label;

            a.appendChild(iconEl);
            a.appendChild(labelEl);

            // SPA click interception
            a.addEventListener('click', e => {
                e.preventDefault();
                window.viewPage(item.slug);
            });

            desktopNav.appendChild(a);

            if (item.icon) {
                fetchSVG(item.icon).then(svg => { iconEl.innerHTML = svg; });
            }
        });
    }

    /* ── 4. MOBILE NAV ───────────────────────────────────────────────────── */
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) {
        mobileNav.innerHTML = '';

        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;

            const a   = document.createElement('a');
            a.href    = navHref(item.slug);
            a.className = item.type === 'button'
                ? 'mobile-nav-item mobile-nav-cta'
                : 'mobile-nav-item';
            a.setAttribute('data-slug', item.slug);

            const iconEl  = document.createElement('span');
            iconEl.className = 'mobile-nav-icon';
            iconEl.innerHTML = FALLBACK_SVG;

            const labelEl = document.createElement('span');
            labelEl.className   = 'mobile-nav-label';
            labelEl.textContent = item.mobileLabel || item.label;

            a.appendChild(iconEl);
            a.appendChild(labelEl);

            a.addEventListener('click', e => {
                e.preventDefault();
                window.viewPage(item.slug);
            });

            mobileNav.appendChild(a);

            if (item.icon) {
                fetchSVG(item.icon).then(svg => { iconEl.innerHTML = svg; });
            }
        });
    }
}
