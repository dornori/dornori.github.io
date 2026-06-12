/**
 * submenu.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Desktop: Hover dropdowns for items with children
 * Mobile: Slide-out panel on tap, parent at top (also selectable), then children below
 */

import { getSlug } from './i18n.js';
import { setSVGContent } from './utils/dom-safe.js';

const SITE_CONFIG = window.CONFIG || {};

function navHref(slug) {
    const lang    = window.LANG || 'en';
    const base    = SITE_CONFIG.appearance.base_path;
    const urlSlug = getSlug(window.T, slug);
    return `${base}${lang}/${urlSlug}/`;
}

// ── SUBMENU RENDER ───────────────────────────────────────────────────────────
window.renderSubmenu = () => {
    const T = window.T || {};

    // Desktop submenu - hover dropdowns for items with children
    const desktopNav = document.querySelector('.top-nav');
    if (desktopNav) {
        desktopNav.querySelectorAll('.nav-submenu').forEach(el => el.remove());

        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled || !item.children || item.children.length === 0) return;

            const navLink = desktopNav.querySelector(`[data-slug="${item.slug}"]`);
            if (!navLink) return;

            navLink.classList.add('nav-link-with-submenu');

            const submenu = document.createElement('div');
            submenu.className = 'nav-submenu';

            item.children.forEach(child => {
                if (!child.enabled) return;

                const childLink = document.createElement('a');
                childLink.href = child.url || navHref(child.slug);
                childLink.className = 'nav-submenu-item';
                childLink.textContent = child.label || (T.nav?.[child.slug]?.label || child.slug);

                if (!child.url) {
                    childLink.addEventListener('click', e => {
                        e.preventDefault();
                        window.viewPage(child.slug);
                    });
                } else {
                    childLink.target = '_blank';
                    childLink.rel = 'noopener noreferrer';
                }

                submenu.appendChild(childLink);
            });

            navLink.appendChild(submenu);
        });
    }

    // Mobile: slide-out panel for items with children
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) {
        // Remove old panels
        document.querySelectorAll('.mobile-submenu-panel').forEach(el => el.remove());

        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled || !item.children || item.children.length === 0) return;

            const navLink = mobileNav.querySelector(`[data-slug="${item.slug}"]`);
            if (!navLink) return;

            // Create slide-out panel
            const panel = document.createElement('div');
            panel.className = 'mobile-submenu-panel';
            panel.setAttribute('data-slug', item.slug);

            // Panel header with back button
            const header = document.createElement('div');
            header.className = 'mobile-submenu-header';

            const backBtn = document.createElement('button');
            backBtn.className = 'mobile-submenu-back';
            backBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
            backBtn.addEventListener('click', () => {
                panel.classList.remove('open');
                overlay.classList.remove('open');
            });

            const title = document.createElement('div');
            title.className = 'mobile-submenu-title';
            title.textContent = T.nav?.[item.slug]?.label || item.slug;

            header.appendChild(backBtn);
            header.appendChild(title);
            panel.appendChild(header);

            // Parent item (selectable)
            const parentItem = document.createElement('a');
            parentItem.href = navHref(item.slug);
            parentItem.className = 'mobile-submenu-parent-item';
            parentItem.textContent = T.nav?.[item.slug]?.label || item.slug;
            parentItem.addEventListener('click', e => {
                e.preventDefault();
                window.viewPage(item.slug);
            });
            panel.appendChild(parentItem);

            // Children items
            item.children.forEach(child => {
                if (!child.enabled) return;

                const childLink = document.createElement('a');
                childLink.href = child.url || navHref(child.slug);
                childLink.className = 'mobile-submenu-child-item';
                childLink.textContent = child.label || (T.nav?.[child.slug]?.label || child.slug);

                if (!child.url) {
                    childLink.addEventListener('click', e => {
                        e.preventDefault();
                        window.viewPage(child.slug);
                    });
                } else {
                    childLink.target = '_blank';
                    childLink.rel = 'noopener noreferrer';
                }

                panel.appendChild(childLink);
            });

            document.body.appendChild(panel);

            // Update nav link click to open panel
            navLink.addEventListener('click', e => {
                e.preventDefault();
                panel.classList.add('open');
                overlay.classList.add('open');
            });
        });

        // Create overlay
        let overlay = document.getElementById('mobile-submenu-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'mobile-submenu-overlay';
            overlay.className = 'mobile-submenu-overlay';
            overlay.addEventListener('click', () => {
                overlay.classList.remove('open');
                document.querySelectorAll('.mobile-submenu-panel.open').forEach(p => p.classList.remove('open'));
            });
            document.body.appendChild(overlay);
        }
    }
};

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initSubmenu() {
    window.renderSubmenu();
}
