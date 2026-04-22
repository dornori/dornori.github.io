/**
 * nav-loader.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads labels from window.T (loaded by i18n.js from lang/{code}.json).
 * Exposes window.renderNav() so setLang() can re-render without a page reload.
 * Uses <a href> tags so Google can crawl all pages.
 * Generates language-specific pretty URLs via SITE_CONFIG.pageUrlSlug().
 */

import SITE_CONFIG from './config.js';

const PROFILES = [
    { id: 'dark',        label: 'Dark'        },
    { id: 'light',       label: 'Light'       },
    { id: 'cutting-mat', label: 'Cutting Mat' },
    { id: 'cutting-blue',label: 'Cutting Blue' },
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
    const lang     = window.LANG || 'en';
    const base     = SITE_CONFIG.appearance.base_path;
    const urlSlug  = SITE_CONFIG.pageUrlSlug(slug, lang);
    return lang === 'en'
        ? `${base}en/${urlSlug}/`
        : `${base}${lang}/${urlSlug}/`;
}

// ── NAV RENDER ───────────────────────────────────────────────────────────────
window.renderNav = () => {
    const T = window.T || {};

    /* ── Desktop nav ── */
    const desktopNav = document.querySelector('.top-nav');
    if (desktopNav) {
        desktopNav.innerHTML = '';
        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;

            const t = T.nav?.[item.slug] || {};

            const a       = document.createElement('a');
            a.href        = navHref(item.slug);
            a.className   = item.type === 'button' ? 'nav-link nav-newsletter' : 'nav-link';
            a.setAttribute('data-slug', item.slug);

            const iconEl      = document.createElement('span');
            iconEl.className  = 'nav-icon';
            iconEl.innerHTML  = FALLBACK_SVG;

            const labelEl     = document.createElement('span');
            labelEl.textContent = t.label || item.slug;

            a.appendChild(iconEl);
            a.appendChild(labelEl);
            a.addEventListener('click', e => { e.preventDefault(); window.viewPage(item.slug); });
            desktopNav.appendChild(a);

            if (item.icon) fetchSVG(SITE_CONFIG.appearance.base_path + item.icon).then(svg => { iconEl.innerHTML = svg; });
        });
    }

    /* ── Mobile nav ── */
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) {
        mobileNav.innerHTML = '';
        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;

            const t = T.nav?.[item.slug] || {};

            const a     = document.createElement('a');
            a.href      = navHref(item.slug);
            a.className = item.type === 'button' ? 'mobile-nav-item mobile-nav-cta' : 'mobile-nav-item';
            a.setAttribute('data-slug', item.slug);

            const iconEl      = document.createElement('span');
            iconEl.className  = 'mobile-nav-icon';
            iconEl.innerHTML  = FALLBACK_SVG;

            const labelEl       = document.createElement('span');
            labelEl.className   = 'mobile-nav-label';
            labelEl.textContent = t.mobileLabel || t.label || item.slug;

            a.appendChild(iconEl);
            a.appendChild(labelEl);
            a.addEventListener('click', e => { e.preventDefault(); window.viewPage(item.slug); });
            mobileNav.appendChild(a);

            if (item.icon) fetchSVG(SITE_CONFIG.appearance.base_path + item.icon).then(svg => { iconEl.innerHTML = svg; });
        });
    }
};

// ── MAIN INIT ────────────────────────────────────────────────────────────────
export function initNavigation() {

    /* ── Theme ── */
    const THEME_KEY = 'dornori-theme';
    const root      = document.documentElement;
    const saved     = localStorage.getItem(THEME_KEY) || 'cutting-mat';
    root.setAttribute('data-theme', saved);

    /* ── Settings topBar ── */
    const topBar = document.getElementById('topBar');
    if (topBar) {
        const T = window.T?.ui || {};

        // Profile selector
        const profileWrap       = document.createElement('label');
        profileWrap.className   = 'profile-selector-wrap';
        profileWrap.textContent = (T.profile || 'PROFILE') + ' ';

        const profileSelect     = document.createElement('select');
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
            root.setAttribute('data-theme', profileSelect.value);
            localStorage.setItem(THEME_KEY, profileSelect.value);
        });

        profileWrap.appendChild(profileSelect);
        topBar.appendChild(profileWrap);

        // Language selector
        const langWrap       = document.createElement('label');
        langWrap.className   = 'profile-selector-wrap';
        langWrap.textContent = (T.language || 'LANGUAGE') + ' ';

        const langSelect     = document.createElement('select');
        langSelect.id        = 'langSelect';
        langSelect.className = 'profile-select';
        langSelect.setAttribute('aria-label', 'Choose language');
        langSelect.setAttribute('tabindex', '-1');
        langSelect.value     = window.LANG || 'en';

        SITE_CONFIG.languages.forEach(l => {
            const opt       = document.createElement('option');
            opt.value       = l.code;
            opt.textContent = `${l.flag} ${l.label}`;
            if (l.code === (window.LANG || 'en')) opt.selected = true;
            langSelect.appendChild(opt);
        });

        langSelect.addEventListener('change', () => {
            if (typeof window.setLang === 'function') window.setLang(langSelect.value);
        });

        langWrap.appendChild(langSelect);
        topBar.appendChild(langWrap);

        // Currency selector — populated once shop scripts load
        const currencyWrap       = document.createElement('label');
        currencyWrap.className   = 'profile-selector-wrap site-currency-wrap';
        currencyWrap.id          = 'site-currency-wrap';
        currencyWrap.textContent = (T.currency || 'CURRENCY') + ' ';
        currencyWrap.style.display = 'none'; // hidden until shop engine boots

        const currencySlot   = document.createElement('div');
        currencySlot.id      = 'topBar-currency-slot';
        currencyWrap.appendChild(currencySlot);
        topBar.appendChild(currencyWrap);

        // Reveal currency row once shop is booted
        document.addEventListener('lumio:booted', () => {
            currencyWrap.style.display = '';
        }, { once: true });

        // Settings gear tab
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
            <span>${T.settings || 'SETTINGS'}</span>
        `;
        topBar.appendChild(tab);

        const openBar = () => {
            topBar.classList.add('active');
            tab.setAttribute('aria-expanded', 'true');
            tab.setAttribute('aria-label', 'Close settings');
            profileSelect.setAttribute('tabindex', '0');
            langSelect.setAttribute('tabindex', '0');
            const cSel = topBar.querySelector('#topBar-currency-slot select');
            if (cSel) cSel.setAttribute('tabindex', '0');
            profileSelect.focus();
        };
        const closeBar = () => {
            topBar.classList.remove('active');
            tab.setAttribute('aria-expanded', 'false');
            tab.setAttribute('aria-label', 'Open settings');
            profileSelect.setAttribute('tabindex', '-1');
            langSelect.setAttribute('tabindex', '-1');
            const cSel = topBar.querySelector('#topBar-currency-slot select');
            if (cSel) cSel.setAttribute('tabindex', '-1');
        };

        tab.addEventListener('click', e => {
            e.stopPropagation();
            topBar.classList.contains('active') ? closeBar() : openBar();
        });
        document.addEventListener('click', e => { if (!topBar.contains(e.target)) closeBar(); });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && topBar.classList.contains('active')) { closeBar(); tab.focus(); }
        });

        const isFinePonter = window.matchMedia('(pointer: fine)');
        if (isFinePonter.matches) {
            topBar.addEventListener('mouseenter', () => openBar());
            topBar.addEventListener('mouseleave', () => closeBar());
        }
        isFinePonter.addEventListener('change', e => {
            if (e.matches) {
                topBar.addEventListener('mouseenter', openBar);
                topBar.addEventListener('mouseleave', closeBar);
            } else {
                topBar.removeEventListener('mouseenter', openBar);
                topBar.removeEventListener('mouseleave', closeBar);
            }
        });
    }

    // Render nav links
    window.renderNav();

    // ── Cart icon in header ──────────────────────────────────────────────────
    // Inject once; update badge on cart changes via localStorage + custom event
    (function injectCartIcon() {
        const header = document.getElementById('main-header');
        if (!header || document.getElementById('site-cart-btn')) return;

        const lang   = window.LANG || 'en';
        const base   = SITE_CONFIG.appearance.base_path;
        // Cart URL → SPA route (JS navigation), href is the pretty URL fallback
        const cartUrlSlug = SITE_CONFIG.pageUrlSlug('cart', lang);
        const cartHref    = lang === 'en'
            ? `${base}en/${cartUrlSlug}/`
            : `${base}${lang}/${cartUrlSlug}/`;

        const btn = document.createElement('button');
        btn.id        = 'site-cart-btn';
        btn.className = 'site-cart-btn';
        btn.setAttribute('aria-label', 'Shopping cart');
        btn.setAttribute('type', 'button');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span class="site-cart-label">CART</span>
            <span id="site-cart-badge" class="site-cart-badge" aria-live="polite"></span>
        `;

        btn.addEventListener('click', () => {
            if (typeof window.viewPage === 'function') {
                window.viewPage('cart');
            } else {
                window.location.href = cartHref;
            }
        });

        header.appendChild(btn);

        function updateCartBadge() {
            try {
                const cartKey = 'lumio_cart';
                const cart    = JSON.parse(localStorage.getItem(cartKey) || '[]');
                const count   = cart.reduce((a, i) => a + (i.qty || 1), 0);
                const badge   = document.getElementById('site-cart-badge');
                if (!badge) return;
                badge.textContent = count || '';
                badge.classList.toggle('has-items', count > 0);
            } catch (e) {}
        }

        updateCartBadge();
        window.addEventListener('storage', e => {
            if (e.key === 'lumio_cart') updateCartBadge();
        });
        document.addEventListener('shop:cartUpdated', updateCartBadge);
    })();
}
