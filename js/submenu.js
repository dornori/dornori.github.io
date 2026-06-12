/**
 * submenu.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles rendering and interaction for navigation submenus.
 * Submenus can have internal pages (slugs) or external URLs.
 * Desktop: Hover-based dropdown menus (CSS handles display)
 * Mobile: Submenus disabled - items navigate directly to pages/URLs
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

function iconPath(iconFilename) {
    return SITE_CONFIG.appearance.base_path + SITE_CONFIG.paths.icons_dir + iconFilename;
}

// ── SUBMENU RENDER ───────────────────────────────────────────────────────────
window.renderSubmenu = () => {
    const T = window.T || {};

    // Desktop submenu only - mobile has no submenus
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
};

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initSubmenu() {
    window.renderSubmenu();
}
