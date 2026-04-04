import SITE_CONFIG from './config.js';

/**
 * NAV LOADER MODULE
 * ─────────────────────────────────────────────────────────────────────────────
 * The settings tab is physically part of #topBar — it hangs below it as a
 * small tab. The whole unit (bar + tab) slides down together from the top.
 * Clicking the tab toggles open/close.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function initNavigation() {

    /* ── 1. THEME SETUP ──────────────────────────────────────────────────── */
    const STORAGE_KEY = 'dornori-theme';
    const root        = document.documentElement;

    const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
    root.setAttribute('data-theme', saved);

    /* ── 2. INJECT TAB INTO #topBar ──────────────────────────────────────── */
    const topBar    = document.getElementById('topBar');
    const toggleBtn = document.getElementById('themeToggle');

    if (topBar) {
        // Create the tab that hangs below the bar
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
        // Append tab inside the bar — CSS will position it below the bar's bottom edge
        topBar.appendChild(tab);

        // Theme toggle hidden from tab order while bar is closed
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

        // Click outside closes bar
        document.addEventListener('click', (e) => {
            if (!topBar.contains(e.target)) closeBar();
        });

        // Escape closes bar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && topBar.classList.contains('active')) {
                closeBar();
                tab.focus();
            }
        });
    }

    /* ── 3. THEME TOGGLE BUTTON ──────────────────────────────────────────── */
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
