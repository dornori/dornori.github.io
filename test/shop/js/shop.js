/* =========================================================
   LUMIO SHOP ENGINE  –  shop.js
   =========================================================
   Language priority (highest → lowest):
     1. URL param  ?lang=nl  (from embedding site like Dornori)
     2. localStorage lumio_lang
     3. CONFIG.language / CONFIG.defaultLanguage
     4. "en" fallback
   ========================================================= */

const Shop = (() => {
  let LANG = {};
  let _langLoaded = false;
  let _langLoadPromise = null;
  let _products = {};
  let _activeModal = null;

  /* ─── LANGUAGE RESOLUTION ───────────────────────────────
   * Checks URL ?lang= so embedding sites (Dornori etc.) can
   * pass language as a query param without any JS on their end.
   * Example embed URL: https://lumio.shop/index.html?lang=nl
   */
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

  /* ─── CART ──────────────────────────────────────────── */
  function getCart() { try { return JSON.parse(localStorage.getItem("lumio_cart") || "[]"); } catch { return []; } }
  function saveCart(cart) {
    localStorage.setItem("lumio_cart", JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent("shop:cartUpdated", { detail: { cart } }));
  }
  function colorImageSrc(product, color) {
    if (!color) return product.image;
    const slug = color.toLowerCase().replace(/\s+/g, "-");
    return (product.image || "").replace(/\.[^/.]+$/, "") + "_" + slug + ".webp";
  }
  function addToCart(product, qty = 1, selectedColor = null, selectedImageSrc = null) {
    const cart = getCart();
    const key = product.id + (selectedColor ? "_" + selectedColor.toLowerCase().replace(/\s+/g, "-") : "");
    const existing = cart.find(i => i.cartKey === key);
    if (existing) { existing.qty = Math.min(existing.qty + qty, product.stock || 99); }
    else {
      const color = selectedColor || (product.colors ? product.colors[0] : null);
      const image = selectedImageSrc || (color ? colorImageSrc(product, color) : product.image);
      cart.push({ ...product, cartKey: key, qty, selectedColor: color, image });
    }
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

  /* ═══════════════════════════════════════════════════════
     PRODUCT MODAL
     Opens when user clicks a product image.
     Buy Now button inside → adds to cart, closes.
     Clicking backdrop or Escape → closes.
  ═══════════════════════════════════════════════════════ */
  function openProductModal(product) {
    closeProductModal();
    const p = product;
    const images = p.images?.length ? p.images : [p.image];
    const soldOut = p.colors_soldout || [];
    const available = (p.colors || []).filter(c => !soldOut.includes(c));
    let selectedColor = available[0] || (p.colors?.[0] || null);
    let qty = 1;

    const overlay = document.createElement("div");
    overlay.className = "lumio-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    overlay.innerHTML = `
      <div class="lumio-modal">
        <button class="lumio-modal-close" aria-label="${t("close")}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div class="lumio-modal-gallery">
          <div class="lumio-modal-main-wrap">
            <img class="lumio-modal-main-img" src="${images[0]}" alt="${pName(p)}"
              onerror="this.src='images/placeholder.svg'">
          </div>
          ${images.length > 1 ? `<div class="lumio-modal-thumbs">
            ${images.map((src, i) => `<img class="lumio-modal-thumb${i===0?" active":""}"
              src="${src}" data-src="${src}" alt="${t("image_of")} ${pName(p)} ${i+1}"
              onerror="this.src='images/placeholder.svg'">`).join("")}
          </div>` : ""}
        </div>
        <div class="lumio-modal-details">
          <p class="lumio-modal-category">${pCategory(p)}</p>
          <h2 class="lumio-modal-title">${pName(p)}</h2>
          <p class="lumio-modal-price">${fmt(p.price)}</p>
          <p class="lumio-modal-desc">${pDesc(p)}</p>
          ${p.colors?.length ? `
            <div class="lumio-modal-option-group">
              <label class="lumio-modal-option-label">${t("color")}</label>
              <div class="lumio-modal-colors">
                ${p.colors.map((c, i) => {
                  const so = soldOut.includes(c);
                  return `<button class="lumio-modal-color-btn${i===0?" active":""}${so?" soldout":""}"
                    data-color="${c}" ${so?`disabled title="${t("sold_out")}"`:""}
                  >${c}${so?` <em>(${t("sold_out")})</em>`:""}</button>`;
                }).join("")}
              </div>
            </div>` : ""}
          <div class="lumio-modal-option-group">
            <label class="lumio-modal-option-label">${t("quantity")}</label>
            <div class="lumio-qty-control lumio-qty-control--lg">
              <button class="lumio-qty-btn lumio-qty-btn--minus">−</button>
              <span class="lumio-qty-val">1</span>
              <button class="lumio-qty-btn lumio-qty-btn--plus">+</button>
            </div>
          </div>
          <div class="lumio-modal-meta">
            <span class="${p.stock>0?"lumio-in-stock":"lumio-out-of-stock"}">
              ${p.stock > 0 ? t("in_stock") : t("out_of_stock")}
            </span>
            <span class="lumio-weight-info">${t("weight")}: ${fmtWeight(p.weight)}</span>
            ${p.dimensions?`<span class="lumio-dim-info">${p.dimensions.l}×${p.dimensions.w}×${p.dimensions.h} cm</span>`:""}
          </div>
          <button class="lumio-btn lumio-btn--primary lumio-btn--full lumio-modal-atc" ${p.stock>0?"":"disabled"}>
            ${t("add_to_cart")}
          </button>
          <a class="lumio-btn lumio-btn--outline lumio-btn--full" href="cart.html"
            style="margin-top:10px; text-align:center; display:flex; align-items:center; justify-content:center;">
            ${t("view_cart")}
          </a>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => overlay.classList.add("lumio-modal-overlay--visible"));
    _activeModal = overlay;

    const close = () => closeProductModal();
    overlay.querySelector(".lumio-modal-close").addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    const onKey = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    overlay._keyHandler = onKey;

    const mainImg = overlay.querySelector(".lumio-modal-main-img");

    overlay.querySelectorAll(".lumio-modal-thumb").forEach(thumb => {
      thumb.addEventListener("click", () => {
        overlay.querySelectorAll(".lumio-modal-thumb").forEach(t => t.classList.remove("active"));
        thumb.classList.add("active");
        swapMainImg(mainImg, thumb.dataset.src);
      });
    });

    overlay.querySelectorAll(".lumio-modal-color-btn:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        overlay.querySelectorAll(".lumio-modal-color-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedColor = btn.dataset.color;
        const src = colorImageSrc(p, selectedColor);
        const test = new Image();
        test.onload = () => swapMainImg(mainImg, src);
        test.src = src;
      });
    });

    const qv = overlay.querySelector(".lumio-qty-val");
    overlay.querySelector(".lumio-qty-btn--plus").addEventListener("click", () => { qty = Math.min(qty+1, p.stock||99); qv.textContent = qty; });
    overlay.querySelector(".lumio-qty-btn--minus").addEventListener("click", () => { qty = Math.max(1, qty-1); qv.textContent = qty; });

    overlay.querySelector(".lumio-modal-atc").addEventListener("click", () => {
      addToCart(p, qty, selectedColor, mainImg.src);
      toast(`${pName(p)} ${t("added")}`);
      close();
    });
  }

  function closeProductModal() {
    if (!_activeModal) return;
    const ov = _activeModal;
    if (ov._keyHandler) document.removeEventListener("keydown", ov._keyHandler);
    ov.classList.remove("lumio-modal-overlay--visible");
    setTimeout(() => ov.remove(), 320);
    document.body.style.overflow = "";
    _activeModal = null;
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
        // Mirror in URL so sharing / embedding preserves language
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
    const inStock = !p.stock || p.stock > 0;
    const soldOut = p.colors_soldout || [];
    const swatches = p.colors?.length ? `<div class="lumio-colors">
      ${p.colors.map((c, i) => {
        const so = soldOut.includes(c);
        return `<button class="lumio-color${i===0?" lumio-color--active":""}${so?" lumio-color--soldout":""}"
          data-color="${c}" title="${c}${so?" ("+t("sold_out")+")":""}" ${so?'disabled aria-disabled="true"':""}></button>`;
      }).join("")}
    </div>` : "";

    return `
      <div class="lumio-card-img-wrap lumio-card-img-clickable" title="${t("quick_view")}">
        <img class="lumio-card-img" src="${p.image}" alt="${pName(p)}" loading="lazy"
          onerror="this.src='images/placeholder.svg'">
        ${p.featured ? `<span class="lumio-badge">${t("featured")}</span>` : ""}
        <div class="lumio-card-overlay-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          ${t("quick_view")}
        </div>
        <button class="lumio-card-quick-add" ${inStock?"":"disabled"}>
          ${inStock ? t("add_to_cart") : t("out_of_stock")}
        </button>
      </div>
      <div class="lumio-card-body">
        <h3 class="lumio-card-title">${pName(p)}</h3>
        ${swatches}
        <div class="lumio-card-footer">
          <span class="lumio-card-price">${fmt(p.price)}</span>
          <div class="lumio-qty-control">
            <button class="lumio-qty-btn lumio-qty-btn--minus" aria-label="Decrease">−</button>
            <span class="lumio-qty-val">1</span>
            <button class="lumio-qty-btn lumio-qty-btn--plus" aria-label="Increase">+</button>
          </div>
        </div>
      </div>`;
  }

  function wireProductCard(card, p) {
    let qty = 1;
    const soldOut = p.colors_soldout || [];
    const available = (p.colors || []).filter(c => !soldOut.includes(c));
    let selectedColor = available[0] || null;
    const img = card.querySelector(".lumio-card-img");

    if (selectedColor && img) {
      const test = new Image(); test.onload = () => { img.src = test.src; };
      test.src = colorImageSrc(p, selectedColor);
    }

    // Image click → product modal (not the add-to-cart button)
    card.querySelector(".lumio-card-img-clickable")?.addEventListener("click", e => {
      if (e.target.closest(".lumio-card-quick-add")) return;
      openProductModal(p);
    });

    const qv = card.querySelector(".lumio-qty-val");
    card.querySelector(".lumio-qty-btn--plus")?.addEventListener("click", () => { qty = Math.min(qty+1, p.stock||99); qv.textContent = qty; });
    card.querySelector(".lumio-qty-btn--minus")?.addEventListener("click", () => { qty = Math.max(1, qty-1); qv.textContent = qty; });

    card.querySelectorAll(".lumio-color:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".lumio-color").forEach(b => b.classList.remove("lumio-color--active"));
        btn.classList.add("lumio-color--active");
        selectedColor = btn.dataset.color;
        if (img) {
          const src = colorImageSrc(p, selectedColor);
          const test = new Image();
          test.onload = () => { img.style.opacity="0"; setTimeout(() => { img.src=src; img.style.opacity=""; }, 150); };
          test.src = src;
        }
      });
    });

    card.querySelector(".lumio-card-quick-add")?.addEventListener("click", () => {
      addToCart(p, qty, selectedColor, img?.src || null);
      toast(`${pName(p)} ${t("added")}`);
    });
  }

  /* ═══════════════════════════════════════════════════════
     PRODUCT INFO (standalone)
  ═══════════════════════════════════════════════════════ */
  async function renderProductInfo(divId, productId) {
    await loadLang();
    const p = await getProduct(productId);
    const container = document.getElementById(divId);
    if (!container) return;
    container.classList.add("lumio-product-info");
    const images = p.images?.length ? p.images : [p.image];
    const soldOut = p.colors_soldout || [];
    const available = (p.colors || []).filter(c => !soldOut.includes(c));
    let selectedColor = available[0] || (p.colors?.[0] || null);
    let qty = 1;

    function build() {
      container.innerHTML = `
        <div class="lumio-product-gallery">
          <div class="lumio-product-main-img-wrap">
            <img id="pinfo-main-${productId}" class="lumio-product-main-img"
              src="${images[0]}" alt="${pName(p)}" onerror="this.src='images/placeholder.svg'">
          </div>
          ${images.length > 1 ? `<div class="lumio-product-thumbs">
            ${images.map((src, i) => `<img class="lumio-product-thumb${i===0?" active":""}"
              src="${src}" data-idx="${i}" alt="${t("image_of")} ${pName(p)} ${i+1}"
              onerror="this.src='images/placeholder.svg'">`).join("")}
          </div>` : ""}
        </div>
        <div class="lumio-product-details">
          <h1 class="lumio-product-name">${pName(p)}</h1>
          <p class="lumio-product-price">${fmt(p.price)}</p>
          <p class="lumio-product-desc">${pDesc(p)}</p>
          ${p.colors?.length ? `<div class="lumio-product-option-group">
            <label>${t("color")}</label>
            <div class="lumio-product-colors">
              ${p.colors.map((c, i) => {
                const so = soldOut.includes(c);
                return `<button class="lumio-product-color${i===0?" active":""}${so?" soldout":""}"
                  data-color="${c}" ${so?`disabled title="${t("sold_out")}"`:""}
                >${c}${so?` <em>(${t("sold_out")})</em>`:""}</button>`;
              }).join("")}
            </div>
          </div>` : ""}
          <div class="lumio-product-option-group">
            <label>${t("quantity")}</label>
            <div class="lumio-qty-control lumio-qty-control--lg">
              <button class="lumio-qty-btn lumio-qty-btn--minus">−</button>
              <span class="lumio-qty-val">1</span>
              <button class="lumio-qty-btn lumio-qty-btn--plus">+</button>
            </div>
          </div>
          <div class="lumio-product-meta">
            <span class="${p.stock>0?"lumio-in-stock":"lumio-out-of-stock"}">${p.stock>0?t("in_stock"):t("out_of_stock")}</span>
            <span class="lumio-weight-info">${t("weight")}: ${fmtWeight(p.weight)}</span>
            ${p.dimensions?`<span class="lumio-dim-info">${p.dimensions.l}×${p.dimensions.w}×${p.dimensions.h} cm</span>`:""}
          </div>
          <button class="lumio-btn lumio-btn--primary lumio-add-to-cart" ${p.stock>0?"":"disabled"}>${t("add_to_cart")}</button>
          <a class="lumio-btn lumio-btn--outline" href="cart.html" style="margin-top:10px;">${t("view_cart")}</a>
        </div>`;

      const mainImg = container.querySelector("#pinfo-main-" + productId);
      container.querySelectorAll(".lumio-product-thumb").forEach(thumb => {
        thumb.addEventListener("click", () => {
          container.querySelectorAll(".lumio-product-thumb").forEach(t => t.classList.remove("active"));
          thumb.classList.add("active"); swapMainImg(mainImg, images[+thumb.dataset.idx]);
        });
      });
      const qv = container.querySelector(".lumio-qty-val");
      container.querySelector(".lumio-qty-btn--plus")?.addEventListener("click", () => { qty=Math.min(qty+1,p.stock||99); qv.textContent=qty; });
      container.querySelector(".lumio-qty-btn--minus")?.addEventListener("click", () => { qty=Math.max(1,qty-1); qv.textContent=qty; });
      container.querySelectorAll(".lumio-product-color:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => {
          container.querySelectorAll(".lumio-product-color").forEach(b => b.classList.remove("active"));
          btn.classList.add("active"); selectedColor = btn.dataset.color;
          const src = colorImageSrc(p, selectedColor);
          const test = new Image(); test.onload = () => swapMainImg(mainImg, src); test.src = src;
        });
      });
      container.querySelector(".lumio-add-to-cart")?.addEventListener("click", () => {
        addToCart(p, qty, selectedColor, mainImg?.src || null);
        toast(`${pName(p)} ${t("added")}`);
      });
    }

    build();
    document.addEventListener("shop:langChanged", build);
    document.addEventListener("currency:changed", build);
  }

  /* ═══════════════════════════════════════════════════════
     BUY NOW OVERLAY  — image click → modal, button → cart
  ═══════════════════════════════════════════════════════ */
  async function attachBuyOverlay(selector, productId) {
    await loadLang();
    const p = await getProduct(productId);

    function wire(el) {
      el.style.position = "relative";
      el.querySelector(".lumio-buy-overlay")?.remove();
      const ov = document.createElement("div");
      ov.className = "lumio-buy-overlay";
      ov.innerHTML = `
        <div class="lumio-buy-overlay__inner">
          <span class="lumio-buy-overlay__name">${pName(p)}</span>
          <span class="lumio-buy-overlay__price">${fmt(p.price)}</span>
          <button class="lumio-buy-overlay__btn">${t("buy_now")}</button>
        </div>`;
      ov.querySelector(".lumio-buy-overlay__btn").addEventListener("click", e => {
        e.stopPropagation();
        addToCart(p, 1);
        toast(`${pName(p)} ${t("added")}`);
      });
      el.addEventListener("click", e => {
        if (e.target.closest(".lumio-buy-overlay__btn")) return;
        openProductModal(p);
      });
      el.appendChild(ov);
    }

    document.querySelectorAll(selector).forEach(wire);

    document.addEventListener("shop:langChanged", () => {
      document.querySelectorAll(selector).forEach(el => {
        const n = el.querySelector(".lumio-buy-overlay__name");
        const pr = el.querySelector(".lumio-buy-overlay__price");
        const b = el.querySelector(".lumio-buy-overlay__btn");
        if (n) n.textContent = pName(p);
        if (pr) pr.textContent = fmt(p.price);
        if (b) b.textContent = t("buy_now");
      });
    });
    document.addEventListener("currency:changed", () => {
      document.querySelectorAll(selector).forEach(el => {
        const pr = el.querySelector(".lumio-buy-overlay__price");
        if (pr) pr.textContent = fmt(p.price);
      });
    });
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
        if (cart.length === 0) { container.innerHTML = `<p class="lumio-mini-cart__empty">${t("cart_empty")}</p>`; return; }
        container.innerHTML = `
          <h3 class="lumio-mini-cart__title">${t("cart")} <span>(${count})</span></h3>
          <ul class="lumio-mini-cart__list">
            ${cart.map(item => `<li class="lumio-mini-cart__item">
              <img src="${item.image}" alt="${item.name}" onerror="this.src='images/placeholder.svg'">
              <div class="lumio-mini-cart__item-info">
                <span class="lumio-mini-cart__item-name">${item.name}</span>
                ${item.selectedColor?`<span class="lumio-mini-cart__item-color">${item.selectedColor}</span>`:""}
                <span class="lumio-mini-cart__item-price">${item.qty} × ${fmt(item.price)}</span>
                <span class="lumio-mini-cart__item-weight">${fmtWeight((item.weight||0)*item.qty)}</span>
              </div>
              <button class="lumio-mini-cart__remove" data-key="${item.cartKey}" aria-label="${t("remove")}">✕</button>
            </li>`).join("")}
          </ul>
          <div class="lumio-mini-cart__totals">
            <div class="lumio-mini-cart__row"><span>${t("subtotal")}</span><span>${fmt(subtotal)}</span></div>
            <div class="lumio-mini-cart__row"><span>${t("shipping")}</span><span>${isFreeShipping?t("free"):fmt(shipping)}</span></div>
            <div class="lumio-mini-cart__row"><span>${t("weight")}</span><span>${fmtWeight(totalWeight)}</span></div>
            <div class="lumio-mini-cart__row lumio-mini-cart__row--total"><span>${t("total")}</span><span>${fmt(total)}</span></div>
          </div>
          <a class="lumio-btn lumio-btn--primary" href="${cartUrl}">${t("checkout")}</a>`;
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
    fmt, fmtWeight, generateOrderRef, colorImageSrc,
    toast, openProductModal, closeProductModal, swapMainImg,
    renderCurrencySelector, renderBackButton, wireLanguageSwitcher,
    renderCartIcon, renderShop, renderProductInfo, attachBuyOverlay, renderMiniCart,
    renderTurnstile, submitOrderDetails, submitOrderStatus,
  };
})();
