/**
 * footer-loader.js
 * Reads labels from window.T (loaded by i18n.js from lang/{code}.json).
 * Fallback to SITE_CONFIG labels if window.T is not yet available.
 */

import SITE_CONFIG from './config.js';

window.renderFooter = () => {
    const container = document.getElementById('footer-links');
    if (!container) return;

    // Safety: If window.T hasn't loaded yet, default to an empty object
    const T       = window.T?.footer || {};
    const columns = SITE_CONFIG.footer;
    if (!columns?.length) return;

    container.innerHTML = '';

    columns.forEach((column, colIndex) => {
        const visibleLinks = column.links.filter(l => l.enabled);
        if (!visibleLinks.length) return;

        const tCol    = T.columns?.[colIndex] || {};
        const tLinks  = tCol.links || {};

        const col     = document.createElement('div');
        col.className = 'footer-col';

        // Column Heading
        if (column.label) {
            const heading       = document.createElement('p');
            heading.className   = 'footer-col-heading';
            // Fallback chain: Translation -> Config Label -> "Menu"
            heading.textContent = tCol.heading || column.label || "Menu";
            col.appendChild(heading);
        }

        // Links
        visibleLinks.forEach(link => {
            const lang = window.LANG || 'en';
            const base = SITE_CONFIG.appearance.base_path;
            const href = lang === 'en' ? `${base}${link.slug}` : `${base}${lang}/${link.slug}`;

            const a         = document.createElement('a');
            a.href          = href;
            a.className     = 'footer-link';
            
            // Fallback chain: Translation -> Config Label -> Slug string
            a.textContent   = tLinks[link.slug] || link.label || link.slug;
            
            a.setAttribute('data-slug', link.slug);

            a.addEventListener('click', e => {
                e.preventDefault();
                window.viewPage(link.slug);
            });

            col.appendChild(a);
        });

        container.appendChild(col);
    });
};

export function initFooter() {
    window.renderFooter();
}
