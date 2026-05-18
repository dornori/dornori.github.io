/**
 * shop-loader.js (v3 - with feature flags support ONLY)
 * No changes to site-main.js or page-loader.js
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
    
    // Handle currency changes
    document.addEventListener('currency:changed', () => {
      const discountPercent = product.discount || 0;
      const discountedPrice = discountPercent > 0 ? product.price * (1 - discountPercent / 100) : product.price;
      const priceEls = card.querySelectorAll('.webshop-card-price');
      const oldPriceEls = card.querySelectorAll('.webshop-card-price--original');
      
      if (discountPercent > 0 && oldPriceEls.length >= 1 && priceEls.length >= 1) {
        oldPriceEls[0].textContent = Shop.fmt(product.price);
        priceEls[0].textContent = Shop.fmt(discountedPrice);
      } else if (priceEls.length >= 1) {
        priceEls[0].textContent = Shop.fmt(product.price);
      }
    });
  }

  const miniCart = container && container.querySelector('#mini-cart-root');
  if (miniCart && miniCart.id) {
    Shop.renderMiniCart(miniCart.id);
  }
}