/* =========================================================
   WEBSHOP Product Viewer - Reusable Quick View Component
   =========================================================
   Usage:
     <div class="product-viewer-trigger" data-product-id="arc-floor-lamp">
       <img src="product-image.jpg" alt="Product Name">
       <button>Quick View</button>
     </div>

     ProductViewer.init();   ← called automatically on DOMContentLoaded
                               but safe to call again after dynamic HTML is added
   ========================================================= */

const ProductViewer = (() => {
  let _overlay      = null;
  let _currentProduct = null;
  let _allProducts  = {};    /* id → product object from Shop cache */
  let _initialized  = false;
  let _loadPromise  = null;

  /* ── Helpers ─────────────────────────────────────────── */
  function fmt(price) {
    return (typeof Shop !== "undefined" && Shop.fmt) ? Shop.fmt(price) : "€" + price.toFixed(2);
  }
  function pName(p)     { return (typeof Shop !== "undefined") ? Shop.pName(p)     : (p.name     || p.id); }
  function pDesc(p)     { return (typeof Shop !== "undefined") ? Shop.pDesc(p)     : (p.description || ""); }
  function pCategory(p) { return (typeof Shop !== "undefined") ? Shop.pCategory(p) : (p.category || ""); }

  /* Resolve a bundled/related ID (string) or legacy inline object to a product */
  function resolveById(id) {
    if (typeof id === "string") return _allProducts[id] || null;
    if (id && typeof id === "object") return _allProducts[id.id] || id;
    return null;
  }

  /* ── Data loading ────────────────────────────────────── */
  function ensureLoaded() {
    if (_loadPromise) return _loadPromise;
    _loadPromise = (async () => {
      if (typeof Shop === "undefined") return;
      await Shop.loadLang();
      const products = await Shop.loadProducts();
      products.forEach(p => { _allProducts[p.id] = p; });
    })();
    return _loadPromise;
  }

  /* ── Overlay DOM ─────────────────────────────────────── */
  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.id        = "product-viewer-overlay";
    overlay.className = "product-viewer-overlay";
    overlay.innerHTML = `
      <div class="product-viewer-container">
        <button class="product-viewer-close" aria-label="Close">&times;</button>
        <div class="product-viewer-content"></div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", e => {
      if (e.target === overlay || e.target.classList.contains("product-viewer-close")) {
        closeViewer();
      }
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && overlay.classList.contains("active")) closeViewer();
    });
    return overlay;
  }

  /* ── Render overlay content ──────────────────────────── */
  function renderProductInOverlay(product) {
    _currentProduct = product;
    const contentEl = _overlay.querySelector(".product-viewer-content");

    const bundledProducts = (product.bundled || []).map(resolveById).filter(Boolean);
    const relatedProducts = (product.related || []).map(resolveById).filter(Boolean);
    const hasBundle       = bundledProducts.length > 0;
    const hasRelated      = relatedProducts.length > 0;

    contentEl.innerHTML = `
      <div class="pdp-wrapper viewer-wrapper">

        <!-- Main: gallery + details -->
        <div class="pdp-main" id="viewer-pdp-main">
          <div class="pdp-gallery" id="viewer-pdp-gallery">
            <div class="pdp-gallery__main-wrap" id="viewer-gallery-main-wrap">
              <img class="pdp-gallery__main-img" id="viewer-gallery-main-img"
                src="${product.images?.[0] || product.image}" alt="${pName(product)}">
            </div>
            <div class="pdp-gallery__thumbs" id="viewer-gallery-thumbs"></div>
          </div>

          <div class="pdp-details">
            <p class="pdp-category">${pCategory(product)}</p>
            <h1 class="pdp-name">${pName(product)}</h1>
            <p class="pdp-price" id="viewer-pdp-price">${fmt(product.variants?.[0]?.price ?? product.price)}</p>
            <p class="pdp-desc">${pDesc(product)}</p>

            <div id="viewer-pdp-variants-wrap"${!product.variants?.length ? ' style="display:none"' : ""}>
              <p class="pdp-option-label">${(typeof Shop !== "undefined" ? Shop.t("finish","Finish") : "Finish")}</p>
              <div class="pdp-variants" id="viewer-pdp-variants"></div>
            </div>

            <div style="display:flex;gap:10px;align-items:center;margin-bottom:20px;">
              <div class="webshop-qty-control webshop-qty-control--lg">
                <button class="webshop-qty-btn webshop-qty-btn--minus" id="viewer-qty-minus">−</button>
                <span class="webshop-qty-val" id="viewer-qty-val">1</span>
                <button class="webshop-qty-btn webshop-qty-btn--plus" id="viewer-qty-plus">+</button>
              </div>
              <button class="webshop-btn webshop-btn--primary pdp-atc-btn" id="viewer-atc-btn">
                ${(typeof Shop !== "undefined" ? Shop.t("add_to_cart","Add to Cart") : "Add to Cart")}
              </button>
            </div>

            <div class="pdp-perks" id="viewer-pdp-perks">
              ${["perk_free_shipping","perk_returns","perk_warranty"].map((k,i) => {
                const fb = ["Free shipping over €150","30-day returns","2-year warranty"][i];
                return `<span>${(typeof Shop !== "undefined" ? Shop.t(k) : null) || fb}</span>`;
              }).join("")}
            </div>
          </div>
        </div>

        <!-- Frequently Bought Together -->
        ${hasBundle ? `
        <div class="pdp-section" style="margin-top:24px;">
          <h2 class="pdp-section-title">${(typeof Shop !== "undefined" ? Shop.t("frequently_bought_together","Frequently Bought Together") : "Frequently Bought Together")}</h2>
          <div class="pdp-bundle-items-list" id="viewer-bundle-items">
            ${bundledProducts.map(item => `
              <div class="pdp-bundle-item">
                <img src="${item.image}" alt="${pName(item)}" onerror="this.style.background='var(--c-bg-alt)'">
                <div class="pdp-bundle-item__info">
                  <div class="pdp-bundle-item__name">${pName(item)}</div>
                  <div class="pdp-bundle-item__price">${fmt(item.price)}${pDesc(item) ? " · " + pDesc(item) : ""}</div>
                </div>
              </div>`).join("")}
          </div>
          <div class="pdp-bundle-actions">
            <button class="webshop-btn webshop-btn--primary" id="viewer-bundle-add-all">
              ${(typeof Shop !== "undefined" ? Shop.t("add_both_to_cart","Add Bundle to Cart") : "Add Bundle to Cart")}
            </button>
          </div>
        </div>` : ""}

        <!-- Related products -->
        ${hasRelated ? `
        <div class="pdp-section" style="margin-top:24px;">
          <h2 class="pdp-section-title">${(typeof Shop !== "undefined" ? Shop.t("related_products_title","You May Also Like") : "You May Also Like")}</h2>
          <div class="pdp-related-grid" id="viewer-related-grid">
            ${relatedProducts.map(r => {
              const rPrice = r.variants?.[0]?.price ?? r.price;
              return `
              <div class="pdp-related-card">
                <div class="pdp-related-card__img-wrap">
                  <img src="${r.image}" alt="${pName(r)}" onerror="this.style.background='var(--c-bg-alt)'">
                  <div class="pdp-related-card__overlay">
                    <button class="pdp-related-card__buy-btn" data-rid="${r.id}">
                      ${(typeof Shop !== "undefined" ? Shop.t("buy_now","BUY NOW") : "BUY NOW")}
                    </button>
                  </div>
                </div>
                <div class="pdp-related-card__info">
                  <div class="pdp-related-card__name">${pName(r)}</div>
                  <div class="pdp-related-card__price">${fmt(rPrice)}</div>
                </div>
              </div>`;
            }).join("")}
          </div>
        </div>` : ""}

      </div>

      <!-- Magnifier -->
      <div class="pdp-magnifier viewer-magnifier" id="viewer-magnifier">
        <img id="viewer-magnifier-img" src="" alt="">
      </div>`;

    initMagnifier();
    initGallery(product);
    initVariants(product);
    initBundle(product, bundledProducts);
    initRelated(relatedProducts);
    initCart(product);
  }

  /* ── Magnifier ───────────────────────────────────────── */
  function initMagnifier() {
    const magEl    = document.getElementById("viewer-magnifier");
    const magImg   = document.getElementById("viewer-magnifier-img");
    const mainWrap = document.getElementById("viewer-gallery-main-wrap");
    const mainImg  = document.getElementById("viewer-gallery-main-img");
    if (!magEl || !mainWrap) return;

    magImg.src = (mainImg.src || "").replace("w=800", "w=1600");

    function updateSize() {
      const rect = mainWrap.getBoundingClientRect();
      const size = Math.min(Math.min(window.innerWidth * 0.4, 500), rect.width * 1.2);
      magEl.style.width = size + "px"; magEl.style.height = size + "px";
    }

    mainWrap.addEventListener("mousemove", e => {
      const rect = mainWrap.getBoundingClientRect();
      const xPct = (e.clientX - rect.left) / rect.width;
      const yPct = (e.clientY - rect.top)  / rect.height;
      updateSize();
      const lW = magEl.offsetWidth, lH = magEl.offsetHeight;
      let ml = rect.right + 20, mt = rect.top + rect.height / 2 - lH / 2;
      if (ml + lW > window.innerWidth - 20) ml = rect.left - lW - 20;
      ml = Math.max(10, Math.min(ml, window.innerWidth  - lW - 10));
      mt = Math.max(10, Math.min(mt, window.innerHeight - lH - 10));
      magEl.style.left = ml + "px"; magEl.style.top = mt + "px";
      magEl.style.display = "block";
      const nW = magImg.naturalWidth, nH = magImg.naturalHeight;
      if (nW && nH) {
        const zoom = 4;
        magImg.style.width  = (nW * zoom) + "px";
        magImg.style.height = (nH * zoom) + "px";
        magImg.style.left   = -(xPct * nW * zoom - lW / 2) + "px";
        magImg.style.top    = -(yPct * nH * zoom - lH / 2) + "px";
      }
    });
    mainWrap.addEventListener("mouseleave", () => { magEl.style.display = "none"; });
    window.addEventListener("resize", () => { if (magEl.style.display === "block") updateSize(); });
  }

  /* ── Gallery ─────────────────────────────────────────── */
  function initGallery(product) {
    let currentIdx = 0;
    const mainImg  = document.getElementById("viewer-gallery-main-img");
    const thumbsEl = document.getElementById("viewer-gallery-thumbs");
    const images   = product.images || [product.image];

    function buildThumbs() {
      thumbsEl.innerHTML = images.map((src, i) =>
        `<img class="pdp-gallery__thumb${i === currentIdx ? " active" : ""}" src="${src}" alt="View ${i+1}" data-idx="${i}">`
      ).join("");
      thumbsEl.querySelectorAll(".pdp-gallery__thumb").forEach(img => {
        img.addEventListener("click", () => {
          currentIdx = +img.dataset.idx;
          mainImg.src = images[currentIdx];
          const magImg = document.getElementById("viewer-magnifier-img");
          if (magImg) magImg.src = images[currentIdx].replace("w=800", "w=1600");
          buildThumbs();
        });
      });
    }
    buildThumbs();
  }

  /* ── Variants ────────────────────────────────────────── */
  function initVariants(product) {
    if (!product.variants?.length) return;
    let selectedVariant = product.variants[0].id;
    const variantsEl = document.getElementById("viewer-pdp-variants");
    const priceEl    = document.getElementById("viewer-pdp-price");
    const mainImg    = document.getElementById("viewer-gallery-main-img");
    const magImg     = document.getElementById("viewer-magnifier-img");

    variantsEl.innerHTML = product.variants.map(v =>
      `<button class="pdp-variant-btn${v.id === selectedVariant ? " active" : ""}" data-vid="${v.id}">${v.label}</button>`
    ).join("");

    variantsEl.querySelectorAll(".pdp-variant-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedVariant = btn.dataset.vid;
        variantsEl.querySelectorAll(".pdp-variant-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const v = product.variants.find(v => v.id === selectedVariant);
        if (v) {
          if (priceEl) priceEl.textContent = fmt(v.price);
          if (v.image && mainImg) {
            mainImg.src = v.image;
            if (magImg) magImg.src = v.image.replace("w=800", "w=1600");
          }
        }
      });
    });
  }

  /* ── Bundle ──────────────────────────────────────────── */
  function initBundle(product, bundledProducts) {
    const btn = document.getElementById("viewer-bundle-add-all");
    if (!btn || !bundledProducts.length) return;
    btn.addEventListener("click", () => {
      if (typeof Shop === "undefined") return;
      const v = product.variants?.[0];
      Shop.addToCart(product, 1, v?.id || null, null, v?.image || product.image);
      bundledProducts.forEach(item => Shop.addToCart(item, 1, null, null, item.image));
      Shop.toast(`${pName(product)} + ${Shop.t("bundle_added","bundle added to cart")}`);
    });
  }

  /* ── Related ─────────────────────────────────────────── */
  function initRelated(relatedProducts) {
    const grid = document.getElementById("viewer-related-grid");
    if (!grid) return;
    grid.querySelectorAll(".pdp-related-card__buy-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const item = resolveById(btn.dataset.rid);
        if (!item || typeof Shop === "undefined") return;
        Shop.addToCart(item, 1, null, null, item.image);
        Shop.toast(`${pName(item)} ${Shop.t("added","added to cart")}`);
      });
    });
  }

  /* ── Cart (qty + ATC) ────────────────────────────────── */
  function initCart(product) {
    let qty = 1;
    const qtyVal  = document.getElementById("viewer-qty-val");
    const atcBtn  = document.getElementById("viewer-atc-btn");
    const variantsEl = document.getElementById("viewer-pdp-variants");

    function getSelectedVariantId() {
      return variantsEl?.querySelector(".pdp-variant-btn.active")?.dataset?.vid || product.variants?.[0]?.id || null;
    }

    document.getElementById("viewer-qty-minus")?.addEventListener("click", () => {
      if (qty > 1) { qty--; qtyVal.textContent = qty; }
    });
    document.getElementById("viewer-qty-plus")?.addEventListener("click", () => {
      const vid = getSelectedVariantId();
      const max = (vid && typeof Shop !== "undefined")
        ? Shop.variantStock(product, vid)
        : (product.stock || 99);
      if (qty < (max || 99)) { qty++; qtyVal.textContent = qty; }
    });

    atcBtn?.addEventListener("click", () => {
      if (typeof Shop === "undefined") return;
      const vid = getSelectedVariantId();
      const img = document.getElementById("viewer-gallery-main-img")?.src || product.image;
      Shop.addToCart(product, qty, vid, null, img);
      const v = product.variants?.find(v => v.id === vid);
      Shop.toast(`${pName(product)}${v ? " – " + v.label : ""} ${Shop.t("added","added to cart")}`);
    });
  }

  /* ── Open / close ────────────────────────────────────── */
  function openViewer(productId) {
    ensureLoaded().then(() => {
      const product = _allProducts[productId];
      if (!product) { console.warn("[ProductViewer] Unknown product:", productId); return; }

      if (!_overlay) _overlay = createOverlay();

      renderProductInOverlay(product);
      _overlay.style.display = "flex";
      requestAnimationFrame(() => _overlay.classList.add("active"));
      document.body.style.overflow = "hidden";
    });
  }

  function closeViewer() {
    if (!_overlay) return;
    _overlay.classList.remove("active");
    setTimeout(() => { if (_overlay) _overlay.style.display = "none"; }, 300);
    document.body.style.overflow = "";
  }

  /* ── Wire trigger cards ──────────────────────────────── */
  function init(selector = ".product-viewer-trigger") {
    if (_initialized) return;
    document.querySelectorAll(selector).forEach(trigger => {
      trigger.addEventListener("click", e => {
        e.preventDefault();
        const productId = trigger.dataset.productId;
        if (productId) openViewer(productId);
      });
    });
    _initialized = true;
  }

  return { init, openViewer, closeViewer };
})();

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => { ProductViewer.init(); });
}
