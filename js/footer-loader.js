import SITE_CONFIG from './config.js';
import { getSlug } from './i18n.js';

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

        const tCol   = T.columns?.[colIndex] || {};
        const tLinks = tCol.links || {};

        const col     = document.createElement('div');
        col.className = 'footer-col';

        if (column.label) {
            const heading       = document.createElement('p');
            heading.className   = 'footer-col-heading';
            heading.textContent = tCol.heading || column.label;
            col.appendChild(heading);
        }

        visibleLinks.forEach(link => {
            const lang    = window.LANG || SITE_CONFIG.languages[0].code;
            const base    = SITE_CONFIG.appearance.base_path;
            const urlSlug = getSlug(window.T, link.slug);
            const href    = `${base}${lang}/${urlSlug}/`;

            const a       = document.createElement('a');
            a.href        = href;
            a.className   = 'footer-link';
            a.textContent = tLinks[link.slug] || link.label || link.slug;
            a.setAttribute('data-slug', link.slug);
            a.addEventListener('click', e => { e.preventDefault(); window.viewPage(link.slug); });

            col.appendChild(a);
        });

        container.appendChild(col);
    });

    // Render payment icons
    renderPaymentIcons();
};

function renderPaymentIcons() {
    const container = document.getElementById('footer-payment');
    if (!container) return;

    const providers = (SITE_CONFIG.paymentProviders || []).filter(p => p.enabled);
    if (!providers.length) return;

    const base     = SITE_CONFIG.appearance.base_path;
    const iconBase = `${base}assets/images/payment-icons/`;
    const label    = window.T?.footer?.we_accept || 'We accept';

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'payment-accepted';

    const labelEl = document.createElement('span');
    labelEl.className   = 'payment-label';
    labelEl.textContent = label;
    wrapper.appendChild(labelEl);

    const iconsEl = document.createElement('div');
    iconsEl.className = 'payment-icons';

    providers.forEach(p => {
        const img  = document.createElement('img');
        img.src    = `${iconBase}${p.file}.webp`;
        img.alt    = p.label;
        img.className = 'payment-icon';
        img.width  = 60;
        img.height = 38;
        img.loading = 'lazy';
        // Fallback to jpeg if webp fails
        img.onerror = function() {
            if (!this.src.endsWith('.jpeg')) {
                this.src = `${iconBase}${p.file}.jpeg`;
            }
        };
        iconsEl.appendChild(img);
    });

    wrapper.appendChild(iconsEl);
    container.appendChild(wrapper);
}

export function initFooter() {
    if (window.T) window.renderFooter();
}
