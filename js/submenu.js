/**
 * submenu.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles rendering and interaction for navigation submenus.
 * Submenus can have internal pages (slugs) or external URLs.
 * Uses profile-aware styling via CSS variables.
 * Exposes window.renderSubmenu() to re-render on language/profile changes.
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

    // Desktop submenu
    const desktopNav = document.querySelector('.top-nav');
    if (desktopNav) {
        desktopNav.querySelectorAll('.nav-link-with-submenu').forEach(link => {
            link.querySelector('.nav-submenu')?.remove();
        });

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

                // If it's internal, prevent default and use viewPage
                if (!child.url) {
                    childLink.addEventListener('click', e => {
                        e.preventDefault();
                        window.viewPage(child.slug);
                    });
                } else {
                    // External link
                    childLink.target = '_blank';
                    childLink.rel = 'noopener noreferrer';
                }

                submenu.appendChild(childLink);
            });

            navLink.appendChild(submenu);
        });
    }

    // Mobile submenu
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) {
        mobileNav.querySelectorAll('.mobile-nav-submenu')?.forEach(el => el.remove());

        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled || !item.children || item.children.length === 0) return;

            const navLink = mobileNav.querySelector(`[data-slug="${item.slug}"]`);
            if (!navLink) return;

            const submenuWrap = document.createElement('div');
            submenuWrap.className = 'mobile-nav-submenu-wrap';

            const submenuLabel = document.createElement('div');
            submenuLabel.className = 'mobile-nav-submenu-label';

            const chevron = document.createElement('span');
            chevron.className = 'mobile-nav-chevron';
            chevron.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

            submenuLabel.textContent = T.nav?.[item.slug]?.label || item.slug;
            submenuLabel.appendChild(chevron);

            const submenu = document.createElement('div');
            submenu.className = 'mobile-nav-submenu';

            item.children.forEach(child => {
                if (!child.enabled) return;

                const childLink = document.createElement('a');
                childLink.href = child.url || navHref(child.slug);
                childLink.className = 'mobile-nav-submenu-item';
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

            submenuWrap.appendChild(submenuLabel);
            submenuWrap.appendChild(submenu);
            navLink.parentNode.insertBefore(submenuWrap, navLink.nextSibling);

            // Toggle on click
            submenuLabel.addEventListener('click', () => {
                submenuWrap.classList.toggle('open');
            });
        });
    }
};

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initSubmenu() {
    window.renderSubmenu();
}
