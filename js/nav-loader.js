import SITE_CONFIG from './config.js';

/**
 * NAV LOADER MODULE
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Theme setup + persistence
 * 2. Settings tab on #topBar (click to reveal theme toggle)
 * 3. Desktop nav  (.top-nav)   — text buttons on banner bottom edge
 * 4. Mobile nav   (.mobile-nav) — icon + label stacked, below banner
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function initNavigation() {

    /* ── 1. THEME SETUP ──────────────────────────────────────────────────── */
    const STORAGE_KEY = 'dornori-theme';
    const root        = document.documentElement;

    const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
    root.setAttribute('data-theme', saved);

    /* ── 2. SETTINGS TAB + TOPBAR REVEAL ────────────────────────────────── */
    const topBar    = document.getElementById('topBar');
    const toggleBtn = document.getElementById('themeToggle');

    if (topBar) {
        const tab = document.createElement('button');
        tab.id        = 'topBar-tab';
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

        if (toggleBtn) toggleBtn.setAttribute('tabindex', '-1');

        const openBar = () => {
            topBar.classList.add('active');
            tab.setAttribute('aria-expanded', 'true');
            tab.setAttribute('aria-label', 'Close settings');
            if (toggleBtn) {
                toggleBtn.setAttribute('tabindex', '0');
                toggleBtn.focus();
            }
        };

        const closeBar = () => {
            topBar.classList.remove('active');
            tab.setAttribute('aria-expanded', 'false');
            tab.setAttribute('aria-label', 'Open settings');
            if (toggleBtn) toggleBtn.setAttribute('tabindex', '-1');
        };

        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            topBar.classList.contains('active') ? closeBar() : openBar();
        });

        document.addEventListener('click', (e) => {
            if (!topBar.contains(e.target)) closeBar();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && topBar.classList.contains('active')) {
                closeBar();
                tab.focus();
            }
        });
    }

    /* ── 3. THEME TOGGLE ─────────────────────────────────────────────────── */
    const toggleLabel = document.getElementById('toggleLabel');

    const syncLabel = (theme) => {
        if (toggleLabel) toggleLabel.textContent = theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE';
    };

    syncLabel(saved);

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const current = root.getAttribute('data-theme') || 'dark';
            const next    = current === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            localStorage.setItem(STORAGE_KEY, next);
            syncLabel(next);
        });
    }

    /* ── 4. DESKTOP NAV ──────────────────────────────────────────────────── */
    const desktopNav = document.querySelector('.top-nav');
    if (desktopNav) {
        desktopNav.innerHTML = '';
        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;
            const btn = document.createElement('button');
            btn.textContent = item.label;
            btn.className   = item.type === 'button' ? 'nav-link nav-newsletter' : 'nav-link';
            btn.onclick = () => item.slug === 'newsletter' ? window.showHome(true) : window.viewPage(item.slug);
            desktopNav.appendChild(btn);
        });
    }

    /* ── 5. MOBILE NAV ───────────────────────────────────────────────────── */
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) {
        mobileNav.innerHTML = '';
        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;
            const btn = document.createElement('button');
            btn.className = item.type === 'button'
                ? 'mobile-nav-item mobile-nav-cta'
                : 'mobile-nav-item';
            btn.innerHTML = `
                <span class="mobile-nav-icon">${item.mobileIcon || ''}</span>
                <span class="mobile-nav-label">${item.mobileLabel || item.label}</span>
            `;
            btn.onclick = () => item.slug === 'newsletter' ? window.showHome(true) : window.viewPage(item.slug);
            mobileNav.appendChild(btn);
        });
    }
}
