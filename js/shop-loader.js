import { loadScript } from '../utils/script-loader.js';

export async function loadShopModules() {
  await loadScript('js/shop.js', { type: 'module' });
}

export async function mountShopEmbeds(container) {
  await loadShopModules();
  if (typeof window.Shop !== 'undefined' && typeof window.Shop.mount === 'function') {
    window.Shop.mount(container);
  }
}