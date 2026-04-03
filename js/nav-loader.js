import SITE_CONFIG from './config.js';

/**
 * NAV LOADER MODULE
 * Handles the top-right menu and the hover-reveal theme-toggle bar.
 *
 * HOW THE TOP BAR WORKS
 * ─────────────────────
 * #topBar sits fixed at top:-44px (hidden above the viewport).
 * A separate invisible #topBar-trigger strip sits at the very top of
 * the screen (height: 12px, z-index above everything).  Hovering that
 * strip adds .active to #topBar, sliding it down.  Mousing out of
 * #topBar (which also covers the trigger area once open) removes .active.
 *
 * Theme is toggled on <html data-theme="..."> and persisted to
 * localStorage — no cookies, no server calls.
 */

export function initNavigation() {

    /* ── 1. THEME SETUP ──────────────────────────────────────────────────── */
    const STORAGE_KEY = 'dornori-theme';
    const root        = document.documentElement;

    // Apply saved theme immediately (prevents flash on reload)
    const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
    root.setAttribute('data-theme', saved);

    /* ── 2. TOP BAR HOVER REVEAL ─────────────────────────────────────────── */
    const topBar = document.getElementById('topBar');
    if (!topBar) return;

    // Create the invisible hover-trigger strip at the very top
    const trigger = document.createElement('div');
    trigger.id = 'topBar-trigger';
    document.body.insertBefore(trigger, document.body.firstChild);

    let hideTimer = null;

    const showBar = () => {
        clearTimeout(hideTimer);
        topBar.classList.add('active');
    };

    const hideBar = () => {
        // Small delay so moving from trigger → bar doesn't flicker
        hideTimer = setTimeout(() => {
            topBar.classList.remove('active');
        }, 120);
    };

    trigger.addEventListener('mouseenter', showBar);
    trigger.addEventListener('mouseleave', hideBar);
    topBar.addEventListener('mouseenter', showBar);
    topBar.addEventListener('mouseleave', hideBar);

    /* ── 3. THEME TOGGLE BUTTON ──────────────────────────────────────────── */
    const toggleBtn   = document.getElementById('themeToggle');
    const toggleLabel = document.getElementById('toggleLabel');

    const syncLabel = (theme) => {
        if (toggleLabel) {
            toggleLabel.textContent = theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE';
        }
    };

    // Sync label to whatever was loaded from storage
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
