import SITE_CONFIG from './config_DRAFT.js';

/**
 * NAV LOADER MODULE
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Theme setup + persistence
 * 2. Settings tab on #topBar (click to reveal profile selector)
 * 3. Desktop nav  (.top-nav)    — small inline SVG icon + text label
 * 4. Mobile nav   (#mobile-nav) — larger SVG icon + short label underneath
 *
 * ── ADDING A NEW PROFILE ─────────────────────────────────────────────────────
 * 1. Add a [data-theme="your-name"] block to css/profiles.css
 * 2. Add { id: 'your-name', label: 'Your Label' } to PROFILES below
 * The selector in the settings bar updates automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── PROFILES — edit this list to add / remove themes ───────────────────── */
const PROFILES = [
    { id: 'dark',        label: 'Dark'        },
    { id: 'light',       label: 'Light'       },
    { id: 'cutting-mat', label: 'Cutting Mat' },
    // { id: 'my-profile', label: 'My Profile' },
];

/* ── Fallback SVG shown when an icon file cannot be loaded ───────────────── */
const FALLBACK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <line x1="12" y1="8" x2="12" y2="13"/>
    <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none"/>
</svg>`;

/* ── Simple in-memory cache so each SVG file is only fetched once ─────────── */
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

export function initNavigation() {

    /* ── 1. THEME SETUP ──────────────────────────────────────────────────── */
    const STORAGE_KEY = 'dornori-theme';
    const root        = document.documentElement;

    const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
    root.setAttribute('data-theme', saved);

    /* ── 2. SETTINGS TAB + TOPBAR REVEAL ────────────────────────────────── */
    const topBar = document.getElementById('topBar');
    let profileSelect = null;

    if (topBar) {

        /* Profile <select> */
        const selectorWrap     = document.createElement('label');
        selectorWrap.className = 'profile-selector-wrap';
        selectorWrap.textContent = 'PROFILE ';

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
            localStorage.setItem(STORAGE_KEY, next);
        });

        selectorWrap.appendChild(profileSelect);
        topBar.appendChild(selectorWrap);

        /* Settings gear tab */
        const tab = document.createElement('button');
        tab.id    = 'topBar-tab';
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
            profileSelect.focus();
        };

        const closeBar = () => {
            topBar.classList.remove('active');
            tab.setAttribute('aria-expanded', 'false');
            tab.setAttribute('aria-label', 'Open settings');
            profileSelect.setAttribute('tabindex', '-1');
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

    /* ── 3. DESKTOP NAV — small icon + text label ────────────────────────── */
    const desktopNav = document.querySelector('.top-nav');
    if (desktopNav) {
        desktopNav.innerHTML = '';

        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;

            const btn = document.createElement('button');
            btn.className = item.type === 'button' ? 'nav-link nav-newsletter' : 'nav-link';

            const iconEl = document.createElement('span');
            iconEl.className = 'nav-icon';
            iconEl.innerHTML = FALLBACK_SVG;

            const labelEl = document.createElement('span');
            labelEl.textContent = item.label;

            btn.appendChild(iconEl);
            btn.appendChild(labelEl);
            btn.onclick = () => item.slug === 'newsletter'
                ? window.showHome(true)
                : window.viewPage(item.slug);

            desktopNav.appendChild(btn);

            if (item.icon) {
                fetchSVG(item.icon).then(svg => { iconEl.innerHTML = svg; });
            }
        });
    }

    /* ── 4. MOBILE NAV — large icon + short label underneath ────────────── */
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) {
        mobileNav.innerHTML = '';

        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;

            const btn = document.createElement('button');
            btn.className = item.type === 'button'
                ? 'mobile-nav-item mobile-nav-cta'
                : 'mobile-nav-item';

            const iconEl = document.createElement('span');
            iconEl.className = 'mobile-nav-icon';
            iconEl.innerHTML = FALLBACK_SVG;

            const labelEl = document.createElement('span');
            labelEl.className   = 'mobile-nav-label';
            labelEl.textContent = item.mobileLabel || item.label;

            btn.appendChild(iconEl);
            btn.appendChild(labelEl);
            btn.onclick = () => item.slug === 'newsletter'
                ? window.showHome(true)
                : window.viewPage(item.slug);

            mobileNav.appendChild(btn);

            if (item.icon) {
                fetchSVG(item.icon).then(svg => { iconEl.innerHTML = svg; });
            }
        });
    }
}
