/**
 * shop-loader.js (v4 - with combined flags + currency discount fix)
 */

import { loadScript } from './utils/script-loader.js';

let _shopModulesLoaded = false;

export async function loadShopModules() {
  if (_shopModulesLoaded) return;
  _shopModulesLoaded = true; // prevent concurrent calls
  const BASE_PATH = window.__BASE_PATH__ || '/';

  // Normal path: site-boot already loaded shop-init which is loading everything.
  // Just wait for webshop:ready instead of loading scripts a second time.
  if (window.__shopConfigPatched) {
    if (!window.__shopInitReady) {
      await new Promise(resolve => {
        document.addEventListener('webshop:ready', resolve, { once: true });
      });
    }
    return;
  }

  // Fallback: shop-init never ran — load everything ourselves
  await loadScript(BASE_PATH + 'js/shop-config.js');
  await loadScript(BASE_PATH + 'js/modules/shipping.js');
  await loadScript(BASE_PATH + 'js/modules/currency.js');
  await loadScript(BASE_PATH + 'js/shop.js');

  if (typeof window.Shipping !== 'undefined' && typeof window.Shipping.load === 'function') {
    await window.Shipping.load();
  }
  if (typeof window.Currency !== 'undefined' && typeof window.Currency.init === 'function') {
    window.Currency.init();
  }
  if (!window.__shopInitReady) {
    window.__shopInitReady = true;
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
      let resolved = false;
      const done = () => { if (!resolved) { resolved = true; resolve(); } };
      document.addEventListener('webshop:ready', done, { once: true });
      // Reduced from 10s: if shop hasn't fired after 3s, kick-start it ourselves
      setTimeout(() => {
        if (!resolved) loadShopModules().then(done);
      }, 3000);
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
    card.dataset.originalPrice = product.price;
    card.dataset.discount = product.discount || 0;
    
    // PASS OPTIONS to buildProductCard
    card.innerHTML = Shop.buildProductCard(product, options);
    el.appendChild(card);
    
    // PASS OPTIONS to wireProductCard
    Shop.wireProductCard(card, product, options);
    
    // FIXED: Handle currency changes with discount support
    const updatePricesOnCurrencyChange = () => {
      const discountPercent = parseFloat(card.dataset.discount) || 0;
      const originalPrice = parseFloat(card.dataset.originalPrice) || product.price;
      const discountedPrice = discountPercent > 0 ? originalPrice * (1 - discountPercent / 100) : originalPrice;
      
      // Update main price displays
      const priceEls = card.querySelectorAll('.webshop-card-price');
      const originalPriceEls = card.querySelectorAll('.webshop-card-price--original');
      
      if (discountPercent > 0 && originalPriceEls.length >= 1 && priceEls.length >= 1) {
        // Has discount - update both original and discounted
        originalPriceEls[0].textContent = Shop.fmt(originalPrice);
        priceEls[0].textContent = Shop.fmt(discountedPrice);
      } else if (priceEls.length >= 1) {
        // No discount - just update main price
        priceEls[0].textContent = Shop.fmt(originalPrice);
      }
      
      // Update any variant prices shown
      const variantSelect = card.querySelector('.webshop-variant-select');
      if (variantSelect && variantSelect.options) {
        const selectedVariantId = variantSelect.value;
        if (selectedVariantId && selectedVariantId !== product.id) {
          const variantProduct = productMap[selectedVariantId];
          if (variantProduct) {
            const variantDiscount = variantProduct.discount || 0;
            const variantOriginalPrice = variantProduct.price;
            const variantDiscountedPrice = variantDiscount > 0 ? variantOriginalPrice * (1 - variantDiscount / 100) : variantOriginalPrice;
            
            const priceEl = card.querySelector('.webshop-card-price');
            const originalPriceEl = card.querySelector('.webshop-card-price--original');
            
            if (variantDiscount > 0 && originalPriceEl) {
              originalPriceEl.textContent = Shop.fmt(variantOriginalPrice);
              if (priceEl) priceEl.textContent = Shop.fmt(variantDiscountedPrice);
            } else if (priceEl) {
              priceEl.textContent = Shop.fmt(variantOriginalPrice);
              if (originalPriceEl) originalPriceEl.style.display = 'none';
            }
          }
        }
      }
    };
    
    document.addEventListener('currency:changed', updatePricesOnCurrencyChange);
  }

  const miniCart = container && container.querySelector('#mini-cart-root');
  if (miniCart && miniCart.id) {
    Shop.renderMiniCart(miniCart.id);
  }
}