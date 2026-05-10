import { loadScript } from '../utils/script-loader.js';

export async function loadShopModules() {
  await loadScript('js/shop.js', { type: 'module' });
}