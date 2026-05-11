import { loadScript } from './utils/script-loader.js';

export async function initShop() {
  await loadScript('js/shop-config.js', { type: 'module' });
}