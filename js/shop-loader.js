/**
<<<<<<< HEAD
 * shop-loader.js

=======
 * shop-loader.js (v4 - with combined flags + currency discount fix)
>>>>>>> parent of 0762379 (Update shop-loader.js)
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

  if (!window.__shopInitReady) {
    document.dispatchEvent(new CustomEvent('webshop:ready'));
  }
}

/**
 * mountShopEmbeds(container)
 * Called by page-loader.js every time a new page fragment is injected.
 */
export async function mountShopEmbeds(container) {
  const shopReady = typeof window.Shop !== 'undefined'
    && typeof window.Currency !== 'undefined'
    && typeof window.Shipping !== 'undefined';

  if (!shopReady) {
    await new Promise(resolve => {
      if (typeof window.Shop !== 'undefined') { resolve(); return; }
      const done = () => resolve();
      document.addEventListener('webshop:ready', done, { once: true });
      setTimeout(() => {
        if (typeof window.Shop === 'undefined' && !window.__shopBooting) {
          window.__shopBooting = true;
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
    const lang = window.LANG || 'en';
    const T = window.T;
    const cartSlug = (T && T.url_slugs && T.url_slugs.cart) || 'cart';
    const base = window.__BASE_PATH__ || '/';
    const cartUrl = `${base}${lang}/${cartSlug}/`;
    Shop.renderCartIcon({ target: '#cart-icon-slot', fixed: false, cartUrl });
  }

  // ── Currency selector ─────────────────────────────────────────────────────
  const currSlot = (container && container.querySelector('#currency-selector-slot'))
    || document.getElementById('currency-selector-slot');
  if (currSlot) {
    Shop.renderCurrencySelector(currSlot);
  }

<<<<<<< HEAD
  // ── Shop grid: #shop-embed-root (legacy) + data-shop-grid (portable) ────────
  //
  //  Usage: <div data-shop-grid [data-filter] [data-columns="3"] [data-category="kits"]></div>
  //
  //    data-shop-grid          — required flag; marks this div as a shop grid embed
  //    data-filter             — presence shows the category filter bar (default: hidden)
  //    data-columns="N"        — fixed column count; omit for auto responsive grid
  //    data-category="slug"    — pre-filter to a single category on load
  //
  const shopGridEls = container
    ? container.querySelectorAll('#shop-embed-root, [data-shop-grid]')
    : [];

  for (const shopRoot of shopGridEls) {
    if (!shopRoot.id) {
      // Assign a unique id so renderShop can find the element
      shopRoot.id = 'shop-grid-' + Math.random().toString(36).slice(2, 8);
    }
    // Skip if already populated
    if (shopRoot.querySelector('.webshop-grid')) continue;

    const gridOptions = {
      showFilter:   shopRoot.id === 'shop-embed-root'
        ? true                                    // legacy: always show filter
        : shopRoot.hasAttribute('data-filter'),   // new: opt-in
      columns:      shopRoot.dataset.columns || 'auto',
      category:     shopRoot.dataset.category || null,
      // Product card flags — same as data-shop-products
      showVariants: shopRoot.hasAttribute('data-variants'),
      showRelated:  shopRoot.hasAttribute('data-related'),
      showAddons:   shopRoot.hasAttribute('data-addons'),
    };

    await Shop.renderShop(shopRoot.id, gridOptions);

    // Pre-filter to requested category after render
    if (gridOptions.category) {
      const btn = shopRoot.querySelector(
        `.webshop-filter__btn[data-cat="${gridOptions.category}"]`
      );
      if (btn) btn.click();
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

  // ── data-shop-products embeds WITH FEATURE FLAGS ─────────────────────────────
  const shopProductEls = container ? container.querySelectorAll('[data-shop-products]') : [];
  
  for (const el of shopProductEls) {
    // Skip if already populated
    if (el.querySelector('.webshop-card-img')) continue;
    
    const slug = el.dataset.shopProducts;
    if (!slug) continue;
    
    // READ FEATURE FLAGS FROM ATTRIBUTES
    const options = {
      showVariants: el.hasAttribute('data-variants'),
      showRelated: el.hasAttribute('data-related'),
      showAddons: el.hasAttribute('data-addons')
    };
    
    // Load all products once
    const allProducts = await Shop.loadProducts();
    const productMap = {};
    allProducts.forEach(p => { productMap[p.id] = p; });
    
    let product = null;
    let preselectedVariantId = null;
    
    // Direct product ID match
    if (productMap[slug]) {
      product = productMap[slug];
    } else if (slug.endsWith('-preassembled')) {
      const variantId = slug.replace(/-preassembled$/, '');
      const base = productMap['pre-assembled'];
      if (base) {
        product = base;
        preselectedVariantId = variantId;
      }
    }
    
    if (!product) continue;
    
    // Clone product if we need to preselect a variant
    if (preselectedVariantId && product.variants) {
      const variant = product.variants.find(v => v === preselectedVariantId);
      if (variant) {
        product = { ...product, variants: [variant] };
      }
    }
    
    const card = document.createElement('div');
    card.className = 'webshop-product-card';
    card.dataset.productId = product.id;
    
    // PASS OPTIONS to buildProductCard
    card.innerHTML = Shop.buildProductCard(product, options);
    el.appendChild(card);
    
    // PASS OPTIONS to wireProductCard
    Shop.wireProductCard(card, product, options);
    

  }

  const miniCart = container && container.querySelector('#mini-cart-root');
  if (miniCart && miniCart.id) {
    Shop.renderMiniCart(miniCart.id);
  }
}