/**
 * footer-loader.js
 * Reads labels from window.T (loaded by i18n.js from lang/{code}.json).
 * Exposes window.renderFooter() so setLang() can re-render on language switch.
 * Uses <a href> tags so Google can crawl footer links.
 */

import SITE_CONFIG from './config.js';

window.renderFooter = () => {
    const container = document.getElementById('footer-links');
    if (!container) return;

    const T       = window.T?.footer || {};
    const columns = SITE_CONFIG.footer;
    if (!columns?.length) return;

    container.innerHTML = '';

    // T.columns is an array matching the order in config.js footer
    columns.forEach((column, colIndex) => {
        const visibleLinks = column.links.filter(l => l.enabled);
        if (!visibleLinks.length) return;

        const tCol    = T.columns?.[colIndex] || {};
        const tLinks  = tCol.links || {};

        const col     = document.createElement('div');
        col.className = 'footer-col';

        if (column.label) {
            const heading       = document.createElement('p');
            heading.className   = 'footer-col-heading';
            heading.textContent = tCol.heading || column.label;
            col.appendChild(heading);
        }

        visibleLinks.forEach(link => {
            const lang = window.LANG || 'en';
            const base = SITE_CONFIG.appearance.base_path;
            const href = lang === 'en' ? `${base}${link.slug}` : `${base}${lang}/${link.slug}`;

            const a         = document.createElement('a');
            a.href          = href;
            a.className     = 'footer-link';
            a.textContent   = tLinks[link.slug] || link.label;
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
