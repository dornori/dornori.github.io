import SITE_CONFIG from './config.js';

/**
 * FOOTER LOADER MODULE
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads SITE_CONFIG.footer and renders link columns into #footer-links.
 * Each column is only rendered if it has at least one enabled link.
 * Clicking a link calls window.viewPage(slug) — the same page-loader used
 * by the top nav — so no extra routing is needed.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function initFooter() {
    const container = document.getElementById('footer-links');
    if (!container) return;

    const columns = SITE_CONFIG.footer;
    if (!columns || !columns.length) return;

    container.innerHTML = '';

    columns.forEach(column => {
        // Filter to enabled links only
        const visibleLinks = column.links.filter(l => l.enabled);
        if (!visibleLinks.length) return; // skip empty columns entirely

        const col = document.createElement('div');
        col.className = 'footer-col';

        // Column heading (optional)
        if (column.label) {
            const heading = document.createElement('p');
            heading.className = 'footer-col-heading';
            heading.textContent = column.label;
            col.appendChild(heading);
        }

        // Links
        visibleLinks.forEach(link => {
            const btn = document.createElement('button');
            btn.className = 'footer-link';
            btn.textContent = link.label;
            btn.onclick = () => window.viewPage(link.slug);
            col.appendChild(btn);
        });

        container.appendChild(col);
    });
}
