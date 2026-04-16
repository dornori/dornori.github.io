/* =========================================================
   LUMIO SHOP ENGINE  –  shop.js (FIXED)
   ========================================================= */

const Shop = (() => {
  /* ── State ────────────────────────────────────────────── */
  let LANG = {};
  let _langLoaded = false;
  let _langLoadPromise = null;
  let _products = {};

  /* ── Cart helpers ─────────────────────────────────────── */
  function getCart() {
    try { return JSON.parse(localStorage.getItem("lumio_cart") || "[]"); }
    catch { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem("lumio_cart", JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent("shop:cartUpdated", { detail: { cart } }));
  }

  function addToCart(product, qty = 1, selectedColor = null) {
    const cart = getCart();
    const key = product.id + (selectedColor ? "_" + selectedColor : "");
    const existing = cart.find(i => i.cartKey === key);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, product.stock || 99);
    } else {
      cart.push({
        ...product,
        cartKey: key,
        qty,
        selectedColor: selectedColor || (product.colors ? product.colors[0] : null),
      });
    }
    saveCart(cart);
    return cart;
  }

  function removeFromCart(cartKey) {
    const cart = getCart().filter(i => i.cartKey !== cartKey);
    saveCart(cart);
  }

  function updateQty(cartKey, qty) {
    const cart = getCart();
    const item = cart.find(i => i.cartKey === cartKey);
    if (item) {
      if (qty <= 0) { removeFromCart(cartKey); return; }
      item.qty = qty;
      saveCart(cart);
    }
  }

  function clearCart() {
    localStorage.removeItem("lumio_cart");
    document.dispatchEvent(new CustomEvent("shop:cartUpdated", { detail: { cart: [] } }));
  }

  /* ── Totals ───────────────────────────────────────────── */
  function calculateTotals(cart, isBusiness = false) {
    const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
    const totalWeight = cart.reduce((a, i) => a + (i.weight || 0) * i.qty, 0);
    const isFreeShipping = subtotal >= CONFIG.shipping.freeThreshold;
    const shipping = isFreeShipping ? 0 : CONFIG.shipping.base + (totalWeight * CONFIG.shipping.perKg);
    const taxRate = isBusiness ? 0 : CONFIG.taxRate;
    const tax = subtotal * taxRate;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total, totalWeight, isFreeShipping, taxRate };
  }

  /* ── Language ─────────────────────────────────────────── */
  function loadLang() {
    if (_langLoaded) return Promise.resolve(LANG);
    if (_langLoadPromise) return _langLoadPromise;
    const lang = CONFIG.language || CONFIG.defaultLanguage || "en";
    _langLoadPromise = fetch("data/lang/" + lang + ".json")
      .then(r => r.json())
      .then(d => { LANG = d; _langLoaded = true; return d; })
      .catch(() => {
        LANG = {}; _langLoaded = true; return {};
      });
    return _langLoadPromise;
  }

  function t(key, fallback = "") {
    return LANG[key] || fallback || key;
  }

  /* ── Product loader ───────────────────────────────────── */
  async function loadProducts() {
    const manifest = await fetch("data/products/manifest.json").then(r => r.json());
    const all = await Promise.all(
      manifest.map(f => fetch("data/products/" + f).then(r => r.json()))
    );
    all.forEach(p => { _products[p.id] = p; });
    return all;
  }

  async function getProduct(id) {
    if (_products[id]) return _products[id];
    const p = await fetch("data/products/" + id + ".json").then(r => r.json());
    _products[id] = p;
    return p;
  }

  /* ── Order reference generator ────────────────────────── */
  function generateOrderRef() {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substr(2, 5).toUpperCase();
    return "LM-" + ts + "-" + rnd;
  }

  /* ── Format helpers ───────────────────────────────────── */
  function fmt(amount) {
    return CONFIG.currency + amount.toFixed(2);
  }

  function fmtWeight(kg) {
    return kg >= 1 ? kg.toFixed(1) + " kg" : (kg * 1000).toFixed(0) + " g";
  }

  /* ── POPUP toast ──────────────────────────────────────── */
  function toast(text, duration = 2800) {
    const existing = document.querySelector(".lumio-toast");
    if (existing) existing.remove();
    const el = document.createElement("div");
    el.className = "lumio-toast";
    el.innerHTML = `<span class="lumio-toast-icon">✓</span>${text}`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("lumio-toast--visible"));
    setTimeout(() => {
      el.classList.remove("lumio-toast--visible");
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  /* ── CART ICON widget ─────────────────────────────────── */
  function renderCartIcon(options = {}) {
    const {
      target = "body",
      fixed = true,
      cartUrl = "cart.html",
    } = options;

    const wrapper = document.createElement("a");
    wrapper.href = cartUrl;
    wrapper.className = "lumio-cart-icon" + (fixed ? " lumio-cart-icon--fixed" : "");
    wrapper.setAttribute("aria-label", "Shopping cart");
    wrapper.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
      <span class="lumio-cart-icon__badge" aria-live="polite">0</span>
    `;

    if (target === "body") {
      document.body.appendChild(wrapper);
    } else {
      document.querySelector(target)?.appendChild(wrapper);
    }

    function updateBadge() {
      const cart = getCart();
      const count = cart.reduce((a, i) => a + i.qty, 0);
      const badge = wrapper.querySelector(".lumio-cart-icon__badge");
      if (badge) {
        badge.textContent = count;
        badge.classList.toggle("lumio-cart-icon__badge--hidden", count === 0);
      }
    }
    updateBadge();
    document.addEventListener("shop:cartUpdated", updateBadge);
    return wrapper;
  }

  /* ── PRODUCT GRID ─────────────────────────────────────── */
  async function renderShop(divId, options = {}) {
    await loadLang();
    const products = await loadProducts();
    const container = document.getElementById(divId);
    if (!container) return;

    const {
      columns = "auto",
      showFilter = true,
      cartUrl = "cart.html",
    } = options;

    container.classList.add("lumio-shop");

    // Category filter
    if (showFilter) {
      const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
      if (categories.length > 1) {
        const filterEl = document.createElement("div");
        filterEl.className = "lumio-filter";
        filterEl.innerHTML = `
          <button class="lumio-filter__btn lumio-filter__btn--active" data-cat="all">All</button>
          ${categories.map(c => `<button class="lumio-filter__btn" data-cat="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</button>`).join("")}
        `;
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

    // Grid
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

  /* ── PRODUCT CARD (standalone div) ───────────────────── */
  function buildProductCard(p) {
    const inStock = !p.stock || p.stock > 0;
    const colorOptions = p.colors?.length
      ? `<div class="lumio-colors">
          ${p.colors.map((c, i) => `<button class="lumio-color${i === 0 ? " lumio-color--active" : ""}" data-color="${c}" title="${c}"></button>`).join("")}
         </div>`
      : "";
    return `
      <div class="lumio-card-img-wrap">
        <img class="lumio-card-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='images/placeholder.svg'">
        ${p.featured ? '<span class="lumio-badge">Featured</span>' : ""}
        <button class="lumio-card-quick-add" data-id="${p.id}" aria-label="Add to cart" ${inStock ? "" : "disabled"}>
          ${inStock ? t("add_to_cart") : t("out_of_stock")}
        </button>
      </div>
      <div class="lumio-card-body">
        <h3 class="lumio-card-title">${p.name}</h3>
        ${colorOptions}
        <div class="lumio-card-footer">
          <span class="lumio-card-price">${fmt(p.price)}</span>
          <div class="lumio-qty-control">
            <button class="lumio-qty-btn lumio-qty-btn--minus" aria-label="Decrease">−</button>
            <span class="lumio-qty-val">1</span>
            <button class="lumio-qty-btn lumio-qty-btn--plus" aria-label="Increase">+</button>
          </div>
        </div>
      </div>
    `;
  }

  function wireProductCard(card, p) {
    let qty = 1;
    let selectedColor = p.colors?.[0] || null;

    const qtyVal = card.querySelector(".lumio-qty-val");
    card.querySelector(".lumio-qty-btn--plus")?.addEventListener("click", () => {
      qty = Math.min(qty + 1, p.stock || 99);
      qtyVal.textContent = qty;
    });
    card.querySelector(".lumio-qty-btn--minus")?.addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      qtyVal.textContent = qty;
    });

    card.querySelectorAll(".lumio-color").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".lumio-color").forEach(b => b.classList.remove("lumio-color--active"));
        btn.classList.add("lumio-color--active");
        selectedColor = btn.dataset.color;
      });
    });

    card.querySelector(".lumio-card-quick-add")?.addEventListener("click", () => {
      addToCart(p, qty, selectedColor);
      toast(`${p.name} ${t("added")}`);
    });
  }

  /* ── PRODUCT INFO div (standalone) ───────────────────── */
  async function renderProductInfo(divId, productId, options = {}) {
    await loadLang();
    const p = await getProduct(productId);
    const container = document.getElementById(divId);
    if (!container) return;
    container.classList.add("lumio-product-info");

    let currentImg = 0;
    const images = p.images || [p.image];
    let qty = 1;
    let selectedColor = p.colors?.[0] || null;

    container.innerHTML = `
      <div class="lumio-product-gallery">
        <div class="lumio-product-main-img-wrap">
          <img id="lumio-main-img" class="lumio-product-main-img" src="${images[0]}" alt="${p.name}" onerror="this.src='images/placeholder.svg'">
        </div>
        ${images.length > 1 ? `
          <div class="lumio-product-thumbs">
            ${images.map((img, i) => `<img class="lumio-product-thumb${i === 0 ? " active" : ""}" src="${img}" data-idx="${i}" alt="" onerror="this.src='images/placeholder.svg'">`).join("")}
          </div>` : ""}
      </div>
      <div class="lumio-product-details">
        <h1 class="lumio-product-name">${p.name}</h1>
        <p class="lumio-product-price">${fmt(p.price)}</p>
        <p class="lumio-product-desc">${p.description || ""}</p>
        ${p.colors?.length ? `
          <div class="lumio-product-option-group">
            <label>${t("color")}</label>
            <div class="lumio-product-colors">
              ${p.colors.map((c, i) => `<button class="lumio-product-color${i===0?" active":""}" data-color="${c}">${c}</button>`).join("")}
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
          <span class="${p.stock > 0 ? "lumio-in-stock" : "lumio-out-of-stock"}">
            ${p.stock > 0 ? t("in_stock") : t("out_of_stock")}
          </span>
          <span class="lumio-weight-info">${t("weight")}: ${fmtWeight(p.weight)}</span>
        </div>
        <button class="lumio-btn lumio-btn--primary lumio-add-to-cart" data-id="${p.id}" ${p.stock > 0 ? "" : "disabled"}>
          ${t("add_to_cart")}
        </button>
        <a class="lumio-btn lumio-btn--outline" href="cart.html">${t("view_cart")}</a>
      </div>
    `;

    // Wire gallery
    container.querySelectorAll(".lumio-product-thumb").forEach(thumb => {
      thumb.addEventListener("click", () => {
        container.querySelectorAll(".lumio-product-thumb").forEach(t => t.classList.remove("active"));
        thumb.classList.add("active");
        document.getElementById("lumio-main-img").src = images[+thumb.dataset.idx];
      });
    });

    // Wire qty
    const qtyVal = container.querySelector(".lumio-qty-val");
    container.querySelector(".lumio-qty-btn--plus")?.addEventListener("click", () => {
      qty = Math.min(qty + 1, p.stock || 99);
      qtyVal.textContent = qty;
    });
    container.querySelector(".lumio-qty-btn--minus")?.addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      qtyVal.textContent = qty;
    });

    // Wire colors
    container.querySelectorAll(".lumio-product-color").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".lumio-product-color").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedColor = btn.dataset.color;
      });
    });

    // Wire add to cart
    container.querySelector(".lumio-add-to-cart")?.addEventListener("click", () => {
      addToCart(p, qty, selectedColor);
      toast(`${p.name} ${t("added")}`);
    });
  }

  /* ── BUY NOW OVERLAY (for hero images) ────────────────── */
  async function attachBuyOverlay(selector, productId, options = {}) {
    await loadLang();
    const p = await getProduct(productId);
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.style.position = "relative";
      const overlay = document.createElement("div");
      overlay.className = "lumio-buy-overlay";
      overlay.innerHTML = `
        <div class="lumio-buy-overlay__inner">
          <span class="lumio-buy-overlay__name">${p.name}</span>
          <span class="lumio-buy-overlay__price">${fmt(p.price)}</span>
          <button class="lumio-buy-overlay__btn">${t("buy_now")}</button>
        </div>
      `;
      overlay.querySelector("button").addEventListener("click", (e) => {
        e.stopPropagation();
        addToCart(p, 1);
        toast(`${p.name} ${t("added")}`);
      });
      el.appendChild(overlay);
    });
  }

  /* ── MINI CART div ────────────────────────────────────── */
  function renderMiniCart(divId, options = {}) {
    const { cartUrl = "cart.html" } = options;
    const container = document.getElementById(divId);
    if (!container) return;
    container.classList.add("lumio-mini-cart");

    function render() {
      loadLang().then(() => {
        const cart = getCart();
        const { subtotal, shipping, tax, total, isFreeShipping } = calculateTotals(cart);
        const count = cart.reduce((a, i) => a + i.qty, 0);

        if (cart.length === 0) {
          container.innerHTML = `<p class="lumio-mini-cart__empty">${t("cart_empty")}</p>`;
          return;
        }

        container.innerHTML = `
          <h3 class="lumio-mini-cart__title">${t("cart")} <span>(${count})</span></h3>
          <ul class="lumio-mini-cart__list">
            ${cart.map(item => `
              <li class="lumio-mini-cart__item">
                <img src="${item.image}" alt="${item.name}" onerror="this.src='images/placeholder.svg'">
                <div class="lumio-mini-cart__item-info">
                  <span class="lumio-mini-cart__item-name">${item.name}</span>
                  ${item.selectedColor ? `<span class="lumio-mini-cart__item-color">${item.selectedColor}</span>` : ""}
                  <span class="lumio-mini-cart__item-price">${item.qty} × ${fmt(item.price)}</span>
                </div>
                <button class="lumio-mini-cart__remove" data-key="${item.cartKey}" aria-label="Remove">✕</button>
              </li>
            `).join("")}
          </ul>
          <div class="lumio-mini-cart__totals">
            <div class="lumio-mini-cart__row">
              <span>${t("subtotal")}</span><span>${fmt(subtotal)}</span>
            </div>
            <div class="lumio-mini-cart__row">
              <span>${t("shipping")}</span>
              <span>${isFreeShipping ? t("free") : fmt(shipping)}</span>
            </div>
          </div>
          <a class="lumio-btn lumio-btn--primary" href="${cartUrl}">${t("checkout")}</a>
        `;

        container.querySelectorAll(".lumio-mini-cart__remove").forEach(btn => {
          btn.addEventListener("click", () => {
            removeFromCart(btn.dataset.key);
          });
        });
      });
    }

    render();
    document.addEventListener("shop:cartUpdated", render);
  }

  /* ── Turnstile Captcha helper ─────────────────────────────────────────────
   *
   * renderTurnstile(containerEl) → Promise<token>
   *
   * Shows a Cloudflare Turnstile widget inside containerEl and resolves with
   * the cf-turnstile-response token once the user passes the challenge.
   * Rejects if Turnstile is not loaded or an error occurs.
   *
   * The Turnstile CDN script must be present on the page BEFORE this is called:
   *   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script>
   *
   * Set CONFIG.turnstile.sitekey in config.js:
   *   turnstile: { sitekey: "0x4AAAAAAA..." }
   * ───────────────────────────────────────────────────────────────────────── */
  function renderTurnstile(containerEl) {
    return new Promise((resolve, reject) => {
      if (typeof window.turnstile === "undefined") {
        console.warn("Turnstile not loaded — skipping captcha.");
        resolve(null);
        return;
      }

      const sitekey = CONFIG.turnstile?.sitekey || "";
      if (!sitekey) {
        console.warn("No Turnstile sitekey configured (CONFIG.turnstile.sitekey).");
        resolve(null);
        return;
      }

      // Clear any previous content
      containerEl.innerHTML = "";

      // Track if callback was already called to avoid double-resolve
      let resolved = false;
      
      window.turnstile.render(containerEl, {
        sitekey,
        theme: "light",
        callback: (token) => {
          if (resolved) return;
          resolved = true;
          resolve(token);
        },
        "error-callback": () => {
          if (resolved) return;
          resolved = true;
          console.warn("Turnstile error — resetting widget.");
          window.turnstile.reset(containerEl);
          reject(new Error("Turnstile challenge failed"));
        },
        "expired-callback": () => {
          if (resolved) return;
          resolved = true;
          window.turnstile.reset(containerEl);
          reject(new Error("Turnstile token expired"));
        },
      });
    });
  }

  /* ── Formspree Submission ──────────────────────────────────────────────────
   *
   * submitOrderDetails(orderRef, formData, cart, captchaContainerEl?)
   *
   * captchaContainerEl — optional DOM element to mount the Turnstile widget
   * in before submitting.  If omitted (or Turnstile is not configured) the
   * order is submitted without a captcha token.
   * ───────────────────────────────────────────────────────────────────────── */
  async function submitOrderDetails(orderRef, formData, cart, captchaContainerEl = null) {
    const totals = calculateTotals(cart, formData.isBusiness);

    // ── Captcha ────────────────────────────────────────────────────────────
    let captchaToken = null;
    if (captchaContainerEl) {
      try {
        captchaToken = await renderTurnstile(captchaContainerEl);
      } catch (err) {
        // Widget errored — surface to caller so the UI can show a retry
        throw err;
      }
    }

    // ── Build payload ──────────────────────────────────────────────────────
    const payload = new FormData();

    payload.append("_subject", `New Order ${orderRef}`);
    payload.append("order_ref", orderRef);
    payload.append("status", "PENDING_PAYMENT");

    // Captcha token (Formspree reads cf-turnstile-response automatically)
    if (captchaToken) {
      payload.append("cf-turnstile-response", captchaToken);
    }

    // Customer data
    Object.entries(formData).forEach(([key, value]) => {
      if (value != null && value !== "") payload.append(key, value);
    });

    // Cart summary
    const cartSummary = cart.map(item =>
      `${item.qty}× ${item.name}${item.selectedColor ? ` (${item.selectedColor})` : ""} @ ${fmt(item.price)} = ${fmt(item.price * item.qty)}`
    ).join("\n");

    payload.append("cart_items", cartSummary);
    payload.append("subtotal", fmt(totals.subtotal));
    payload.append("tax", fmt(totals.tax));
    payload.append("shipping", totals.isFreeShipping ? "FREE" : fmt(totals.shipping));
    payload.append("total", fmt(totals.total));
    payload.append("total_weight", fmtWeight(totals.totalWeight || 0));

    // ── Send ───────────────────────────────────────────────────────────────
    try {
      const response = await fetch(CONFIG.formspree.endpoint, {
        method: "POST",
        body: payload,
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        console.log(`✅ Order ${orderRef} sent to Formspree`);
        return true;
      } else {
        const body = await response.json().catch(() => ({}));
        console.warn(`Formspree status: ${response.status}`, body);
        return false;
      }
    } catch (err) {
      console.warn("Formspree submission failed (normal on localhost)", err);
      return false;
    }
  }

  async function submitOrderStatus(orderRef, status) {
    const payload = new FormData();
    payload.append("_subject", `Order ${status}: ${orderRef}`);
    payload.append("order_ref", orderRef);
    payload.append("status", status);

    try {
      await fetch(CONFIG.formspree.endpoint, {
        method: "POST",
        body: payload,
        headers: { "Accept": "application/json" }
      });
    } catch (err) {
      console.warn(`Status update failed for ${orderRef}`, err);
    }
  }

  /* ── Public API ───────────────────────────────────────── */
  return {
    getCart,
    saveCart,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    calculateTotals,
    loadLang,
    loadProducts,
    getProduct,
    generateOrderRef,
    fmt,
    fmtWeight,
    t,
    toast,
    renderCartIcon,
    renderShop,
    renderProductInfo,
    attachBuyOverlay,
    renderMiniCart,
    renderTurnstile,
    submitOrderDetails,
    submitOrderStatus,
  };
})();
