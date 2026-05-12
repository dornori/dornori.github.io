/**
 * shop-loader.js (v2 - fixed)
 *
 * mountShopEmbeds() is called by page-loader.js after injecting page fragments.
 * The shop engine (shop.js, modules) is booted by shop-init.js (plain IIFE via site-boot).
 * This file just waits for that boot and then renders embeds.
 *
 * FIX: original called loadScript with type:'module' on plain scripts = SyntaxError.
 * FIX: mountShopEmbeds now waits for webshop:ready instead of re-booting the shop.
 */

import { loadScript } from './utils/script-loader.js';

let _shopModulesLoaded = false;

export async function loadShopModules() {
  if (_shopModulesLoaded) return;
  const BASE_PATH = window.__BASE_PATH__ || '/';
  if (!window.__shopConfigPatched) {
    await new Promise(resolve => {
      const check = () => { if (window.__shopConfigPatched) resolve(); else setTimeout(check, 50); };
      check();
    });
  }
  // Plain scripts — no type:'module'
  await loadScript(BASE_PATH + 'js/shop-config.js');
  await loadScript(BASE_PATH + 'js/modules/shipping.js');
  await loadScript(BASE_PATH + 'js/modules/currency.js');
  await loadScript(BASE_PATH + 'js/shop.js');
  _shopModulesLoaded = true;

  if (typeof window.Shipping !== 'undefined' && typeof window.Shipping.load === 'function') {
    await window.Shipping.load();
  }
  if (typeof window.Currency !== 'undefined' && typeof window.Currency.init === 'function') {
    window.Currency.init();
  }

  document.dispatchEvent(new CustomEvent('webshop:ready'));
}

/**
 * mountShopEmbeds(container)
 * Called by page-loader.js every time a new page fragment is injected.
 */
export async function mountShopEmbeds(container) {
  // If shop already booted via shop-init, use it. Otherwise boot ourselves.
  const shopReady = typeof window.Shop !== 'undefined'
    && typeof window.Currency !== 'undefined'
    && typeof window.Shipping !== 'undefined';

  if (!shopReady) {
    // Wait for shop-init to finish (fires webshop:ready), with fallback boot
    await new Promise(resolve => {
      if (typeof window.Shop !== 'undefined') { resolve(); return; }
      const done = () => resolve();
      document.addEventListener('webshop:ready', done, { once: true });
      // Fallback: boot ourselves if shop-init never fires
      setTimeout(() => {
        if (typeof window.Shop === 'undefined') {
          loadShopModules().then(done);
        } else {
          done();
        }
      }, 10000);
    });
  }

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
  const currSlot = (container && container.querySelector('#currency-selector-slot'))
    || document.getElementById('currency-selector-slot');
  if (currSlot) {
    Shop.renderCurrencySelector(currSlot);
  }

  // ── Shop grid (#shop-embed-root) ──────────────────────────────────────────
  const shopRoot = container && container.querySelector('#shop-embed-root');
  if (shopRoot && shopRoot.id) {
    await Shop.renderShop(shopRoot.id);
  }

  // ── Product info (data-product-id) ────────────────────────────────────────
  const productRoot = container && container.querySelector('[data-product-id][id]');
  if (productRoot) {
    const pid = productRoot.dataset.productId
      || new URLSearchParams(window.location.search).get('id');
    if (pid) await Shop.renderProductInfo(productRoot.id, pid);
  }

  // ── data-shop-products embeds ─────────────────────────────────────────────
  const shopProductEls = container ? container.querySelectorAll('[data-shop-products]') : [];
  if (shopProductEls.length) {
    // Load all products once
    const allProducts = await Shop.loadProducts();
    const productMap  = {};
    allProducts.forEach(p => { productMap[p.id] = p; });

    shopProductEls.forEach(el => {
      const slug = el.dataset.shopProducts;
      if (!slug) return;

      let product = null;
      let preselectedVariantId = null;

      // Direct product ID match
      if (productMap[slug]) {
        product = productMap[slug];
      } else if (slug.endsWith('-preassembled')) {
        // e.g. "ufo-spaceblue-preassembled" → product "pre-assembled", variant "ufo-spaceblue"
        const variantId = slug.replace(/-preassembled$/, '');
        const base      = productMap['pre-assembled'];
        if (base) {
          product              = base;
          preselectedVariantId = variantId;
        }
      }

      if (!product) return;

      // Clone product if we need to preselect a variant (show only that variant)
      if (preselectedVariantId && product.variants) {
        const variant = product.variants.find(v => v.id === preselectedVariantId);
        if (variant) {
          product = { ...product, variants: [variant] };
        }
      }

      const card = document.createElement('div');
      card.className = 'webshop-product-card';
      card.innerHTML = Shop.buildProductCard(product);
      el.appendChild(card);
      Shop.wireProductCard(card, product);
    });
  }

  const miniCart = container && container.querySelector('#mini-cart-root');
  if (miniCart && miniCart.id) {
    Shop.renderMiniCart(miniCart.id);
  }
}
