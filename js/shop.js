/* =========================================================
   WEBSHOP SHOP ENGINE  –  shop.js  (v4 - FIXED)
   =========================================================
   Language file structure:
     lang/{lang}/common.json   — UI strings, slugs, profiles
     lang/{lang}/products.json — product text
   ========================================================= */

if (typeof window.Shop !== "undefined") { var Shop = window.Shop; } else
var Shop = (() => {
  let LANG = {};
  let PRODUCT_LANG    = {};
  let PRODUCT_LANG_EN = {};
  let _langLoaded = false;
  let _langLoadPromise = null;
  let _products = {};

  /* ═══════════════════════════════════════════════════════
     LANGUAGE RESOLUTION
  ═══════════════════════════════════════════════════════ */
  function detectBrowserLanguage() {
    const supported = CONFIG.supportedLanguages || [CONFIG.defaultLanguage || "en"];
    for (const lang of (navigator.languages || [navigator.language || "en"])) {
      const code = lang.split("-")[0].toLowerCase();
      if (supported.includes(code)) return code;
    }
    return null;
  }

  function resolveLanguage() {
    const supported = CONFIG.supportedLanguages || [CONFIG.defaultLanguage || "en"];
    const langKey   = CONFIG.storageKeys?.shopLangKey || CONFIG.storageKeys?.parentLangKey || "dornori-lang";

    // PRIORITY 1: Check URL path for language code (e.g., /nl/product/?id=...)
    try {
      const basePath = CONFIG.basePath || '/';
      const rawPath = window.location.pathname;
      let relativePath = rawPath;
      
      if (basePath && basePath !== '/' && rawPath.startsWith(basePath)) {
        relativePath = rawPath.slice(basePath.length);
      }
      
      const parts = relativePath
        .replace(/^\/+|\/+$/g, '')
        .split('/')
        .filter(Boolean);
      
      // Check first path segment against supported languages (dynamic, not hardcoded)
      if (parts.length >= 1 && supported.includes(parts[0])) {
        const langFromPath = parts[0];
        CONFIG.language = langFromPath;
        localStorage.setItem(langKey, langFromPath);
        return langFromPath;
      }
    } catch (e) {
      // silently fail, continue to next check
    }

    // PRIORITY 2: Check URL query param (?lang=...)
    const urlLang = new URLSearchParams(window.location.search).get("lang");
    if (urlLang && supported.includes(urlLang)) {
      CONFIG.language = urlLang;
      localStorage.setItem(langKey, urlLang);
      return urlLang;
    }
    
    // PRIORITY 3: Check localStorage
    const saved = localStorage.getItem(langKey);
    if (saved && supported.includes(saved)) { CONFIG.language = saved; return saved; }

    // PRIORITY 4: Check browser language
    const browser = detectBrowserLanguage();
    if (browser) { CONFIG.language = browser; return browser; }

    // PRIORITY 5: Use default
    const def = CONFIG.language || CONFIG.defaultLanguage || "en";
    CONFIG.language = def;
    return def;
  }

  async function switchLanguage(code) {
    if (code === CONFIG.language && _langLoaded && LANG && Object.keys(LANG).length > 0) return;
    const langKey = CONFIG.storageKeys?.shopLangKey || CONFIG.storageKeys?.parentLangKey || "dornori-lang";
    CONFIG.language = code;
    localStorage.setItem(langKey, code);
    _langLoaded = false; _langLoadPromise = null; LANG = {};
    PRODUCT_LANG = {}; PRODUCT_LANG_EN = {};
    _products = {}; // Clear product cache so they reload in the new language
    await loadLang();
    document.dispatchEvent(new CustomEvent("shop:langChanged", { detail: { lang: code } }));
  }

  /* ═══════════════════════════════════════════════════════
     IMAGE NAMING CONVENTION
  ═══════════════════════════════════════════════════════ */
  function slugify(str) {
    return (str || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  function buildImagePath(productId, variantId = null, colorSlug = null) {
    const dir = CONFIG.images?.imageDir || "images/products/";
    const ext = CONFIG.images?.imageExt || "webp";
    const pid = slugify(productId);
    if (variantId && colorSlug) return `${dir}${pid}_${slugify(variantId)}_${slugify(colorSlug)}.${ext}`;
    if (variantId)               return `${dir}${pid}_${slugify(variantId)}.${ext}`;
    if (colorSlug)               return `${dir}${pid}_${slugify(colorSlug)}.${ext}`;
    return null;
  }

  /* ─── VARIANT HELPERS ───────────────────────────────── */
  function getVariant(product, variantId) {
    if (!product.variants?.length) return null;
    return product.variants.find(v => v.id === variantId) || product.variants[0];
  }
  function variantPrice(product, variantId) {
    const v = getVariant(product, variantId);
    return (v && v.price != null) ? v.price : product.price;
  }
  function variantWeight(product, variantId) {
    const v = getVariant(product, variantId);
    return (v && v.weight != null) ? v.weight : (product.weight || 0);
  }
  function variantImage(product, variantId) {
    const v = getVariant(product, variantId);
    if (v?.image) return v.image;
    return buildImagePath(product.id, variantId) || product.image;
  }
  function colorImageSrc(product, color) {
    if (!color) return product.image;
    return buildImagePath(product.id, null, color) || product.image;
  }
  function variantStock(product, variantId) {
    const v = getVariant(product, variantId);
    return (v && v.stock != null) ? v.stock : (product.stock || 0);
  }
  function variantInStock(product, variantId) { return variantStock(product, variantId) > 0; }

  /* ─── CART ──────────────────────────────────────────── */
  function getCart() { try { return JSON.parse(localStorage.getItem(CONFIG.storageKeys?.cartKey || "webshop_cart") || "[]"); } catch { return []; } }
  function saveCart(cart) {
    try {
      localStorage.setItem(CONFIG.storageKeys?.cartKey || "webshop_cart", JSON.stringify(cart));
    } catch (e) {
      // Handle quota exceeded or private browsing
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_FILE_CORRUPTED') {
        console.warn('[shop] localStorage quota exceeded or unavailable:', e);
        toast("Storage unavailable - your cart may not persist", 3000);
      }
    }
    document.dispatchEvent(new CustomEvent("shop:cartUpdated", { detail: { cart } }));
  }
  function addToCart(product, qty = 1, variantId = null, selectedColor = null, imageOverride = null) {
    const cart  = getCart();
    // If variantId is selected and is itself a standalone product, use it as cartKey base
    // Otherwise use the current product ID + variant suffix
    const cartBase = variantId && variantId.match(/^mushroom-|^ufo-|^star-/) ? variantId : product.id;
    const vKey = (variantId && !cartBase.match(/^mushroom-|^ufo-|^star-/)) ? variantId : (selectedColor || "");
    const key = cartBase + (vKey ? "_" + slugify(vKey) : "");
    const existing = cart.find(i => i.cartKey === key);
    const price  = variantId ? variantPrice(product, variantId)  : product.price;
    const weight = variantId ? variantWeight(product, variantId) : (product.weight || 0);
    const image  = imageOverride || (variantId ? variantImage(product, variantId) : selectedColor ? colorImageSrc(product, selectedColor) : product.image);
    const label  = variantId ? (getVariant(product, variantId)?.label || variantId) : selectedColor;
    const maxQty = variantId ? variantStock(product, variantId) : (product.stock || 99);
    const resolvedName = pName(product) || product.name || product.id;
    if (existing) { existing.qty = Math.min(existing.qty + qty, maxQty || 99); }
    else cart.push({ ...product, name: resolvedName, cartKey: key, qty, price, weight, image, selectedColor: label, variantId });
    saveCart(cart); return cart;
  }
  function removeFromCart(cartKey) { saveCart(getCart().filter(i => i.cartKey !== cartKey)); }
  function updateQty(cartKey, qty) {
    const cart = getCart(), item = cart.find(i => i.cartKey === cartKey);
    if (!item) return;
    if (qty <= 0) { removeFromCart(cartKey); return; }
    item.qty = qty; saveCart(cart);
  }
  function clearCart() {
    localStorage.removeItem(CONFIG.storageKeys?.cartKey || "webshop_cart");
    document.dispatchEvent(new CustomEvent("shop:cartUpdated", { detail: { cart: [] } }));
  }

  /* ─── TOTALS ────────────────────────────────────────── */
  function calculateTotals(cart, isBusiness = false, countryCode = null) {
    const subtotal    = cart.reduce((a, i) => a + i.price * i.qty, 0);
    const totalWeight = cart.reduce((a, i) => a + (i.weight || 0) * i.qty, 0);
    let cfg = { base: CONFIG.shipping.base, perKg: CONFIG.shipping.perKg, freeThreshold: CONFIG.shipping.freeThreshold, estimatedDays: CONFIG.shipping.estimatedDays };
    if (countryCode && typeof Shipping !== "undefined") cfg = Shipping.getRate(countryCode);
    const isFreeShipping = subtotal >= cfg.freeThreshold;
    const shipping       = isFreeShipping ? 0 : cfg.base + totalWeight * cfg.perKg;
    const tax            = isBusiness ? 0 : subtotal * CONFIG.taxRate;
    return { subtotal, shipping, tax, total: subtotal + shipping + tax, totalWeight, isFreeShipping, estimatedDays: cfg.estimatedDays };
  }

  /* ─── LANG LOADER ───────────────────────────────────── */
  function pName(p) {
    return PRODUCT_LANG[p.id]?.name || PRODUCT_LANG_EN[p.id]?.name
      || p.i18n?.[CONFIG.language]?.name || p.i18n?.en?.name || p.name || "";
  }
  function pDesc(p) {
    return PRODUCT_LANG[p.id]?.description || PRODUCT_LANG_EN[p.id]?.description
      || p.i18n?.[CONFIG.language]?.description || p.i18n?.en?.description || p.description || "";
  }
  function pCategory(p) {
    return PRODUCT_LANG[p.id]?.category || PRODUCT_LANG_EN[p.id]?.category
      || p.i18n?.[CONFIG.language]?.category || p.i18n?.en?.category || p.category || "";
  }

  function loadLang() {
    if (_langLoaded) return Promise.resolve(LANG);
    if (_langLoadPromise) return _langLoadPromise;
    // Use CONFIG.language directly — it's already set by switchLanguage() or resolveLanguage() at init.
    // Calling resolveLanguage() here would re-read the URL which may not yet reflect the new language.
    const lang = CONFIG.language || resolveLanguage();

    const safeFetch = url => fetch(url)
      .then(r => { if (!r.ok) throw 0; return r.json(); })
      .catch(() => ({}));

    const langDir = CONFIG.data.langDir || '';
    const fallback = CONFIG.defaultLanguage || 'en';
    _langLoadPromise = Promise.all([
      safeFetch(langDir + lang    + '/common.json'),
      safeFetch(langDir + fallback + '/common.json'),
      safeFetch(langDir + lang    + '/products.json'),
      safeFetch(langDir + fallback + '/products.json'),
    ]).then(([ui, uiEn, prod, prodEn]) => {
      LANG = { ...uiEn, ...ui };
      const toDict = obj => {
        if (Array.isArray(obj)) { const d = {}; obj.forEach(p => { if (p && p.id) d[p.id] = p; }); return d; }
        const r = { ...obj }; delete r._readme; return r;
      };
      PRODUCT_LANG    = toDict(prod);
      PRODUCT_LANG_EN = toDict(prodEn);
      _langLoaded = true;
      return LANG;
    });
    return _langLoadPromise;
  }
  function t(key, fallback = "") { return LANG[key] || fallback || key; }

  /* ─── FORMAT ────────────────────────────────────────── */
  function fmt(eurAmount) {
    // FIXED: Provide immediate Euro fallback if Currency not ready
    if (typeof Currency !== "undefined" && Currency.getActive && Currency.isReady && Currency.isReady()) {
      if (Currency.getActive() !== "EUR") return Currency.fmt(eurAmount);
    }
    return "€" + eurAmount.toFixed(2);
  }
  function fmtWeight(kg) { return kg >= 1 ? kg.toFixed(1) + " kg" : (kg * 1000).toFixed(0) + " g"; }

  /* ─── PRODUCT LOADER ────────────────────────────────── */
  async function loadProducts() {
    await loadLang();
    const lang = CONFIG.language || resolveLanguage();
    const langDir = CONFIG.data.langDir || '';
    
    const safeFetch = url => fetch(url)
      .then(r => { if (!r.ok) throw 0; return r.json(); })
      .catch(() => null);
    
    // 1. Always load base products first
    const src = CONFIG.data?.productsJson || "data/products.json";
    let all = [];
    try {
      all = await fetch(src).then(r => { if (!r.ok) throw 0; return r.json(); });
    } catch(e) {
      console.warn('Failed to load base products from', src);
      return [];
    }
    
    // 2. Try to overlay language-specific overrides
    if (lang && langDir) {
      const langProducts = await safeFetch(langDir + lang + '/products.json');
      if (langProducts && Array.isArray(all)) {
        all = all.map(p => {
          const override = langProducts[p.id];
          if (override) {
            return { ...p, ...override };
          }
          return p;
        });
      }
    }
    
    all.forEach(p => { _products[p.id] = p; });
    return all;
  }
  
  async function getProduct(id) {
    if (_products[id]) return _products[id];
    await loadLang();
    const lang = CONFIG.language || resolveLanguage();
    const langDir = CONFIG.data.langDir || '';
    
    const safeFetch = url => fetch(url)
      .then(r => { if (!r.ok) throw 0; return r.json(); })
      .catch(() => null);
    
    // 1. Load base products
    const src = CONFIG.data?.productsJson || "data/products.json";
    let all = [];
    try {
      all = await fetch(src).then(r => { if (!r.ok) throw 0; return r.json(); });
    } catch(e) {
      console.warn('Failed to load base products from', src);
      return null;
    }
    
    // 2. Overlay language-specific overrides
    if (lang && langDir) {
      const langProducts = await safeFetch(langDir + lang + '/products.json');
      if (langProducts && Array.isArray(all)) {
        all = all.map(p => {
          const override = langProducts[p.id];
          if (override) {
            return { ...p, ...override };
          }
          return p;
        });
      }
    }
    
    all.forEach(p => { _products[p.id] = p; });
    return _products[id] || null;
  }
  function generateOrderRef() { return "LM-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substr(2,5).toUpperCase(); }

  /* ─── TOAST ─────────────────────────────────────────── */
  function toast(text, duration = 2800) {
    document.querySelector(".webshop-toast")?.remove();
    const el = document.createElement("div");
    el.className = "webshop-toast";
    el.innerHTML = `<span class="webshop-toast-icon">✓</span>${text}`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("webshop-toast--visible"));
    setTimeout(() => { el.classList.remove("webshop-toast--visible"); setTimeout(() => el.remove(), 400); }, duration);
  }

  /* ─── SWAP IMAGE ────────────────────────────────────── */
  function swapMainImg(imgEl, src, fallback = null) {
    if (!imgEl || !src) return;
    if (src.startsWith("data:")) {
      imgEl.style.opacity = "0";
      setTimeout(() => { imgEl.src = src; imgEl.style.opacity = ""; }, 50);
      return;
    }
    imgEl.style.opacity = "0";
    const next = new Image();
    next.onload  = () => { setTimeout(() => { imgEl.src = src; imgEl.style.opacity = ""; }, 50); };
    next.onerror = () => { imgEl.src = fallback || imgEl.src; imgEl.style.opacity = ""; };
    next.src = src;
  }

  /* ─── CURRENCY SELECTOR ─────────────────────────────── */
  function renderCurrencySelector(target) {
    if (CONFIG.features?.showCurrencySelector === false) return;
    const container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container || typeof Currency === "undefined") return;
    
    async function build() {
      if (Currency.waitForReady) await Currency.waitForReady();
      const active = Currency.getActive();
      container.className = "profile-selector-wrap";
      container.innerHTML = "CURRENCY " +
        `<select class="profile-select" aria-label="Currency">
          ${Currency.list().map(c => `<option value="${c.code}"${c.code===active?" selected":""}>${c.code} ${c.symbol}</option>`).join("")}
        </select>`;
      container.querySelector("select").addEventListener("change", e => Currency.setActive(e.target.value));
    }
    
    build();
    document.addEventListener("currency:changed", build);
  }

  /* ─── LANGUAGE SWITCHER ─────────────────────────────── */
  function wireLanguageSwitcher(selector = ".webshop-lang-btn") {
    const show = CONFIG.features?.showLanguageSwitcher !== false;
    document.querySelectorAll(selector).forEach(btn => {
      if (!show) { btn.style.display = "none"; btn.setAttribute("aria-hidden", "true"); }
      btn.classList.toggle("active", btn.dataset.lang === CONFIG.language);
      btn.addEventListener("click", async () => {
        const code = btn.dataset.lang;
        document.querySelectorAll(selector).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        await switchLanguage(code);
        // Do not push ?lang= — language is managed via path-based routing and localStorage.
      });
    });
  }

  /* ─── BACK BUTTON ───────────────────────────────────── */
  function renderBackButton(target, options = {}) {
    const { href = null, label = null, onClick = null } = options;
    const container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container) return;
    const el = document.createElement(href ? "a" : "button");
    el.className = "webshop-back-btn";
    if (href) el.href = href;
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15"><polyline points="15 18 9 12 15 6"/></svg>
      <span class="webshop-back-btn__label">${label || t("back_to_shop")}</span>`;
    if (!href && !onClick) el.addEventListener("click", () => window.history.back());
    else if (onClick) el.addEventListener("click", onClick);
    container.prepend(el);
    document.addEventListener("shop:langChanged", () => { el.querySelector(".webshop-back-btn__label").textContent = label || t("back_to_shop"); });
    return el;
  }

  /* ─── CART ICON ─────────────────────────────────────── */
  function renderCartIcon(options = {}) {
    const { target = "body", fixed = true, cartUrl = (typeof window !== "undefined" && window.__CART_URL__) || "cart/" } = options;

    const mount = target === "body" ? document.body : document.querySelector(target);
    if (!mount) return;

    /* ── Idempotent: if an icon already exists in this slot, just update its href ── */
    const existing = mount.querySelector(".webshop-cart-icon-wrap");
    if (existing) {
      const link = existing.querySelector(".webshop-cart-icon");
      if (link) link.href = cartUrl;
      return;
    }

    /* Outer wrapper — positions the dropdown relative to the icon */
    const outer = document.createElement("div");
    outer.className = "webshop-cart-icon-wrap" + (fixed ? " webshop-cart-icon-wrap--fixed" : "");

    const wrapper = document.createElement("a");
    wrapper.href = cartUrl;
    wrapper.className = "webshop-cart-icon";
    wrapper.setAttribute("aria-label", "Shopping cart");
    wrapper.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      <span class="webshop-cart-icon__badge" aria-live="polite">0</span>`;
    
    // Use SPA navigation instead of full page reload
    wrapper.addEventListener('click', e => { 
      e.preventDefault(); 
      if (typeof window.viewPage === 'function') {
        window.viewPage('cart');
      } else {
        window.location.href = cartUrl;
      }
    });

    /* Hover dropdown */
    const dropdown = document.createElement("div");
    dropdown.className = "webshop-cart-hover-panel";

    outer.appendChild(wrapper);
    outer.appendChild(dropdown);

    mount.appendChild(outer);

    function renderDropdown() {
      loadLang().then(() => {
        const cart = getCart();
        const { subtotal, total, shipping, isFreeShipping } = calculateTotals(cart);
        
        // Use the CURRENT LANG variable (just reloaded by loadLang)
        // Don't cache translations in helper functions - use t() directly
        if (!cart.length) {
          dropdown.innerHTML = `<p class="webshop-cart-hover-panel__empty">${t("cart_empty", "Your cart is empty")}</p>`;
          return;
        }
        
        const lang = CONFIG.language || 'en';
        const productSlug = (window.T && window.T.url_slugs && window.T.url_slugs.product) || 'product';
        
        dropdown.innerHTML = `
          <ul class="webshop-cart-hover-panel__list">
            ${cart.map(item => `
              <li class="webshop-cart-hover-panel__item">
                <a class="webshop-cart-hover-panel__item-link" href="/${lang}/${productSlug}/?id=${item.id}">
                  <img class="webshop-cart-hover-panel__img" src="${item.image}" alt="${item.name}" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 72 72%22%3E%3Crect fill=%22%23e8e4de%22 width=%2272%22 height=%2272%22/%3E%3C/svg%3E'">
                  <div class="webshop-cart-hover-panel__info">
                    <span class="webshop-cart-hover-panel__name">${item.name}${item.selectedColor ? ` <em>${item.selectedColor}</em>` : ""}</span>
                    <span class="webshop-cart-hover-panel__qty">${item.qty} × ${fmt(item.price)}</span>
                  </div>
                </a>
                <button class="webshop-cart-hover-panel__remove" data-key="${item.cartKey}" aria-label="${t("remove","Remove")}">✕</button>
              </li>`).join("")}
          </ul>
          <div class="webshop-cart-hover-panel__footer">
            <div class="webshop-cart-hover-panel__totals">
              <span>${t("subtotal","Subtotal")}</span><span>${fmt(subtotal)}</span>
            </div>
            <div class="webshop-cart-hover-panel__totals webshop-cart-hover-panel__totals--shipping">
              <span>${t("shipping","Shipping")}</span><span>${isFreeShipping ? t("free","FREE") : fmt(shipping)}</span>
            </div>
            <a class="webshop-btn webshop-btn--primary" href="${(typeof window !== 'undefined' && window.__CART_URL__) || cartUrl}">${t("checkout","Checkout")}</a>
          </div>`;
        dropdown.querySelectorAll(".webshop-cart-hover-panel__remove").forEach(btn => {
          btn.addEventListener("click", e => { e.preventDefault(); removeFromCart(btn.dataset.key); });
        });
      });
    }

    function updateBadge() {
      const count = getCart().reduce((a, i) => a + i.qty, 0);
      const badge = wrapper.querySelector(".webshop-cart-icon__badge");
      if (badge) { badge.textContent = count; badge.classList.toggle("webshop-cart-icon__badge--hidden", count === 0); }
      renderDropdown();
    }

    updateBadge();
    document.addEventListener("shop:cartUpdated", updateBadge);
    document.addEventListener("shop:langChanged", updateBadge);
    return outer;
  }

  /* ═══════════════════════════════════════════════════════
     RELATED PRODUCTS STRIP
  ═══════════════════════════════════════════════════════ */
  /* Resolve a related entry: accepts either a string ID or a legacy inline object */
  function _resolveRelated(entry) {
    if (typeof entry === "string") return _products[entry] || null;
    if (entry && typeof entry === "object") {
      /* prefer cached version if available (has translated name etc) */
      return _products[entry.id] || entry;
    }
    return null;
  }

  function buildRelatedStrip(product, context = "card") {
    /* support addons array for the card strip; fall back to related */
    const ids = product.addons || product.related;
    if (!ids?.length) return "";
    const items = ids.map(_resolveRelated).filter(Boolean);
    if (!items.length) return "";
    return `<div class="webshop-related${context === "info" ? " webshop-related--info" : ""}">
        <h4 class="webshop-related__title">${t("related_products", "You may also need")}</h4>
        <div class="webshop-related__list">
          ${items.map(r => `
            <div class="webshop-related__item" data-related-id="${r.id}">
              <img class="webshop-related__img" src="${r.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 72 72%22%3E%3Crect fill=%22%23e8e4de%22 width=%2272%22 height=%2272%22/%3E%3C/svg%3E'}" alt="${pName(r)}" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 72 72%22%3E%3Crect fill=%22%23e8e4de%22 width=%2272%22 height=%2272%22/%3E%3C/svg%3E'">
              <div class="webshop-related__info">
                <span class="webshop-related__name">${pName(r)}</span>
                ${pDesc(r) ? `<span class="webshop-related__desc">${pDesc(r)}</span>` : ""}
                <span class="webshop-related__price">${fmt(r.price)}</span>
              </div>
              <button class="webshop-related__add webshop-btn webshop-btn--sm webshop-btn--outline" data-related-id="${r.id}">${t("add_to_cart", "Add")}</button>
            </div>`).join("")}
        </div>
      </div>`;
  }

  function wireRelatedStrip(container, product) {
    const ids = product.addons || product.related;
    if (!ids?.length) return;
    container.querySelectorAll(".webshop-related__add").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const rel = _resolveRelated(btn.dataset.relatedId) || ids.map(_resolveRelated).find(r => r?.id === btn.dataset.relatedId);
        if (!rel) return;
        addToCart(rel, 1);
        toast(`${pName(rel)} ${t("added", "added to cart")}`);
      });
    });
  }

  /* ═══════════════════════════════════════════════════════
     PRODUCT CARD
  ═══════════════════════════════════════════════════════ */
  function buildProductCard(p) {
    const hasVariants  = p.variants?.length > 0;
    // Default display uses the product itself (not first variant)
    const displayPrice = p.price;
    const discountPercent = p.discount || 0;
    const discountedPrice = discountPercent > 0 ? displayPrice * (1 - discountPercent / 100) : displayPrice;
    const inStock      = p.stock > 0;

    let selectorHtml = "";
    if (hasVariants) {
      // Prepend a "self" button for the main product, active by default.
      // The product's own label comes from its name; use a short form if available.
      const selfLabel = p.selfLabel || pName(p) || p.id;
      const selfBtn = `<button class="webshop-variant-btn active" data-variant-id="${p.id}" title="${selfLabel}">${selfLabel}</button>`;
      selectorHtml = `<div class="webshop-variants">${selfBtn}${p.variants.map((v) => {
        const so = v.stock != null && v.stock === 0;
        return `<button class="webshop-variant-btn${so?" soldout":""}" data-variant-id="${v.id}" ${so?`disabled title="${t("sold_out","Sold Out")}"`:""}>${v.label}${so?` <em>(${t("sold_out","Sold Out")})</em>`:""}</button>`;
      }).join("")}</div>`;
    } else if (p.colors?.length) {
      const so = p.colors_soldout || [];
      selectorHtml = `<div class="webshop-colors">${p.colors.map((c,i) => {
        const s = so.includes(c);
        return `<button class="webshop-color${i===0?" webshop-color--active":""}${s?" webshop-color--soldout":""}" data-color="${c}" title="${c}${s?" ("+t("sold_out","Sold Out")+")" :""}" ${s?'disabled aria-disabled="true"':""}></button>`;
      }).join("")}</div>`;
    }

    // Build a lang-aware product URL — ignore p.url which is hardcoded to /en/
    const lang    = CONFIG.language || resolveLanguage();
    const base    = (window.SHOP_CONFIG && window.SHOP_CONFIG.basePath) || CONFIG.data?.basePath || '/';
    const slug    = (window.T && window.T.url_slugs && window.T.url_slugs.product) || 'product';
    const prodUrl = `${base}${lang}/${slug}/?id=${p.id}`;
    const hasUrl  = !!p.id;
    const wTag    = `a href="${prodUrl}"`;
    const wEnd    = 'a';

    return `
      <${wTag} class="webshop-card-img-wrap${hasUrl?" webshop-card-img-link":""}"${hasUrl?` title="${pName(p)}"`:""}>
        <img class="webshop-card-img" src="${p.image}" alt="${pName(p)}" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 72 72%22%3E%3Crect fill=%22%23e8e4de%22 width=%2272%22 height=%2272%22/%3E%3C/svg%3E'">
        ${p.featured?`<span class="webshop-badge">${t("featured","Featured")}</span>`:""}
        ${p.bestseller?`<span class="webshop-badge webshop-badge--bestseller">Best Seller</span>`:""}
        ${discountPercent > 0?`<span class="webshop-badge webshop-badge--discount">${discountPercent}% OFF</span>`:""}
      </${wEnd}>
      <div class="webshop-card-body">
        <h3 class="webshop-card-title">${pName(p)}</h3>
        ${selectorHtml}
        <div class="webshop-card-footer">
          ${discountPercent > 0?`<span class="webshop-card-price webshop-card-price--original">${fmt(displayPrice)}</span><span class="webshop-card-price webshop-card-price--discounted">${fmt(discountedPrice)}</span>`:`<span class="webshop-card-price">${fmt(displayPrice)}</span>`}
          <div class="webshop-qty-control">
            <button class="webshop-qty-btn webshop-qty-btn--minus" aria-label="Decrease">−</button>
            <span class="webshop-qty-val">1</span>
            <button class="webshop-qty-btn webshop-qty-btn--plus" aria-label="Increase">+</button>
          </div>
        </div>
        <button class="webshop-card-atc webshop-btn webshop-btn--primary webshop-btn--full" ${inStock?"":"disabled"}>
          ${inStock?t("add_to_cart","Add to Cart"):t("out_of_stock","Out of Stock")}
        </button>
        ${buildRelatedStrip(p, "card")}
      </div>`;
  }

  function wireProductCard(card, p) {
    let qty = 1;
    const hasVariants = p.variants?.length > 0;

    // selectedVariantId = null means "main product is selected" (no variant override).
    // The self-button (data-variant-id === p.id) always maps back to null.
    let selectedVariantId = null;
    let selectedColor = !hasVariants && p.colors ? p.colors[0] : null;

    const img     = card.querySelector(".webshop-card-img");
    const priceEl = card.querySelector(".webshop-card-price");
    const addBtn  = card.querySelector(".webshop-card-atc");

    // effectiveVariantId: null when main product or self-button selected.
    // Prevents duplicate cart keys and uses product's own price/image/stock.
    function effectiveVid() {
      return (selectedVariantId === null || selectedVariantId === p.id) ? null : selectedVariantId;
    }

    function refresh() {
      if (!hasVariants) return;
      const evid    = effectiveVid();
      const price   = evid ? variantPrice(p, evid) : p.price;
      const inStock = evid ? variantInStock(p, evid) : (p.stock > 0);
      const imgSrc  = evid ? variantImage(p, evid) : p.image;
      if (priceEl) priceEl.textContent = fmt(price);
      if (addBtn)  { addBtn.disabled = !inStock; addBtn.textContent = inStock ? t("add_to_cart","Add to Cart") : t("out_of_stock","Out of Stock"); }
      if (img)     swapMainImg(img, imgSrc, p.image);
    }

    card.querySelectorAll(".webshop-variant-btn:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".webshop-variant-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        // Self-button (p.id) → null so cart uses main product key
        selectedVariantId = (btn.dataset.variantId === p.id) ? null : btn.dataset.variantId;
        refresh();
      });
    });
    card.querySelectorAll(".webshop-color:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".webshop-color").forEach(b => b.classList.remove("webshop-color--active"));
        btn.classList.add("webshop-color--active"); selectedColor = btn.dataset.color;
        if (img) swapMainImg(img, colorImageSrc(p, selectedColor), p.image);
      });
    });
    const qv = card.querySelector(".webshop-qty-val");
    card.querySelector(".webshop-qty-btn--plus")?.addEventListener("click", () => { const evid = effectiveVid(); const max = evid ? variantStock(p, evid) : (p.stock||99); qty = Math.min(qty+1, max||99); qv.textContent = qty; });
    card.querySelector(".webshop-qty-btn--minus")?.addEventListener("click", () => { qty = Math.max(1, qty-1); qv.textContent = qty; });
    addBtn?.addEventListener("click", () => {
      const evid = effectiveVid();
      addToCart(p, qty, evid, selectedColor, img?.src || null);
      const itemName = evid ? (getVariant(p, evid)?.label || evid) : (pName(p) || p.id);
      toast(`${itemName} ${t("added","added to cart")}`);
    });
    wireRelatedStrip(card, p);
  }

  /* ═══════════════════════════════════════════════════════
     PRODUCT GRID
  ═══════════════════════════════════════════════════════ */
  async function renderShop(divId, options = {}) {
    await loadLang();
    let products  = await loadProducts();
    const container = document.getElementById(divId);
    if (!container) return;
    const { columns = "auto", showFilter = true } = options;

    function buildGrid() {
      container.innerHTML = ""; container.classList.add("webshop-shop");
      if (showFilter) {
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
        if (cats.length > 1) {
          const filterEl = document.createElement("div");
          filterEl.className = "webshop-filter";
          filterEl.innerHTML = `<button class="webshop-filter__btn webshop-filter__btn--active" data-cat="all">${t("category_all","All")}</button>
            ${cats.map(c => `<button class="webshop-filter__btn" data-cat="${c}">${t("category_"+c)||(c.charAt(0).toUpperCase()+c.slice(1))}</button>`).join("")}`;
          filterEl.addEventListener("click", e => {
            const btn = e.target.closest(".webshop-filter__btn"); if (!btn) return;
            filterEl.querySelectorAll(".webshop-filter__btn").forEach(b => b.classList.remove("webshop-filter__btn--active")); btn.classList.add("webshop-filter__btn--active");
            const cat = btn.dataset.cat;
            container.querySelectorAll(".webshop-product-card").forEach(card => { card.style.display = (cat==="all"||card.dataset.cat===cat)?"":"none"; });
          });
          container.appendChild(filterEl);
        }
      }
      const grid = document.createElement("div"); grid.className = "webshop-grid";
      if (columns !== "auto") grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
      container.appendChild(grid);
      products.forEach(p => {
        const card = document.createElement("div"); card.className = "webshop-product-card"; card.dataset.cat = p.category || "";
        card.innerHTML = buildProductCard(p); grid.appendChild(card); wireProductCard(card, p);
      });
    }
    buildGrid();
    const onLangChange = async () => {
      products = await loadProducts(); // Reload products in the new language
      buildGrid();
    };
    const onCurrencyChange = () => {
      container.querySelectorAll(".webshop-card-price").forEach((el, i) => { if (products[i]) el.textContent = fmt(products[i].price); });
    };
    document.addEventListener("shop:langChanged", onLangChange);
    document.addEventListener("currency:changed", onCurrencyChange);
  }

  /* ═══════════════════════════════════════════════════════
     PRODUCT INFO
  ═══════════════════════════════════════════════════════ */
  async function renderProductInfo(divId, productId) {
    await loadLang();
    const p = await getProduct(productId);
    const container = document.getElementById(divId);
    if (!container) return;
    container.classList.add("webshop-product-info");
    const hasVariants = p.variants?.length > 0;
    // null = main product is selected (no variant override). Self-button maps back to null.
    let selectedVariantId = null;
    let selectedColor = !hasVariants && p.colors ? p.colors[0] : null;
    let qty = 1;

    // effectiveVariantId: null when main product or self-button selected.
    function effectiveVid() {
      return (selectedVariantId === null || selectedVariantId === p.id) ? null : selectedVariantId;
    }

    function build() {
      const images      = p.images?.length ? p.images : [p.image];
      const evid        = effectiveVid();
      const displayPrice = evid ? variantPrice(p, evid) : p.price;
      const discountPercent = p.discount || 0;
      const discountedPrice = discountPercent > 0 ? displayPrice * (1 - discountPercent / 100) : displayPrice;
      const inStock     = evid ? variantInStock(p, evid) : (p.stock > 0);
      const soldOut     = p.colors_soldout || [];

      let variantHtml = "";
      if (hasVariants) {
        const selfLabel = p.selfLabel || pName(p) || p.id;
        variantHtml = `<div class="webshop-product-option-group">
          <label class="webshop-product-option-label">${t("variant","Option")}</label>
          <div class="webshop-product-variants">
            <button class="webshop-product-variant-btn active" data-variant-id="${p.id}">${selfLabel}</button>
            ${p.variants.map((v) => { const so=v.stock!=null&&v.stock===0;
              return `<button class="webshop-product-variant-btn${so?" soldout":""}" data-variant-id="${v.id}" ${so?`disabled title="${t("sold_out","Sold Out")}"`:""}>${v.label}${so?` <em>(${t("sold_out","Sold Out")})</em>`:""}</button>`;
            }).join("")}
          </div></div>`;
      } else if (p.colors?.length) {
        variantHtml = `<div class="webshop-product-option-group">
          <label class="webshop-product-option-label">${t("color","Color")}</label>
          <div class="webshop-product-colors">
            ${p.colors.map((c,i) => { const so=soldOut.includes(c);
              return `<button class="webshop-product-color${i===0?" active":""}${so?" soldout":""}" data-color="${c}" ${so?`disabled title="${t("sold_out","Sold Out")}"`:""}>${c}${so?` <em>(${t("sold_out","Sold Out")})</em>`:""}</button>`;
            }).join("")}
          </div></div>`;
      }

      container.innerHTML = `
        <div class="webshop-product-layout">
          <div class="webshop-product-gallery">
            <div class="webshop-product-main-img-wrap" style="position:relative;">
              ${p.url?`<a href="${p.url}">`:""}<img id="pinfo-main-${productId}" class="webshop-product-main-img"
                src="${evid?variantImage(p,evid):images[0]}" alt="${pName(p)}" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 72 72%22%3E%3Crect fill=%22%23e8e4de%22 width=%2272%22 height=%2272%22/%3E%3C/svg%3E'">${p.url?"</a>":""}
              <div id="pinfo-video-${productId}" style="display:none;position:absolute;inset:0;background:#000;border-radius:inherit;">
                <video id="pinfo-vplayer-${productId}" style="width:100%;height:100%;object-fit:contain;" controls></video>
                <div id="pinfo-ytframe-${productId}" style="display:none;position:absolute;inset:0;">
                  <iframe id="pinfo-ytiframe-${productId}" style="width:100%;height:100%;border:0;" allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"></iframe>
                </div>
              </div>
            </div>
            <div class="webshop-product-thumbs">
              ${images.map((src,i)=>`<img class="webshop-product-thumb${i===0?" active":""}" src="${src}" data-idx="${i}" data-type="image" alt="${t("image_of","Image of")} ${pName(p)} ${i+1}" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 72 72%22%3E%3Crect fill=%22%23e8e4de%22 width=%2272%22 height=%2272%22/%3E%3C/svg%3E'">`).join("")}
              ${(p.videos||[]).map((vsrc)=>{const isYT=/youtube\.com|youtu\.be/.test(vsrc);const ytId=isYT?((vsrc.match(/embed\/([^?]+)/)||vsrc.match(/youtu\.be\/([^?]+)/)||["",""])[1]):"";const tbStyle=isYT?`background-image:url('https://img.youtube.com/vi/${ytId}/mqdefault.jpg');background-size:cover;background-position:center;`:`background:#222;`;return `<div class="webshop-product-thumb webshop-product-thumb--video" data-vsrc="${vsrc}" data-isyt="${isYT}" data-type="video" style="position:relative;${tbStyle}" title="Play video"><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:1.3rem;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.7);pointer-events:none;">▶</span></div>`;}).join("")}
            </div>
          </div>
          <div class="webshop-product-details">
            <p class="webshop-product-category">${pCategory(p)}</p>
            <h1 class="webshop-product-name">${pName(p)}</h1>
            ${p.rating ? `<div class="webshop-product-rating">
              <span class="webshop-rating-stars">${p.rating} ★</span>
              <span class="webshop-rating-count">(${p.reviewCount || 0} reviews)</span>
            </div>` : ''}
            ${p.bestseller ? `<span class="webshop-badge-inline webshop-badge-inline--bestseller">Best Seller</span>` : ''}
            <div class="webshop-product-price-group">
              ${discountPercent > 0 ? `
                <p class="webshop-product-price-original">${fmt(displayPrice)}</p>
                <p class="webshop-product-price" id="pinfo-price-${productId}">${fmt(discountedPrice)}</p>
                <p class="webshop-product-price-discount">Save ${discountPercent}%</p>
              ` : `
                <p class="webshop-product-price" id="pinfo-price-${productId}">${fmt(displayPrice)}</p>
              `}
            </div>
            <p class="webshop-product-desc">${pDesc(p)}</p>
            ${variantHtml}
            <div class="webshop-product-option-group">
              <label class="webshop-product-option-label">${t("quantity","Qty")}</label>
              <div class="webshop-qty-control webshop-qty-control--lg">
                <button class="webshop-qty-btn webshop-qty-btn--minus">−</button>
                <span class="webshop-qty-val">1</span>
                <button class="webshop-qty-btn webshop-qty-btn--plus">+</button>
              </div>
            </div>
            <div class="webshop-product-meta">
              <span id="pinfo-stock-${productId}" class="${inStock?"webshop-in-stock":"webshop-out-of-stock"}">${inStock?t("in_stock","In Stock"):t("out_of_stock","Out of Stock")}</span>
              <span class="webshop-weight-info">${t("weight","Weight")}: ${fmtWeight(hasVariants?variantWeight(p,selectedVariantId):(p.weight||0))}</span>
              ${p.dimensions?`<span class="webshop-dim-info">${p.dimensions.l}×${p.dimensions.w}×${p.dimensions.h} cm</span>`:""}
            </div>
            <button id="pinfo-atc-${productId}" class="webshop-btn webshop-btn--primary webshop-btn--full" ${inStock?"":"disabled"}>${t("add_to_cart","Add to Cart")}</button>
            <a class="webshop-btn webshop-btn--outline webshop-btn--full" href="${(typeof window !== 'undefined' && window.__CART_URL__) || 'cart/'}" style="margin-top:10px;display:flex;align-items:center;justify-content:center;">${t("view_cart","View Cart")}</a>
            ${buildRelatedStrip(p,"info")}
          </div>
        </div>
        <div class="webshop-product-info-section">
          <div class="webshop-product-info-tabs">
            <button class="webshop-info-tab-btn active" data-tab="features">Features & Specs</button>
            <button class="webshop-info-tab-btn" data-tab="details">Item details</button>
            <button class="webshop-info-tab-btn" data-tab="materials">Materials & Care</button>
            <button class="webshop-info-tab-btn" data-tab="additional">Additional details</button>
          </div>
          <div class="webshop-info-tab-content active" id="features-tab">
            <div class="webshop-info-property">
              <span class="webshop-info-label">Category</span>
              <span class="webshop-info-value">${pCategory(p)}</span>
            </div>
            <div class="webshop-info-property">
              <span class="webshop-info-label">Weight</span>
              <span class="webshop-info-value">${fmtWeight(p.weight || 0)}</span>
            </div>
            ${p.dimensions ? `<div class="webshop-info-property">
              <span class="webshop-info-label">Dimensions</span>
              <span class="webshop-info-value">${p.dimensions.l}×${p.dimensions.w}×${p.dimensions.h} cm</span>
            </div>` : ''}
          </div>
          <div class="webshop-info-tab-content" id="details-tab">
            <div class="webshop-info-property">
              <span class="webshop-info-label">Product ID</span>
              <span class="webshop-info-value">${p.id}</span>
            </div>
            <div class="webshop-info-property">
              <span class="webshop-info-label">In Stock</span>
              <span class="webshop-info-value">${inStock ? 'Yes' : 'No'}</span>
            </div>
            ${p.rating ? `<div class="webshop-info-property">
              <span class="webshop-info-label">Customer Rating</span>
              <span class="webshop-info-value">${p.rating} stars (${p.reviewCount || 0} reviews)</span>
            </div>` : ''}
          </div>
          <div class="webshop-info-tab-content" id="materials-tab">
            <p style="text-align: left; color: #666;">Material and care information for this product will be displayed here.</p>
          </div>
          <div class="webshop-info-tab-content" id="additional-tab">
            <p style="text-align: left; color: #666;">Additional product details, warranty information, and return policy will be displayed here.</p>
          </div>
        </div>`;

      const mainImg = container.querySelector("#pinfo-main-"+productId);
      const priceEl = container.querySelector("#pinfo-price-"+productId);
      const stockEl = container.querySelector("#pinfo-stock-"+productId);
      const atcBtn  = container.querySelector("#pinfo-atc-"+productId);
      const wtEl    = container.querySelector(".webshop-weight-info");

      // Handle info tabs
      container.querySelectorAll(".webshop-info-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          container.querySelectorAll(".webshop-info-tab-btn").forEach(b => b.classList.remove("active"));
          container.querySelectorAll(".webshop-info-tab-content").forEach(c => c.classList.remove("active"));
          btn.classList.add("active");
          const tabId = btn.dataset.tab + "-tab";
          const tab = container.querySelector("#" + tabId);
          if (tab) tab.classList.add("active");
        });
      });

      function refreshInfo() {
        if (!hasVariants) return;
        const evid = effectiveVid();
        const price   = evid ? variantPrice(p, evid) : p.price;
        const inStk   = evid ? variantInStock(p, evid) : (p.stock > 0);
        const wt      = evid ? variantWeight(p, evid) : (p.weight || 0);
        const imgSrc  = evid ? variantImage(p, evid) : p.image;
        const discPrice = discountPercent > 0 ? price * (1 - discountPercent / 100) : price;
        if (priceEl) priceEl.textContent = fmt(discPrice);
        if (stockEl) { stockEl.textContent=inStk?t("in_stock","In Stock"):t("out_of_stock","Out of Stock"); stockEl.className=inStk?"webshop-in-stock":"webshop-out-of-stock"; }
        if (atcBtn)  { atcBtn.disabled=!inStk; atcBtn.textContent=inStk?t("add_to_cart","Add to Cart"):t("out_of_stock","Out of Stock"); }
        if (mainImg) swapMainImg(mainImg, imgSrc, p.image);
        if (wtEl)    wtEl.textContent = `${t("weight","Weight")}: ${fmtWeight(wt)}`;
      }

      container.querySelectorAll(".webshop-product-thumb").forEach(thumb => {
        thumb.addEventListener("click", () => {
          container.querySelectorAll(".webshop-product-thumb").forEach(t=>t.classList.remove("active"));
          thumb.classList.add("active");
          const videoWrap  = container.querySelector("#pinfo-video-"+productId);
          const vplayer    = container.querySelector("#pinfo-vplayer-"+productId);
          const ytFrameDiv = container.querySelector("#pinfo-ytframe-"+productId);
          const ytIframe   = container.querySelector("#pinfo-ytiframe-"+productId);
          if (thumb.dataset.type === "video") {
            const vsrc = thumb.dataset.vsrc, isYT = thumb.dataset.isyt === "true";
            if (mainImg) mainImg.style.opacity = "0";
            if (videoWrap) videoWrap.style.display = "block";
            if (isYT) {
              if (vplayer) { vplayer.pause(); vplayer.style.display="none"; }
              if (ytFrameDiv) ytFrameDiv.style.display = "block";
              if (ytIframe)   ytIframe.src = vsrc + "?autoplay=1";
            } else {
              if (ytFrameDiv) { ytFrameDiv.style.display="none"; if (ytIframe) ytIframe.src=""; }
              if (vplayer) { vplayer.style.display="block"; vplayer.src=vsrc; vplayer.play().catch(()=>{}); }
            }
          } else {
            // Image thumb — hide video, show image
            if (vplayer) { vplayer.pause(); vplayer.src=""; }
            if (ytIframe) ytIframe.src = "";
            if (videoWrap) videoWrap.style.display = "none";
            if (mainImg) { mainImg.style.opacity="1"; swapMainImg(mainImg, images[+thumb.dataset.idx]); }
          }
        });
      });
      container.querySelectorAll(".webshop-product-variant-btn:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => { container.querySelectorAll(".webshop-product-variant-btn").forEach(b=>b.classList.remove("active")); btn.classList.add("active"); selectedVariantId=(btn.dataset.variantId===p.id)?null:btn.dataset.variantId; refreshInfo(); });
      });
      container.querySelectorAll(".webshop-product-color:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => { container.querySelectorAll(".webshop-product-color").forEach(b=>b.classList.remove("active")); btn.classList.add("active"); selectedColor=btn.dataset.color; if (mainImg) swapMainImg(mainImg, colorImageSrc(p,selectedColor), p.image); });
      });
      const qv = container.querySelector(".webshop-qty-val");
      container.querySelector(".webshop-qty-btn--plus")?.addEventListener("click", () => { const evid=effectiveVid(); const max=evid?variantStock(p,evid):(p.stock||99); qty=Math.min(qty+1,max||99); qv.textContent=qty; });
      container.querySelector(".webshop-qty-btn--minus")?.addEventListener("click", () => { qty=Math.max(1,qty-1); qv.textContent=qty; });
      atcBtn?.addEventListener("click", () => { const evid=effectiveVid(); addToCart(p,qty,evid,selectedColor,mainImg?.src||null); const itemName=evid?(getVariant(p,evid)?.label||evid):(pName(p)||p.id); toast(`${itemName} ${t("added","added to cart")}`); });
      wireRelatedStrip(container, p);
    }
    build();
    document.addEventListener("shop:langChanged", async () => {
      // Reload the product in the new language
      const newProduct = await getProduct(productId);
      if (newProduct) {
        Object.assign(p, newProduct); // Update product object with new language data
        build();
      }
    });
    document.addEventListener("currency:changed", build);
  }

  /* ─── MINI CART ─────────────────────────────────────── */
  function renderMiniCart(divId, options = {}) {
    const { cartUrl = (typeof window !== "undefined" && window.__CART_URL__) || "cart/" } = options;
    const container = document.getElementById(divId);
    if (!container) return;
    container.classList.add("webshop-mini-cart");
    function render() {
      loadLang().then(() => {
        const cart = getCart();
        const { subtotal, shipping, total, totalWeight, isFreeShipping } = calculateTotals(cart);
        const count = cart.reduce((a, i) => a + i.qty, 0);
        if (!cart.length) { container.innerHTML = `<p class="webshop-mini-cart__empty">${t("cart_empty","Your cart is empty")}</p>`; return; }
        container.innerHTML = `
          <h3 class="webshop-mini-cart__title">${t("cart","Cart")} <span>(${count})</span></h3>
          <ul class="webshop-mini-cart__list">${cart.map(item=>`<li class="webshop-mini-cart__item">
            <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 72 72%22%3E%3Crect fill=%22%23e8e4de%22 width=%2272%22 height=%2272%22/%3E%3C/svg%3E'">
            <div class="webshop-mini-cart__item-info">
              <span class="webshop-mini-cart__item-name">${item.name}</span>
              ${item.selectedColor?`<span class="webshop-mini-cart__item-color">${item.selectedColor}</span>`:""}
              <span class="webshop-mini-cart__item-price">${item.qty} × ${fmt(item.price)}</span>
              <span class="webshop-mini-cart__item-weight">${fmtWeight((item.weight||0)*item.qty)}</span>
            </div>
            <button class="webshop-mini-cart__remove" data-key="${item.cartKey}" aria-label="${t("remove","Remove")}">✕</button>
          </li>`).join("")}</ul>
          <div class="webshop-mini-cart__totals">
            <div class="webshop-mini-cart__row"><span>${t("subtotal","Subtotal")}</span><span>${fmt(subtotal)}</span></div>
            <div class="webshop-mini-cart__row"><span>${t("shipping","Shipping")}</span><span>${isFreeShipping?t("free","FREE"):fmt(shipping)}</span></div>
            <div class="webshop-mini-cart__row"><span>${t("weight","Weight")}</span><span>${fmtWeight(totalWeight)}</span></div>
            <div class="webshop-mini-cart__row webshop-mini-cart__row--total"><span>${t("total","Total")}</span><span>${fmt(total)}</span></div>
          </div>
          <a class="webshop-btn webshop-btn--primary" href="${(typeof window !== 'undefined' && window.__CART_URL__) || cartUrl}">${t("checkout","Proceed to Checkout")}</a>`;
        container.querySelectorAll(".webshop-mini-cart__remove").forEach(btn => { btn.addEventListener("click", () => removeFromCart(btn.dataset.key)); });
      });
    }
    render();
    document.addEventListener("shop:cartUpdated", render);
    document.addEventListener("shop:langChanged", render);
    document.addEventListener("currency:changed", render);
  }

  /* ─── TURNSTILE + FORMSPREE ─────────────────────────── */
  function renderTurnstile(containerEl) {
    return new Promise((resolve, reject) => {
      if (typeof window.turnstile === "undefined") { resolve(null); return; }
      const sitekey = CONFIG.turnstile?.sitekey || ""; if (!sitekey) { resolve(null); return; }
      containerEl.innerHTML = ""; let resolved = false;
      window.turnstile.render(containerEl, { sitekey, theme: "light",
        callback: tk => { if (!resolved) { resolved=true; resolve(tk); } },
        "error-callback": () => { if (!resolved) { resolved=true; window.turnstile.reset(containerEl); reject(new Error("Turnstile failed")); } },
        "expired-callback": () => { if (!resolved) { resolved=true; window.turnstile.reset(containerEl); reject(new Error("Turnstile expired")); } },
      });
    });
  }
  
  async function submitOrderDetails(orderRef, formData, cart, captchaEl = null) {
    const totals = calculateTotals(cart, formData.isBusiness, formData.country);
    const cartSummary = cart.map(i=>`${i.qty}× ${i.name}${i.selectedColor?` (${i.selectedColor})`:""} @ ${fmt(i.price)} | ${fmtWeight((i.weight||0)*i.qty)}`).join("\n");
    const filtered = {}; Object.entries(formData).forEach(([k,v]) => { if (v!=null&&v!=="") filtered[k]=v; });
    const data = {
      _subject: `New Order ${orderRef}`, order_ref: orderRef, status: "PENDING_PAYMENT",
      display_currency: CONFIG.currencyCode, ...filtered, cart_items: cartSummary,
      subtotal_eur: "€"+totals.subtotal.toFixed(2), subtotal_display: fmt(totals.subtotal),
      tax: fmt(totals.tax), shipping: totals.isFreeShipping?"FREE":fmt(totals.shipping),
      total_eur: "€"+totals.total.toFixed(2), total_display: fmt(totals.total),
      total_weight: fmtWeight(totals.totalWeight||0),
    };
    try { const ok = await sendToQueue("payment-pending", data); return ok; } catch(e) { console.warn("Queue failed",e); return false; }
  }
  
  async function submitOrderStatus(orderRef, status) {
    try { await sendToQueue("payment-success", { _subject:`Order ${status}: ${orderRef}`, order_ref:orderRef, status }); } catch {}
  }

  /* ─── PUBLIC API ────────────────────────────────────── */
  /* expose lang caches for external use (e.g. per-product spec title translations) */
  function getProductLang()   { return PRODUCT_LANG; }
  function getProductLangEn() { return PRODUCT_LANG_EN; }

  return {
    resolveLanguage, detectBrowserLanguage, switchLanguage, wireLanguageSwitcher, loadLang, t,
    loadProducts, getProduct, pName, pDesc, pCategory,
    getProductLang, getProductLangEn,
    getCart, saveCart, addToCart, removeFromCart, updateQty, clearCart, calculateTotals,
    fmt, fmtWeight, generateOrderRef,
    slugify, buildImagePath, colorImageSrc,
    toast, swapMainImg,
    getVariant, variantPrice, variantWeight, variantImage, variantStock, variantInStock,
    buildRelatedStrip, wireRelatedStrip, buildProductCard, wireProductCard,
    renderCurrencySelector, renderBackButton, renderCartIcon,
    renderShop, renderProductInfo, renderMiniCart,
    renderTurnstile, submitOrderDetails, submitOrderStatus,
  };
})();
window.Shop = Shop;
