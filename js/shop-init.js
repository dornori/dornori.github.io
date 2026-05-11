import { loadScript } from './utils/script-loader.js';

export async function initShop() {
  const BASE_PATH = window.__BASE_PATH__ || '/';
  await loadScript(BASE_PATH + 'js/shop-config.js', { type: 'module' });
}