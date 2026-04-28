/**
 * footer-loader.js
 * Reads labels from window.T (loaded by i18n.js from lang/{code}.json).
 * Exposes window.renderFooter() so setLang() can re-render on language switch.
 * Uses language-specific pretty URLs via SITE_CONFIG.pageUrlSlug().
 */

import SITE_CONFIG from './config.js';

window.renderFooter = () => {
    const container = document.getElementById('footer-links');
    if (!container) return;

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

        if (column.label) {
            const heading       = document.createElement('p');
            heading.className   = 'footer-col-heading';
            heading.textContent = tCol.heading || column.label;
            col.appendChild(heading);
        }

        visibleLinks.forEach(link => {
            const lang    = window.LANG || SITE_CONFIG.fallbackLang();
            const base    = SITE_CONFIG.appearance.base_path;
            const urlSlug = SITE_CONFIG.pageUrlSlug(link.slug, lang);
            const href    = lang === 'en'
                ? `${base}en/${urlSlug}/`
                : `${base}${lang}/${urlSlug}/`;

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
    if (window.T) window.renderFooter();
}
