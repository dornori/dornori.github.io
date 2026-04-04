import SITE_CONFIG from './config.js';

/**
 * NAV LOADER MODULE
 * Handles the top-right menu and the theme toggle button inside the banner.
 * Theme is stored on <html data-theme="..."> and persisted to localStorage.
 */

export function initNavigation() {

    /* ── 1. THEME SETUP ──────────────────────────────────────────────────── */
    const STORAGE_KEY = 'dornori-theme';
    const root        = document.documentElement;

    // Apply saved theme immediately (prevents flash on reload)
    const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
    root.setAttribute('data-theme', saved);

    /* ── 2. THEME TOGGLE BUTTON ──────────────────────────────────────────── */
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

    /* ── 3. NAV MENU ─────────────────────────────────────────────────────── */
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
