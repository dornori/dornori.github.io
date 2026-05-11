/**
 * nav-loader.js (v2 - FIXED)
 *
 * FIX 1: Original code set a.href = item.slug (e.g. "about") which navigates
 *         to a bare relative path, breaking the SPA. Nav clicks must call
 *         window.viewPage(slug) instead.
 *
 * FIX 2: Icons were rendered as a blank <svg></svg> fallback — the actual SVG
 *         files were never fetched. Now fetches each icon from assets/icons/.
 *
 * FIX 3: Nav labels were set to item.slug (raw English). Now uses window.T
 *         for localised labels when available.
 */

import { setSVGContent } from './utils/dom-safe.js';
import SITE_CONFIG from './config.js';

const NAV = (() => {
  const FALLBACK_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';

  async function fetchIcon(iconFile) {
    try {
      const base = SITE_CONFIG.appearance.base_path;
      const url  = `${base}${SITE_CONFIG.paths.icons_dir}${iconFile}`;
      const res  = await fetch(url);
      if (!res.ok) throw 0;
      return await res.text();
    } catch {
      return FALLBACK_SVG;
    }
  }

  function labelFor(slug) {
    // Use translation bundle if available, fall back to capitalised slug
    const T = window.T;
    return (T && T.nav && T.nav[slug])
      || slug.charAt(0).toUpperCase() + slug.slice(1);
  }

  return {
    async init(navElement) {
      const items = (SITE_CONFIG.navigation || []).filter(i => i.enabled !== false);

      // Build placeholder buttons immediately (no flash of empty nav)
      const entries = items.map(item => {
        const btn = document.createElement('button');
        btn.type      = 'button';
        btn.className = 'nav-link nav-link--icon';
        btn.dataset.slug = item.slug;
        btn.setAttribute('aria-label', labelFor(item.slug));

        const iconEl = document.createElement('span');
        iconEl.className = 'nav-icon';
        setSVGContent(iconEl, FALLBACK_SVG);

        const labelEl = document.createElement('span');
        labelEl.className   = 'nav-label';
        labelEl.textContent = labelFor(item.slug);

        btn.appendChild(iconEl);
        btn.appendChild(labelEl);
        navElement.appendChild(btn);

        // FIX: use viewPage() for SPA navigation
        btn.addEventListener('click', () => {
          if (typeof window.viewPage === 'function') {
            window.viewPage(item.slug);
          }
        });

        return { item, iconEl, labelEl, btn };
      });

      // Load SVG icons in parallel (non-blocking)
      await Promise.all(entries.map(async ({ item, iconEl, labelEl, btn }) => {
        if (item.icon) {
          const svg = await fetchIcon(item.icon);
          setSVGContent(iconEl, svg);
        }
        // Re-apply label once translations are confirmed ready
        const label = labelFor(item.slug);
        labelEl.textContent = label;
        btn.setAttribute('aria-label', label);
      }));
    },

    /** Re-render labels after a language switch */
    updateLabels(navElement) {
      navElement.querySelectorAll('[data-slug]').forEach(btn => {
        const slug    = btn.dataset.slug;
        const label   = labelFor(slug);
        const labelEl = btn.querySelector('.nav-label');
        if (labelEl) labelEl.textContent = label;
        btn.setAttribute('aria-label', label);
      });
    },
  };
})();

export default NAV;

export function initNavigation() {
  const nav = document.querySelector('.top-nav') || document.querySelector('nav');
  if (nav) NAV.init(nav);

  // Re-render labels whenever the language changes
  document.addEventListener('shop:langChanged', () => {
    const nav2 = document.querySelector('.top-nav') || document.querySelector('nav');
    if (nav2) NAV.updateLabels(nav2);
  });
}
