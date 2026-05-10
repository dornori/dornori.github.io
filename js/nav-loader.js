import { setSVGContent } from './utils/dom-safe.js';
import SITE_CONFIG from './config.js';

const NAV = (() => {
  return {
    async init(navElement) {
      const items = SITE_CONFIG.navigation || [];
      items.forEach(item => {
        const a = document.createElement('a');
        a.href = item.slug;
        
        const iconEl = document.createElement('span');
        iconEl.className = 'nav-icon';
        const FALLBACK_SVG = '<svg></svg>';
        setSVGContent(iconEl, FALLBACK_SVG);
        
        const labelEl = document.createElement('span');
        labelEl.textContent = item.slug;
        
        a.appendChild(iconEl);
        a.appendChild(labelEl);
        navElement.appendChild(a);
      });
    }
  };
})();

export default NAV;