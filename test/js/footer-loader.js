import SITE_CONFIG from './config.js';

function getPageUrl(slug) {
    const lang = window.LANG || SITE_CONFIG.default_language;
    return SITE_CONFIG.getPageUrl(lang, slug);
}

window.renderFooter = () => {
    const container = document.getElementById('footer-links');
    if (!container) return;

    const T = window.T?.footer || {};
    const columns = SITE_CONFIG.footer;
    if (!columns?.length) return;

    container.innerHTML = '';

    columns.forEach((column, colIndex) => {
        const visibleLinks = column.links.filter(l => l.enabled);
        if (!visibleLinks.length) return;

        const tCol = T.columns?.[colIndex] || {};
        const tLinks = tCol.links || {};

        const col = document.createElement('div');
        col.className = 'footer-col';

        if (column.label) {
            const heading = document.createElement('p');
            heading.className = 'footer-col-heading';
            heading.textContent = tCol.heading || column.label;
            col.appendChild(heading);
        }

        visibleLinks.forEach(link => {
            const a = document.createElement('a');
            a.href = getPageUrl(link.slug);
            a.className = 'footer-link';
            a.textContent = tLinks[link.slug] || link.label || link.slug;
            a.setAttribute('data-slug', link.slug);
            col.appendChild(a);
        });

        container.appendChild(col);
    });
};

export function initFooter() {
    if (window.T) window.renderFooter();
}
