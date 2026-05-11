/**
 * shop-loader.js (v2 - FIXED)
 *
 * FIX: mountShopEmbeds() previously called Shop.mount(container) which does not
 *      exist in the Shop public API — calling it silently did nothing.
 *
 *      Correct behaviour:
 *        • If the container holds a #shop-embed-root div → call Shop.renderShop()
 *        • Always render the cart icon into #cart-icon-slot (header slot)
 *        • Always render the currency selector into #currency-selector-slot
 *
 *      shop.js must be loaded as a module so that Shop is available on window.
 *      shop-config.js must be loaded first (sets window.CONFIG + window.sendToQueue).
 */

import { loadScript } from './utils/script-loader.js';

let _shopModulesLoaded = false;

export async function loadShopModules() {
  if (_shopModulesLoaded) return;
  // Load config first (sets window.CONFIG), then the shop engine
  const BASE_PATH = window.__BASE_PATH__ || '/';
  await loadScript(BASE_PATH + 'js/shop-config.js',    { type: 'module' });
  await loadScript(BASE_PATH + 'js/modules/shipping.js', { type: 'module' });
  await loadScript(BASE_PATH + 'js/modules/currency.js', { type: 'module' });
  await loadScript(BASE_PATH + 'js/shop.js',           { type: 'module' });
  _shopModulesLoaded = true;

  // Initialise modules now that they're loaded
  if (typeof window.Shipping !== 'undefined' && typeof window.Shipping.init === 'function') {
    await window.Shipping.init();
  }
  if (typeof window.Currency !== 'undefined' && typeof window.Currency.init === 'function') {
    window.Currency.init(); // fire-and-forget; currency:changed event triggers UI refresh
  }

  // Notify any listeners that the shop engine is ready
  document.dispatchEvent(new CustomEvent('webshop:ready'));
}

/**
 * mountShopEmbeds(container)
 * Called by page-loader.js every time a new page fragment is injected.
 *
 * FIX: replaced Shop.mount() (non-existent) with targeted render calls.
 */
export async function mountShopEmbeds(container) {
  await loadShopModules();

  const Shop = window.Shop;
  if (!Shop) return;

  // ── Cart icon in header slot ──────────────────────────────────────────────
  const cartSlot = document.getElementById('cart-icon-slot');
  if (cartSlot) {
    const lang     = window.LANG || 'en';
    const T        = window.T;
    const cartSlug = (T && T.url_slugs && T.url_slugs.cart) || 'cart';
    const base     = window.__BASE_PATH__ || '/';
    const cartUrl  = `${base}${lang}/${cartSlug}/`;
    Shop.renderCartIcon({ target: '#cart-icon-slot', fixed: false, cartUrl });
  }

  // ── Currency selector ─────────────────────────────────────────────────────
  const currSlot = container.querySelector('#currency-selector-slot')
    || document.getElementById('currency-selector-slot');
  if (currSlot) {
    Shop.renderCurrencySelector(currSlot);
  }

  // ── Shop grid (#shop-embed-root) ──────────────────────────────────────────
  const shopRoot = container.querySelector('#shop-embed-root');
  if (shopRoot && shopRoot.id) {
    await Shop.renderShop(shopRoot.id);
  }

  // ── Product info (data-product-id on a #product-info-root element) ────────
  const productRoot = container.querySelector('[data-product-id][id]');
  if (productRoot) {
    const pid = productRoot.dataset.productId
      || new URLSearchParams(window.location.search).get('id');
    if (pid) {
      await Shop.renderProductInfo(productRoot.id, pid);
    }
  }

  // ── Mini cart (#mini-cart-root) ───────────────────────────────────────────
  const miniCart = container.querySelector('#mini-cart-root');
  if (miniCart && miniCart.id) {
    Shop.renderMiniCart(miniCart.id);
  }
}
