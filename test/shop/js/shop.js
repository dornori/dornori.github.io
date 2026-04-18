/* =========================================================
   LUMIO SHOP ENGINE  –  shop.js  (v2)
   =========================================================
   Changes from v1:
   · Removed openProductModal / image-click-to-modal behaviour.
     Product images are no longer clickable by default.
     If product.url is set, clicking the image navigates there.
   · Removed attachBuyOverlay (overlay feature retired).
   · Added variant support: product.variants[] with per-variant
     label, price, weight, image, stock. Falls back to base
     product price/stock when variant fields are absent.
   · Added related products: product.related[] renders a "You
     may also need" strip below the main product info/card.
   · More currencies in currencies.csv (CZK, PLN, HUF, etc.)
   ========================================================= */

const Shop = (() => {
  let LANG = {};
  let _langLoaded = false;
  let _langLoadPromise = null;
  let _products = {};

  /* ─── LANGUAGE RESOLUTION ───────────────────────────── */
  function resolveLanguage() {
    const supported = CONFIG.supportedLanguages || ["en", "no", "nl"];
    const urlLang = new URLSearchParams(window.location.search).get("lang");
    if (urlLang && supported.includes(urlLang)) {
      CONFIG.language = urlLang;
      localStorage.setItem("lumio_lang", urlLang);
      return urlLang;
    }
    const saved = localStorage.getItem("lumio_lang");
    if (saved && supported.includes(saved)) { CONFIG.language = saved; return saved; }
    const def = CONFIG.language || CONFIG.defaultLanguage || "en";
    CONFIG.language = def;
    return def;
  }

  async function switchLanguage(code) {
    if (code === CONFIG.language && _langLoaded) return;
    CONFIG.language = code;
    localStorage.setItem("lumio_lang", code);
    _langLoaded = false; _langLoadPromise = null; LANG = {};
    await loadLang();
    document.dispatchEvent(new CustomEvent("shop:langChanged", { detail: { lang: code } }));
  }

  /* ─── i18n PRODUCT HELPERS ──────────────────────────── */
  function pName(p)     { return p.i18n?.[CONFIG.language]?.name        || p.name        || ""; }
  function pDesc(p)     { return p.i18n?.[CONFIG.language]?.description || p.description || ""; }
  function pCategory(p) { return p.i18n?.[CONFIG.language]?.category    || p.category    || ""; }

  /* ─── VARIANT HELPERS ───────────────────────────────── */
  /**
   * Get effective variant object for a product + selected variant id.
   * Falls back gracefully: missing fields use product-level defaults.
   *
   * Product schema (new):
   *   product.variants = [
   *     { id, label, price?, weight?, image?, stock? }, ...
   *   ]
   *   product.url = "" | "https://..."   → if set, image click navigates here
   *   product.related = [ { id, name, price, image, weight, description } ]
   *
   * Backward compat: if no variants array, product.colors is used as
   * plain display labels with no per-variant pricing.
   */
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
    return (v && v.image) ? v.image : product.image;
  }

  function variantStock(product, variantId) {
    const v = getVariant(product, variantId);
    return (v && v.stock != null) ? v.stock : (product.stock || 0);
  }

  function variantInStock(product, variantId) {
    return variantStock(product, variantId) > 0;
  }

  /* ─── CART ──────────────────────────────────────────── */
  function getCart() { try { return JSON.parse(localStorage.getItem("lumio_cart") || "[]"); } catch { return []; } }
  function saveCart(cart) {
    localStorage.setItem("lumio_cart", JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent("shop:cartUpdated", { detail: { cart } }));
  }

  /**
   * Add a product to cart.
   * variantId: string id from product.variants[], or null.
   * For backward compat, selectedColor is kept for color-only products.
   */
  function addToCart(product, qty = 1, variantId = null, selectedColor = null, imageOverride = null) {
    const cart = getCart();
    const vKey = variantId || selectedColor || "";
    const key = product.id + (vKey ? "_" + vKey.toLowerCase().replace(/\s+/g, "-") : "");
    const existing = cart.find(i => i.cartKey === key);
    const price  = variantId ? variantPrice(product, variantId)  : product.price;
    const weight = variantId ? variantWeight(product, variantId) : (product.weight || 0);
    const image  = imageOverride || (variantId ? variantImage(product, variantId) : product.image);
    const label  = variantId ? (getVariant(product, variantId)?.label || variantId) : selectedColor;
    const maxQty = variantId ? variantStock(product, variantId) : (product.stock || 99);

    if (existing) {
      existing.qty = Math.min(existing.qty + qty, maxQty || 99);
    } else {
      cart.push({
        ...product,
        cartKey: key,
        qty,
        price,
        weight,
        image,
        selectedColor: label,
        variantId,
      });
    }
    saveCart(cart);
    return cart;
  }

  function removeFromCart(cartKey) { saveCart(getCart().filter(i => i.cartKey !== cartKey)); }
  function updateQty(cartKey, qty) {
    const cart = getCart(), item = cart.find(i => i.cartKey === cartKey);
    if (!item) return;
    if (qty <= 0) { removeFromCart(cartKey); return; }
    item.qty = qty; saveCart(cart);
  }
  function clearCart() {
    localStorage.removeItem("lumio_cart");
    document.dispatchEvent(new CustomEvent("shop:cartUpdated", { detail: { cart: [] } }));
  }

  /* ─── TOTALS ────────────────────────────────────────── */
  function calculateTotals(cart, isBusiness = false, countryCode = null) {
    const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
    const totalWeight = cart.reduce((a, i) => a + (i.weight || 0) * i.qty, 0);
    let cfg = { base: CONFIG.shipping.base, perKg: CONFIG.shipping.perKg,
      freeThreshold: CONFIG.shipping.freeThreshold, estimatedDays: CONFIG.shipping.estimatedDays };
    if (countryCode && typeof Shipping !== "undefined") cfg = Shipping.getRate(countryCode);
    const isFreeShipping = subtotal >= cfg.freeThreshold;
    const shipping = isFreeShipping ? 0 : cfg.base + totalWeight * cfg.perKg;
    const tax = isBusiness ? 0 : subtotal * CONFIG.taxRate;
    return { subtotal, shipping, tax, total: subtotal + shipping + tax,
      totalWeight, isFreeShipping, estimatedDays: cfg.estimatedDays };
  }

  /* ─── LANG LOADER ───────────────────────────────────── */
  function loadLang() {
    if (_langLoaded) return Promise.resolve(LANG);
    if (_langLoadPromise) return _langLoadPromise;
    const lang = resolveLanguage();
    _langLoadPromise = fetch("data/lang/" + lang + ".json")
      .then(r => { if (!r.ok) throw 0; return r.json(); })
      .then(d => { LANG = d; _langLoaded = true; return d; })
      .catch(() => fetch("data/lang/en.json").then(r => r.json())
        .then(d => { LANG = d; _langLoaded = true; return d; })
        .catch(() => { LANG = {}; _langLoaded = true; return {}; }));
    return _langLoadPromise;
  }
  function t(key, fallback = "") { return LANG[key] || fallback || key; }

  /* ─── FORMAT ────────────────────────────────────────── */
  function fmt(eurAmount) {
    if (typeof Currency !== "undefined" && Currency.getActive() !== "EUR") return Currency.fmt(eurAmount);
    return CONFIG.currency + eurAmount.toFixed(2);
  }
  function fmtWeight(kg) { return kg >= 1 ? kg.toFixed(1) + " kg" : (kg * 1000).toFixed(0) + " g"; }

  /* ─── PRODUCT LOADER ────────────────────────────────── */
  async function loadProducts() {
    const manifest = await fetch("data/products/manifest.json").then(r => r.json());
    const all = await Promise.all(manifest.map(f => fetch("data/products/" + f).then(r => r.json())));
    all.forEach(p => { _products[p.id] = p; }); return all;
  }
  async function getProduct(id) {
    if (_products[id]) return _products[id];
    const p = await fetch("data/products/" + id + ".json").then(r => r.json());
    _products[id] = p; return p;
  }
  function generateOrderRef() {
    return "LM-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substr(2,5).toUpperCase();
  }

  /* ─── TOAST ─────────────────────────────────────────── */
  function toast(text, duration = 2800) {
    document.querySelector(".lumio-toast")?.remove();
    const el = document.createElement("div");
    el.className = "lumio-toast";
    el.innerHTML = `<span class="lumio-toast-icon">✓</span>${text}`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("lumio-toast--visible"));
    setTimeout(() => { el.classList.remove("lumio-toast--visible"); setTimeout(() => el.remove(), 400); }, duration);
  }

  /* ─── SWAP IMAGE (fade) ─────────────────────────────── */
  function swapMainImg(imgEl, src) {
    imgEl.style.opacity = "0";
    setTimeout(() => { imgEl.src = src; imgEl.style.opacity = ""; }, 180);
  }

  /* ─── CURRENCY SELECTOR ─────────────────────────────── */
  function renderCurrencySelector(target) {
    const container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container || typeof Currency === "undefined") return;
    function build() {
      const active = Currency.getActive(), all = Currency.list();
      container.className = "lumio-currency-selector";
      container.innerHTML = `
        <label class="lumio-currency-selector__label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
            <circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 0 0 20M12 2a15 15 0 0 1 0 20M2 12h20"/>
          </svg>
        </label>
        <select class="lumio-currency-selector__select" aria-label="Currency">
          ${all.map(c => `<option value="${c.code}"${c.code===active?" selected":""}>${c.code} ${c.symbol}</option>`).join("")}
        </select>`;
      container.querySelector("select").addEventListener("change", e => Currency.setActive(e.target.value));
    }
    build();
    document.addEventListener("currency:changed", build);
  }

  /* ─── LANGUAGE SWITCHER ─────────────────────────────── */
  function wireLanguageSwitcher(selector = ".lumio-lang-btn") {
    const currentLang = CONFIG.language;
    document.querySelectorAll(selector).forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === currentLang);
      btn.addEventListener("click", async () => {
        const code = btn.dataset.lang;
        document.querySelectorAll(selector).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        await switchLanguage(code);
        const url = new URL(window.location.href);
        url.searchParams.set("lang", code);
        window.history.replaceState({}, "", url);
      });
    });
  }

  /* ─── BACK BUTTON ───────────────────────────────────── */
  function renderBackButton(target, options = {}) {
    const { href = null, label = null, onClick = null } = options;
    const container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container) return;
    const el = document.createElement(href ? "a" : "button");
    el.className = "lumio-back-btn";
    if (href) el.href = href;
    el.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      <span class="lumio-back-btn__label">${label || t("back_to_shop")}</span>`;
    if (!href && !onClick) el.addEventListener("click", () => window.history.back());
    else if (onClick) el.addEventListener("click", onClick);
    container.prepend(el);
    document.addEventListener("shop:langChanged", () => {
      el.querySelector(".lumio-back-btn__label").textContent = label || t("back_to_shop");
    });
    return el;
  }

  /* ─── CART ICON ─────────────────────────────────────── */
  function renderCartIcon(options = {}) {
    const { target = "body", fixed = true, cartUrl = "cart.html" } = options;
    const wrapper = document.createElement("a");
    wrapper.href = cartUrl;
    wrapper.className = "lumio-cart-icon" + (fixed ? " lumio-cart-icon--fixed" : "");
    wrapper.setAttribute("aria-label", "Shopping cart");
    wrapper.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
      <span class="lumio-cart-icon__badge" aria-live="polite">0</span>`;
    const mount = target === "body" ? document.body : document.querySelector(target);
    mount?.appendChild(wrapper);
    function updateBadge() {
      const count = getCart().reduce((a, i) => a + i.qty, 0);
      const badge = wrapper.querySelector(".lumio-cart-icon__badge");
      if (badge) { badge.textContent = count; badge.classList.toggle("lumio-cart-icon__badge--hidden", count === 0); }
    }
    updateBadge();
    document.addEventListener("shop:cartUpdated", updateBadge);
    return wrapper;
  }

  /* ═══════════════════════════════════════════════════════
     RELATED PRODUCTS STRIP
     Renders a horizontal strip of add-to-cart mini cards
     for product.related[]. Each related item is a lightweight
     object { id, name, price, image, weight, description }.
  ═══════════════════════════════════════════════════════ */
  function buildRelatedStrip(product, context = "card") {
    if (!product.related?.length) return "";
    const items = product.related;
    return `
      <div class="lumio-related${context === "info" ? " lumio-related--info" : ""}">
        <h4 class="lumio-related__title">${t("related_products", "You may also need")}</h4>
        <div class="lumio-related__list">
          ${items.map(r => `
            <div class="lumio-related__item" data-related-id="${r.id}">
              <img class="lumio-related__img" src="${r.image || "images/placeholder.svg"}"
                alt="${r.name}" onerror="this.src='images/placeholder.svg'">
              <div class="lumio-related__info">
                <span class="lumio-related__name">${r.name}</span>
                ${r.description ? `<span class="lumio-related__desc">${r.description}</span>` : ""}
                <span class="lumio-related__price">${fmt(r.price)}</span>
              </div>
              <button class="lumio-related__add lumio-btn lumio-btn--sm lumio-btn--outline"
                data-related-id="${r.id}" aria-label="Add ${r.name} to cart">
                + ${t("add_to_cart", "Add")}
              </button>
            </div>
          `).join("")}
        </div>
      </div>`;
  }

  function wireRelatedStrip(container, product) {
    if (!product.related?.length) return;
    container.querySelectorAll(".lumio-related__add").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const id = btn.dataset.relatedId;
        const rel = product.related.find(r => r.id === id);
        if (!rel) return;
        // Treat related item as a mini product for cart purposes
        addToCart({ id: rel.id, name: rel.name, price: rel.price, weight: rel.weight || 0,
          image: rel.image || "images/placeholder.svg", stock: 99 }, 1);
        toast(`${rel.name} ${t("added", "added to cart")}`);
      });
    });
  }

  /* ═══════════════════════════════════════════════════════
     PRODUCT GRID
  ═══════════════════════════════════════════════════════ */
  async function renderShop(divId, options = {}) {
    await loadLang();
    const products = await loadProducts();
    const container = document.getElementById(divId);
    if (!container) return;
    const { columns = "auto", showFilter = true } = options;

    function buildGrid() {
      container.innerHTML = "";
      container.classList.add("lumio-shop");

      if (showFilter) {
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
        if (cats.length > 1) {
          const filterEl = document.createElement("div");
          filterEl.className = "lumio-filter";
          filterEl.innerHTML = `
            <button class="lumio-filter__btn lumio-filter__btn--active" data-cat="all">${t("category_all", "All")}</button>
            ${cats.map(c => `<button class="lumio-filter__btn" data-cat="${c}">
              ${t("category_" + c) || (c.charAt(0).toUpperCase() + c.slice(1))}
            </button>`).join("")}`;
          filterEl.addEventListener("click", e => {
            const btn = e.target.closest(".lumio-filter__btn");
            if (!btn) return;
            filterEl.querySelectorAll(".lumio-filter__btn").forEach(b => b.classList.remove("lumio-filter__btn--active"));
            btn.classList.add("lumio-filter__btn--active");
            const cat = btn.dataset.cat;
            container.querySelectorAll(".lumio-product-card").forEach(card => {
              card.style.display = (cat === "all" || card.dataset.cat === cat) ? "" : "none";
            });
          });
          container.appendChild(filterEl);
        }
      }

      const grid = document.createElement("div");
      grid.className = "lumio-grid";
      if (columns !== "auto") grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
      container.appendChild(grid);
      products.forEach(p => {
        const card = document.createElement("div");
        card.className = "lumio-product-card";
        card.dataset.cat = p.category || "";
        card.innerHTML = buildProductCard(p);
        grid.appendChild(card);
        wireProductCard(card, p);
      });
    }

    buildGrid();
    document.addEventListener("shop:langChanged", buildGrid);
    document.addEventListener("currency:changed", () => {
      container.querySelectorAll(".lumio-card-price").forEach((el, i) => {
        if (products[i]) el.textContent = fmt(products[i].price);
      });
    });
  }

  function buildProductCard(p) {
    const hasVariants = p.variants?.length > 0;
    const firstVariant = hasVariants ? p.variants[0] : null;
    const displayPrice = firstVariant?.price != null ? firstVariant.price : p.price;
    const inStock = hasVariants ? variantInStock(p, firstVariant?.id) : (p.stock > 0);

    // Variant selector or legacy color swatches
    let selectorHtml = "";
    if (hasVariants) {
      selectorHtml = `<div class="lumio-variants">
        ${p.variants.map((v, i) => {
          const so = v.stock != null && v.stock === 0;
          return `<button class="lumio-variant-btn${i === 0 ? " active" : ""}${so ? " soldout" : ""}"
            data-variant-id="${v.id}" data-price="${v.price != null ? v.price : p.price}"
            data-image="${v.image || p.image}" data-stock="${v.stock != null ? v.stock : (p.stock || 0)}"
            ${so ? `disabled title="${t("sold_out", "Sold Out")}"` : ""}
          >${v.label}${so ? ` <em>(${t("sold_out","Sold Out")})</em>` : ""}</button>`;
        }).join("")}
      </div>`;
    } else if (p.colors?.length) {
      const soldOut = p.colors_soldout || [];
      selectorHtml = `<div class="lumio-colors">
        ${p.colors.map((c, i) => {
          const so = soldOut.includes(c);
          return `<button class="lumio-color${i===0?" lumio-color--active":""}${so?" lumio-color--soldout":""}"
            data-color="${c}" title="${c}${so?" ("+t("sold_out","Sold Out")+")" : ""}"
            ${so ? 'disabled aria-disabled="true"' : ""}></button>`;
        }).join("")}
      </div>`;
    }

    // Image area — clickable only if product.url is set
    const hasUrl = !!p.url;
    const imgWrapTag = hasUrl ? `a href="${p.url}"` : "div";
    const imgWrapClose = hasUrl ? "a" : "div";

    return `
      <${imgWrapTag} class="lumio-card-img-wrap${hasUrl ? " lumio-card-img-link" : ""}"${hasUrl ? ` title="${pName(p)}"` : ""}>
        <img class="lumio-card-img" src="${p.image}" alt="${pName(p)}" loading="lazy"
          onerror="this.src='images/placeholder.svg'">
        ${p.featured ? `<span class="lumio-badge">${t("featured", "Featured")}</span>` : ""}
      </${imgWrapClose}>
      <div class="lumio-card-body">
        <h3 class="lumio-card-title">${pName(p)}</h3>
        ${selectorHtml}
        <div class="lumio-card-footer">
          <span class="lumio-card-price">${fmt(displayPrice)}</span>
          <div class="lumio-qty-control">
            <button class="lumio-qty-btn lumio-qty-btn--minus" aria-label="Decrease">−</button>
            <span class="lumio-qty-val">1</span>
            <button class="lumio-qty-btn lumio-qty-btn--plus" aria-label="Increase">+</button>
          </div>
        </div>
        <button class="lumio-card-quick-add lumio-btn lumio-btn--primary lumio-btn--full" ${inStock ? "" : "disabled"}>
          ${inStock ? t("add_to_cart", "Add to Cart") : t("out_of_stock", "Out of Stock")}
        </button>
        ${buildRelatedStrip(p, "card")}
      </div>`;
  }

  function wireProductCard(card, p) {
    let qty = 1;
    const hasVariants = p.variants?.length > 0;
    let selectedVariantId = hasVariants ? p.variants[0]?.id : null;
    let selectedColor = !hasVariants && p.colors ? p.colors[0] : null;
    const img = card.querySelector(".lumio-card-img");
    const priceEl = card.querySelector(".lumio-card-price");
    const addBtn = card.querySelector(".lumio-card-quick-add");

    function refreshCardState() {
      if (!hasVariants) return;
      const price = variantPrice(p, selectedVariantId);
      const inStock = variantInStock(p, selectedVariantId);
      const imgSrc = variantImage(p, selectedVariantId);
      if (priceEl) priceEl.textContent = fmt(price);
      if (addBtn) {
        addBtn.disabled = !inStock;
        addBtn.textContent = inStock ? t("add_to_cart", "Add to Cart") : t("out_of_stock", "Out of Stock");
      }
      if (img && imgSrc && imgSrc !== img.src) {
        img.style.opacity = "0";
        setTimeout(() => { img.src = imgSrc; img.style.opacity = ""; }, 150);
      }
    }

    // Wire variant buttons
    card.querySelectorAll(".lumio-variant-btn:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".lumio-variant-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedVariantId = btn.dataset.variantId;
        refreshCardState();
      });
    });

    // Wire legacy color swatches
    card.querySelectorAll(".lumio-color:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".lumio-color").forEach(b => b.classList.remove("lumio-color--active"));
        btn.classList.add("lumio-color--active");
        selectedColor = btn.dataset.color;
      });
    });

    const qv = card.querySelector(".lumio-qty-val");
    card.querySelector(".lumio-qty-btn--plus")?.addEventListener("click", () => {
      const max = hasVariants ? variantStock(p, selectedVariantId) : (p.stock || 99);
      qty = Math.min(qty + 1, max || 99); qv.textContent = qty;
    });
    card.querySelector(".lumio-qty-btn--minus")?.addEventListener("click", () => { qty = Math.max(1, qty - 1); qv.textContent = qty; });

    addBtn?.addEventListener("click", () => {
      addToCart(p, qty, selectedVariantId, selectedColor, null);
      toast(`${pName(p)} ${t("added", "added to cart")}`);
    });

    wireRelatedStrip(card, p);
  }

  /* ═══════════════════════════════════════════════════════
     PRODUCT INFO (standalone embed)
  ═══════════════════════════════════════════════════════ */
  async function renderProductInfo(divId, productId) {
    await loadLang();
    const p = await getProduct(productId);
    const container = document.getElementById(divId);
    if (!container) return;
    container.classList.add("lumio-product-info");

    const hasVariants = p.variants?.length > 0;
    let selectedVariantId = hasVariants ? p.variants[0]?.id : null;
    let selectedColor = !hasVariants && p.colors ? p.colors[0] : null;
    let qty = 1;

    function build() {
      const images = p.images?.length ? p.images : [p.image];
      const displayPrice = hasVariants ? variantPrice(p, selectedVariantId) : p.price;
      const inStock = hasVariants ? variantInStock(p, selectedVariantId) : (p.stock > 0);
      const soldOut = p.colors_soldout || [];

      // Variant selector
      let variantHtml = "";
      if (hasVariants) {
        variantHtml = `<div class="lumio-product-option-group">
          <label class="lumio-product-option-label">${t("variant", "Option")}</label>
          <div class="lumio-product-variants">
            ${p.variants.map((v, i) => {
              const so = v.stock != null && v.stock === 0;
              const isActive = (v.id === selectedVariantId) || (i === 0 && !selectedVariantId);
              return `<button class="lumio-product-variant-btn${isActive ? " active" : ""}${so ? " soldout" : ""}"
                data-variant-id="${v.id}" ${so ? `disabled title="${t("sold_out","Sold Out")}"` : ""}
              >${v.label}${so ? ` <em>(${t("sold_out","Sold Out")})</em>` : ""}</button>`;
            }).join("")}
          </div>
        </div>`;
      } else if (p.colors?.length) {
        variantHtml = `<div class="lumio-product-option-group">
          <label class="lumio-product-option-label">${t("color", "Color")}</label>
          <div class="lumio-product-colors">
            ${p.colors.map((c, i) => {
              const so = soldOut.includes(c);
              return `<button class="lumio-product-color${i===0?" active":""}${so?" soldout":""}"
                data-color="${c}" ${so?`disabled title="${t("sold_out","Sold Out")}"`:""}
              >${c}${so?` <em>(${t("sold_out","Sold Out")})</em>`:""}</button>`;
            }).join("")}
          </div>
        </div>`;
      }

      container.innerHTML = `
        <div class="lumio-product-gallery">
          <div class="lumio-product-main-img-wrap">
            ${p.url ? `<a href="${p.url}">` : ""}
            <img id="pinfo-main-${productId}" class="lumio-product-main-img"
              src="${hasVariants ? variantImage(p, selectedVariantId) : images[0]}"
              alt="${pName(p)}" onerror="this.src='images/placeholder.svg'">
            ${p.url ? "</a>" : ""}
          </div>
          ${images.length > 1 ? `<div class="lumio-product-thumbs">
            ${images.map((src, i) => `<img class="lumio-product-thumb${i===0?" active":""}"
              src="${src}" data-idx="${i}" alt="${t("image_of","Image of")} ${pName(p)} ${i+1}"
              onerror="this.src='images/placeholder.svg'">`).join("")}
          </div>` : ""}
        </div>
        <div class="lumio-product-details">
          <p class="lumio-product-category">${pCategory(p)}</p>
          <h1 class="lumio-product-name">${pName(p)}</h1>
          <p class="lumio-product-price" id="pinfo-price-${productId}">${fmt(displayPrice)}</p>
          <p class="lumio-product-desc">${pDesc(p)}</p>
          ${variantHtml}
          <div class="lumio-product-option-group">
            <label class="lumio-product-option-label">${t("quantity", "Qty")}</label>
            <div class="lumio-qty-control lumio-qty-control--lg">
              <button class="lumio-qty-btn lumio-qty-btn--minus">−</button>
              <span class="lumio-qty-val">1</span>
              <button class="lumio-qty-btn lumio-qty-btn--plus">+</button>
            </div>
          </div>
          <div class="lumio-product-meta">
            <span id="pinfo-stock-${productId}" class="${inStock?"lumio-in-stock":"lumio-out-of-stock"}">
              ${inStock ? t("in_stock","In Stock") : t("out_of_stock","Out of Stock")}
            </span>
            <span class="lumio-weight-info">${t("weight","Weight")}: ${fmtWeight(hasVariants ? variantWeight(p, selectedVariantId) : (p.weight||0))}</span>
            ${p.dimensions?`<span class="lumio-dim-info">${p.dimensions.l}×${p.dimensions.w}×${p.dimensions.h} cm</span>`:""}
          </div>
          <button id="pinfo-atc-${productId}" class="lumio-btn lumio-btn--primary lumio-btn--full lumio-add-to-cart" ${inStock?"":"disabled"}>
            ${t("add_to_cart","Add to Cart")}
          </button>
          <a class="lumio-btn lumio-btn--outline lumio-btn--full" href="cart.html" style="margin-top:10px; display:flex; align-items:center; justify-content:center;">
            ${t("view_cart","View Cart")}
          </a>
          ${buildRelatedStrip(p, "info")}
        </div>`;

      const mainImg = container.querySelector("#pinfo-main-" + productId);
      const priceEl = container.querySelector("#pinfo-price-" + productId);
      const stockEl = container.querySelector("#pinfo-stock-" + productId);
      const atcBtn  = container.querySelector("#pinfo-atc-" + productId);

      function refreshInfoState() {
        if (!hasVariants) return;
        const price   = variantPrice(p, selectedVariantId);
        const inStk   = variantInStock(p, selectedVariantId);
        const imgSrc  = variantImage(p, selectedVariantId);
        const wt      = variantWeight(p, selectedVariantId);
        if (priceEl) priceEl.textContent = fmt(price);
        if (stockEl) {
          stockEl.textContent = inStk ? t("in_stock","In Stock") : t("out_of_stock","Out of Stock");
          stockEl.className = inStk ? "lumio-in-stock" : "lumio-out-of-stock";
        }
        if (atcBtn) { atcBtn.disabled = !inStk; atcBtn.textContent = inStk ? t("add_to_cart","Add to Cart") : t("out_of_stock","Out of Stock"); }
        if (mainImg && imgSrc) swapMainImg(mainImg, imgSrc);
        container.querySelector(".lumio-weight-info").textContent = `${t("weight","Weight")}: ${fmtWeight(wt)}`;
      }

      // Wire thumbnails
      container.querySelectorAll(".lumio-product-thumb").forEach(thumb => {
        thumb.addEventListener("click", () => {
          container.querySelectorAll(".lumio-product-thumb").forEach(t => t.classList.remove("active"));
          thumb.classList.add("active");
          swapMainImg(mainImg, images[+thumb.dataset.idx]);
        });
      });

      // Wire variant buttons
      container.querySelectorAll(".lumio-product-variant-btn:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => {
          container.querySelectorAll(".lumio-product-variant-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          selectedVariantId = btn.dataset.variantId;
          refreshInfoState();
        });
      });

      // Wire legacy color buttons
      container.querySelectorAll(".lumio-product-color:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => {
          container.querySelectorAll(".lumio-product-color").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          selectedColor = btn.dataset.color;
        });
      });

      const qv = container.querySelector(".lumio-qty-val");
      container.querySelector(".lumio-qty-btn--plus")?.addEventListener("click", () => {
        const max = hasVariants ? variantStock(p, selectedVariantId) : (p.stock || 99);
        qty = Math.min(qty + 1, max || 99); qv.textContent = qty;
      });
      container.querySelector(".lumio-qty-btn--minus")?.addEventListener("click", () => { qty = Math.max(1, qty - 1); qv.textContent = qty; });

      atcBtn?.addEventListener("click", () => {
        addToCart(p, qty, selectedVariantId, selectedColor, mainImg?.src || null);
        toast(`${pName(p)} ${t("added","added to cart")}`);
      });

      wireRelatedStrip(container, p);
    }

    build();
    document.addEventListener("shop:langChanged", build);
    document.addEventListener("currency:changed", build);
  }

  /* ─── MINI CART ─────────────────────────────────────── */
  function renderMiniCart(divId, options = {}) {
    const { cartUrl = "cart.html" } = options;
    const container = document.getElementById(divId);
    if (!container) return;
    container.classList.add("lumio-mini-cart");

    function render() {
      loadLang().then(() => {
        const cart = getCart();
        const { subtotal, shipping, total, totalWeight, isFreeShipping } = calculateTotals(cart);
        const count = cart.reduce((a, i) => a + i.qty, 0);
        if (cart.length === 0) { container.innerHTML = `<p class="lumio-mini-cart__empty">${t("cart_empty","Your cart is empty")}</p>`; return; }
        container.innerHTML = `
          <h3 class="lumio-mini-cart__title">${t("cart","Cart")} <span>(${count})</span></h3>
          <ul class="lumio-mini-cart__list">
            ${cart.map(item => `<li class="lumio-mini-cart__item">
              <img src="${item.image}" alt="${item.name}" onerror="this.src='images/placeholder.svg'">
              <div class="lumio-mini-cart__item-info">
                <span class="lumio-mini-cart__item-name">${item.name}</span>
                ${item.selectedColor?`<span class="lumio-mini-cart__item-color">${item.selectedColor}</span>`:""}
                <span class="lumio-mini-cart__item-price">${item.qty} × ${fmt(item.price)}</span>
                <span class="lumio-mini-cart__item-weight">${fmtWeight((item.weight||0)*item.qty)}</span>
              </div>
              <button class="lumio-mini-cart__remove" data-key="${item.cartKey}" aria-label="${t("remove","Remove")}">✕</button>
            </li>`).join("")}
          </ul>
          <div class="lumio-mini-cart__totals">
            <div class="lumio-mini-cart__row"><span>${t("subtotal","Subtotal")}</span><span>${fmt(subtotal)}</span></div>
            <div class="lumio-mini-cart__row"><span>${t("shipping","Shipping")}</span><span>${isFreeShipping?t("free","FREE"):fmt(shipping)}</span></div>
            <div class="lumio-mini-cart__row"><span>${t("weight","Weight")}</span><span>${fmtWeight(totalWeight)}</span></div>
            <div class="lumio-mini-cart__row lumio-mini-cart__row--total"><span>${t("total","Total")}</span><span>${fmt(total)}</span></div>
          </div>
          <a class="lumio-btn lumio-btn--primary" href="${cartUrl}">${t("checkout","Proceed to Checkout")}</a>`;
        container.querySelectorAll(".lumio-mini-cart__remove").forEach(btn => {
          btn.addEventListener("click", () => removeFromCart(btn.dataset.key));
        });
      });
    }
    render();
    document.addEventListener("shop:cartUpdated", render);
    document.addEventListener("shop:langChanged", render);
    document.addEventListener("currency:changed", render);
  }

  /* ─── TURNSTILE ─────────────────────────────────────── */
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

  /* ─── FORMSPREE ─────────────────────────────────────── */
  async function submitOrderDetails(orderRef, formData, cart, captchaEl = null) {
    const totals = calculateTotals(cart, formData.isBusiness, formData.country);
    let captchaToken = null;
    if (captchaEl) captchaToken = await renderTurnstile(captchaEl);
    const payload = new FormData();
    payload.append("_subject", `New Order ${orderRef}`);
    payload.append("order_ref", orderRef); payload.append("status", "PENDING_PAYMENT");
    payload.append("display_currency", CONFIG.currencyCode);
    if (captchaToken) payload.append("cf-turnstile-response", captchaToken);
    Object.entries(formData).forEach(([k, v]) => { if (v != null && v !== "") payload.append(k, v); });
    payload.append("cart_items", cart.map(i => `${i.qty}× ${i.name}${i.selectedColor?` (${i.selectedColor})`:""} @ ${fmt(i.price)} | ${fmtWeight((i.weight||0)*i.qty)}`).join("\n"));
    payload.append("subtotal_eur", "€" + totals.subtotal.toFixed(2));
    payload.append("subtotal_display", fmt(totals.subtotal));
    payload.append("tax", fmt(totals.tax));
    payload.append("shipping", totals.isFreeShipping ? "FREE" : fmt(totals.shipping));
    payload.append("total_eur", "€" + totals.total.toFixed(2));
    payload.append("total_display", fmt(totals.total));
    payload.append("total_weight", fmtWeight(totals.totalWeight || 0));
    try { const r = await fetch(CONFIG.formspree.endpoint, { method:"POST", body:payload, headers:{"Accept":"application/json"} }); return r.ok; }
    catch (e) { console.warn("Formspree failed", e); return false; }
  }
  async function submitOrderStatus(orderRef, status) {
    const payload = new FormData();
    payload.append("_subject", `Order ${status}: ${orderRef}`); payload.append("order_ref", orderRef); payload.append("status", status);
    try { await fetch(CONFIG.formspree.endpoint, { method:"POST", body:payload, headers:{"Accept":"application/json"} }); } catch {}
  }

  /* ─── PUBLIC API ────────────────────────────────────── */
  return {
    resolveLanguage, switchLanguage, wireLanguageSwitcher, loadLang, t,
    loadProducts, getProduct, pName, pDesc, pCategory,
    getCart, saveCart, addToCart, removeFromCart, updateQty, clearCart, calculateTotals,
    fmt, fmtWeight, generateOrderRef,
    toast, swapMainImg,
    getVariant, variantPrice, variantWeight, variantImage, variantStock, variantInStock,
    buildRelatedStrip, wireRelatedStrip,
    renderCurrencySelector, renderBackButton, wireLanguageSwitcher,
    renderCartIcon, renderShop, renderProductInfo, renderMiniCart,
    renderTurnstile, submitOrderDetails, submitOrderStatus,
  };
})();
