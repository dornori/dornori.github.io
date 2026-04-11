/**
 * footer-loader.js
 * Renders footer link columns from SITE_CONFIG.footer.
 * Uses <a href> tags (not buttons) so Google can crawl them.
 */

import SITE_CONFIG from './config.js';

export function initFooter() {
    const container = document.getElementById('footer-links');
    if (!container) return;

    const columns = SITE_CONFIG.footer;
    if (!columns?.length) return;

    container.innerHTML = '';

    columns.forEach(column => {
        const visibleLinks = column.links.filter(l => l.enabled);
        if (!visibleLinks.length) return;

        const col = document.createElement('div');
        col.className = 'footer-col';

        if (column.label) {
            const heading     = document.createElement('p');
            heading.className = 'footer-col-heading';
            heading.textContent = column.label;
            col.appendChild(heading);
        }

        visibleLinks.forEach(link => {
            const lang = window.LANG || 'en';
            const base = SITE_CONFIG.appearance.base_path;
            const href = lang === 'en' ? `${base}${link.slug}` : `${base}${lang}/${link.slug}`;

            const a   = document.createElement('a');
            a.href    = href;
            a.className = 'footer-link';
            a.textContent = link.label;
            a.setAttribute('data-slug', link.slug);

            // SPA interception — keep the single-page behaviour
            a.addEventListener('click', e => {
                e.preventDefault();
                window.viewPage(link.slug);
            });

            col.appendChild(a);
        });

        container.appendChild(col);
    });
}
