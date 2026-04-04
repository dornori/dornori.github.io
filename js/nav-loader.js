import SITE_CONFIG from './config.js';

/**
 * NAV LOADER MODULE
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles:
 *   1. Theme setup + persistence (localStorage → <html data-theme="...">)
 *   2. Settings icon (#settings-btn) that toggles the #topBar open/closed
 *   3. Theme toggle button inside #topBar — only keyboard-reachable when open
 *   4. Top-right nav menu
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function initNavigation() {

    /* ── 1. THEME SETUP ──────────────────────────────────────────────────── */
    const STORAGE_KEY = 'dornori-theme';
    const root        = document.documentElement;

    const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
    root.setAttribute('data-theme', saved);

    /* ── 2. SETTINGS ICON + TOPBAR REVEAL ───────────────────────────────── */
    const topBar    = document.getElementById('topBar');
    const toggleBtn = document.getElementById('themeToggle');

    // Inject settings button at the very TOP of <body> so it's
    // first in the natural tab order
    const settingsBtn = document.createElement('button');
    settingsBtn.id        = 'settings-btn';
    settingsBtn.setAttribute('aria-label', 'Open settings');
    settingsBtn.setAttribute('aria-expanded', 'false');
    settingsBtn.setAttribute('aria-controls', 'topBar');
    settingsBtn.innerHTML = `
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
    `;

    // Insert as first child of body so Tab hits it before anything else
    document.body.insertBefore(settingsBtn, document.body.firstChild);

    // Theme toggle starts hidden from tab order — bar is closed
    if (toggleBtn) toggleBtn.setAttribute('tabindex', '-1');

    const openBar = () => {
        topBar.classList.add('active');
        settingsBtn.classList.add('active');
        settingsBtn.setAttribute('aria-expanded', 'true');
        settingsBtn.setAttribute('aria-label', 'Close settings');
        // Make toggle reachable by keyboard
        if (toggleBtn) {
            toggleBtn.setAttribute('tabindex', '0');
            toggleBtn.focus(); // move focus into the bar
        }
    };

    const closeBar = () => {
        topBar.classList.remove('active');
        settingsBtn.classList.remove('active');
        settingsBtn.setAttribute('aria-expanded', 'false');
        settingsBtn.setAttribute('aria-label', 'Open settings');
        // Remove toggle from tab order again
        if (toggleBtn) toggleBtn.setAttribute('tabindex', '-1');
    };

    if (topBar) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            topBar.classList.contains('active') ? closeBar() : openBar();
        });

        // Click outside closes bar
        document.addEventListener('click', (e) => {
            if (!topBar.contains(e.target) && e.target !== settingsBtn) {
                closeBar();
            }
        });

        // Escape closes bar and returns focus to settings icon
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && topBar.classList.contains('active')) {
                closeBar();
                settingsBtn.focus();
            }
        });
    }

    /* ── 3. THEME TOGGLE BUTTON (inside #topBar) ─────────────────────────── */
    const toggleLabel = document.getElementById('toggleLabel');

    const syncLabel = (theme) => {
        if (toggleLabel) {
            toggleLabel.textContent = theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE';
        }
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

    /* ── 4. NAV MENU ─────────────────────────────────────────────────────── */
    const nav = document.querySelector('.top-nav');
    if (!nav) return;
    nav.innerHTML = '';

    SITE_CONFIG.navigation.forEach(item => {
        if (!item.enabled) return;

        const btn = document.createElement('button');
        btn.textContent = item.label;
        btn.className   = item.type === 'button' ? 'nav-link nav-newsletter' : 'nav-link';

        btn.onclick = () => {
            if (item.slug === 'newsletter') {
                window.showHome(true);
            } else {
                window.viewPage(item.slug);
            }
        };

        nav.appendChild(btn);
    });
}
