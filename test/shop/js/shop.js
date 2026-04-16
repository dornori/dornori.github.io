/* =========================================================
   LUMIO SHOP ENGINE  –  shop.js
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
      .catch(() => { LANG = {}; _langLoaded = true; return {}; });
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

  /* ── Helpers ──────────────────────────────────────────── */
  function generateOrderRef() {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substr(2, 5).toUpperCase();
    return "LM-" + ts + "-" + rnd;
  }

  function fmt(amount) {
    return CONFIG.currency + amount.toFixed(2);
  }

  function fmtWeight(kg) {
    return kg >= 1 ? kg.toFixed(1) + " kg" : (kg * 1000).toFixed(0) + " g";
  }

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

  /* ── Formspree – EXACT same method as embed-form.js ─────────────────────────── */
  async function submitOrderDetails(orderRef, formData, cart) {
    const totals = calculateTotals(cart, formData.isBusiness);

    const payload = new FormData();

    payload.append("_subject", `New Order ${orderRef}`);
    payload.append("order_ref", orderRef);
    payload.append("status", "PENDING_PAYMENT");

    Object.entries(formData).forEach(([key, value]) => {
      if (value != null && value !== "") {
        payload.append(key, value);
      }
    });

    const cartSummary = cart.map(item => 
      `${item.qty}× ${item.name}${item.selectedColor ? ` (${item.selectedColor})` : ""} @ ${fmt(item.price)}`
    ).join(", ");

    payload.append("cart_items", cartSummary);
    payload.append("subtotal", fmt(totals.subtotal));
    payload.append("tax", fmt(totals.tax));
    payload.append("shipping", totals.isFreeShipping ? "FREE" : fmt(totals.shipping));
    payload.append("total", fmt(totals.total));

    try {
      const response = await fetch(CONFIG.formspree.endpoint, {
        method: 'POST',
        body: payload,
        headers: { Accept: 'application/json' }
      });

      if (response.ok) {
        console.log(`✅ Order ${orderRef} sent to Formspree`);
        return true;
      } else {
        console.warn(`Formspree returned ${response.status}`);
        return false;
      }
    } catch (err) {
      console.warn("Formspree fetch error:", err);
      return false;
    }
  }

  async function submitOrderStatus(orderRef, status) {
    // Optional - keep simple
    console.log(`Order status update: ${status} for ${orderRef}`);
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
    submitOrderDetails,
    submitOrderStatus,
  };
})();
