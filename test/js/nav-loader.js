import SITE_CONFIG from './config.js';

const PROFILES = [
    { id: 'dark',        label: 'Dark'        },
    { id: 'light',       label: 'Light'       },
    { id: 'cutting-mat', label: 'Cutting Mat' },
    { id: 'cutting-blue',label: 'Cutting Blue' },
];

const FALLBACK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <line x1="12" y1="8" x2="12" y2="13"/>
    <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none"/>
</svg>`;

const svgCache = new Map();

async function fetchSVG(path) {
    if (svgCache.has(path)) return svgCache.get(path);
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error();
        const svg = await res.text();
        svgCache.set(path, svg);
        return svg;
    } catch {
        svgCache.set(path, FALLBACK_SVG);
        return FALLBACK_SVG;
    }
}

function navHref(slug) {
    const lang = window.LANG || SITE_CONFIG.languages[0].code;
    const base = SITE_CONFIG.appearance.base_path;
    const fallback = SITE_CONFIG.languages[0].code;
    const path = slug ? `${slug}/` : '';
    return lang === fallback ? `${base}${path}` : `${base}${lang}/${path}`;
}

window.renderNav = () => {
    const T = window.T || {};

    const desktopNav = document.querySelector('.top-nav');
    if (desktopNav) {
        desktopNav.innerHTML = '';
        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;
            const t = T.nav?.[item.slug] || {};

            const a = document.createElement('a');
            a.href = navHref(item.slug);
            a.className = 'nav-link';
            a.setAttribute('data-slug', item.slug);

            const iconEl = document.createElement('span');
            iconEl.className = 'nav-icon';
            iconEl.innerHTML = FALLBACK_SVG;

            const labelEl = document.createElement('span');
            labelEl.textContent = t.label || item.slug;

            a.appendChild(iconEl);
            a.appendChild(labelEl);
            a.addEventListener('click', e => { e.preventDefault(); window.viewPage(item.slug); });
            desktopNav.appendChild(a);

            if (item.icon) fetchSVG(item.icon).then(svg => iconEl.innerHTML = svg);
        });
    }

    const mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) {
        mobileNav.innerHTML = '';
        SITE_CONFIG.navigation.forEach(item => {
            if (!item.enabled) return;
            const t = T.nav?.[item.slug] || {};

            const a = document.createElement('a');
            a.href = navHref(item.slug);
            a.className = 'mobile-nav-item';
            a.setAttribute('data-slug', item.slug);

            const iconEl = document.createElement('span');
            iconEl.className = 'mobile-nav-icon';
            iconEl.innerHTML = FALLBACK_SVG;

            const labelEl = document.createElement('span');
            labelEl.className = 'mobile-nav-label';
            labelEl.textContent = t.mobileLabel || t.label || item.slug;

            a.appendChild(iconEl);
            a.appendChild(labelEl);
            a.addEventListener('click', e => { e.preventDefault(); window.viewPage(item.slug); });
            mobileNav.appendChild(a);

            if (item.icon) fetchSVG(item.icon).then(svg => iconEl.innerHTML = svg);
        });
    }
};

export function initNavigation() {
    window.renderNav();
}
