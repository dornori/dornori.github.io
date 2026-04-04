import SITE_CONFIG from './config.js';

/**
 * NAV LOADER MODULE
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles:
 *   1. Theme setup + persistence (localStorage → <html data-theme="...">)
 *   2. Settings icon (#settings-btn) that toggles the #topBar open/closed
 *   3. Theme toggle button inside #topBar
 *   4. Top-right nav menu
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function initNavigation() {

    /* ── 1. THEME SETUP ──────────────────────────────────────────────────── */
    const STORAGE_KEY = 'dornori-theme';
    const root        = document.documentElement;

    // Apply saved theme immediately (prevents flash on reload)
    const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
    root.setAttribute('data-theme', saved);

    /* ── 2. SETTINGS ICON + TOPBAR REVEAL ───────────────────────────────── */
    const topBar = document.getElementById('topBar');

    // Inject the settings icon button into the DOM
    const settingsBtn = document.createElement('button');
    settingsBtn.id        = 'settings-btn';
    settingsBtn.ariaLabel = 'Settings';
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
    document.body.appendChild(settingsBtn);

    if (topBar) {
        // Toggle bar open/closed on settings icon click
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = topBar.classList.toggle('active');
            settingsBtn.classList.toggle('active', isOpen);
        });

        // Click anywhere outside the bar or icon closes it
        document.addEventListener('click', (e) => {
            if (!topBar.contains(e.target) && e.target !== settingsBtn) {
                topBar.classList.remove('active');
                settingsBtn.classList.remove('active');
            }
        });

        // Escape key closes it
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                topBar.classList.remove('active');
                settingsBtn.classList.remove('active');
            }
        });
    }

    /* ── 3. THEME TOGGLE BUTTON (inside #topBar) ─────────────────────────── */
    const toggleBtn   = document.getElementById('themeToggle');
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
