/* =========================================================
   LUMIO Product Viewer - Reusable Component
   =========================================================
   Usage:
     <div class="product-viewer-trigger" data-product-id="arc-floor-lamp">
       <img src="product-image.jpg" alt="Product Name">
       <button>Quick View</button>
     </div>
     
     Then initialize:
     ProductViewer.init();
   ========================================================= */

const ProductViewer = (() => {
  let _overlay = null;
  let _currentProduct = null;
  let _productData = {};
  let _initialized = false;

  // Product data mapping (can be extended or loaded from JSON)
  const PRODUCTS = {
    "arc-floor-lamp": {
      id: "arc-floor-lamp",
      name: "Arc Floor Lamp",
      category: "Floor Lamps",
      price: 249,
      weight: 4.2,
      stock: 12,
      image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
        "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800&q=80",
        "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80",
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80"
      ],
      variants: [
        { id: "matte-black", label: "Matte Black", price: 249, stock: 8, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80" },
        { id: "brushed-gold", label: "Brushed Gold", price: 279, stock: 4, image: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800&q=80" }
      ],
      bundled: [
        { id: "dimmer-switch", name: "Inline Dimmer Switch", price: 24, weight: 0.1, image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&q=80", desc: "Touch-sensitive inline dimmer." },
        { id: "replacement-bulb-e27", name: "Edison Bulb E27 4W", price: 12, weight: 0.05, image: "https://images.unsplash.com/photo-1573833040204-4e8b9f53bef3?w=400&q=80", desc: "Warm 2200K, dimmable." }
      ],
      related: [
        { id: "globe-pendant", name: "Globe Pendant", price: 139, image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&q=80" },
        { id: "half-moon-sconce", name: "Half-Moon Sconce", price: 195, image: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=400&q=80" },
        { id: "concrete-desk-lamp", name: "Concrete Desk Lamp", price: 89, image: "https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=400&q=80" }
      ]
    },
    "globe-pendant": {
      id: "globe-pendant",
      name: "Globe Pendant",
      category: "Pendant Lamps",
      price: 139,
      weight: 1.8,
      stock: 7,
      image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&q=80",
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
        "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800&q=80"
      ],
      variants: [
        { id: "smoke", label: "Smoke", price: 139, stock: 3, image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&q=80" },
        { id: "clear", label: "Clear", price: 139, stock: 4, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80" },
        { id: "amber", label: "Amber", price: 149, stock: 2, image: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800&q=80" }
      ],
      bundled: [
        { id: "replacement-bulb-e27", name: "Edison Bulb E27 4W", price: 12, weight: 0.05, image: "https://images.unsplash.com/photo-1573833040204-4e8b9f53bef3?w=400&q=80", desc: "Warm 2200K, dimmable." }
      ],
      related: [
        { id: "arc-floor-lamp", name: "Arc Floor Lamp", price: 249, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80" },
        { id: "half-moon-sconce", name: "Half-Moon Sconce", price: 195, image: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=400&q=80" }
      ]
    },
    "concrete-desk-lamp": {
      id: "concrete-desk-lamp",
      name: "Concrete Desk Lamp",
      category: "Desk Lamps",
      price: 89,
      weight: 2.1,
      stock: 23,
      image: "https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=800&q=80",
        "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80",
        "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80"
      ],
      variants: [
        { id: "raw-concrete", label: "Raw Concrete", price: 89, stock: 12, image: "https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=800&q=80" },
        { id: "washed-white", label: "Washed White", price: 95, stock: 7, image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80" },
        { id: "obsidian-black", label: "Obsidian Black", price: 99, stock: 4, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80" }
      ],
      bundled: [
        { id: "dimmer-switch", name: "Inline Dimmer Switch", price: 24, weight: 0.1, image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&q=80", desc: "Touch-sensitive inline dimmer." }
      ],
      related: [
        { id: "arc-floor-lamp", name: "Arc Floor Lamp", price: 249, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80" },
        { id: "globe-pendant", name: "Globe Pendant", price: 139, image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&q=80" }
      ]
    },
    "half-moon-sconce": {
      id: "half-moon-sconce",
      name: "Half-Moon Sconce",
      category: "Wall Lamps",
      price: 195,
      weight: 1.4,
      stock: 5,
      image: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=800&q=80",
        "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&q=80"
      ],
      variants: [
        { id: "white", label: "White", price: 195, stock: 3, image: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=800&q=80" },
        { id: "black", label: "Black", price: 205, stock: 2, image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&q=80" }
      ],
      bundled: [],
      related: [
        { id: "arc-floor-lamp", name: "Arc Floor Lamp", price: 249, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80" },
        { id: "globe-pendant", name: "Globe Pendant", price: 139, image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&q=80" }
      ]
    }
  };

  function fmt(price) {
    if (typeof Shop !== "undefined" && Shop.fmt) return Shop.fmt(price);
    return "€" + price.toFixed(2);
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'product-viewer-overlay';
    overlay.className = 'product-viewer-overlay';
    overlay.innerHTML = `
      <div class="product-viewer-container">
        <button class="product-viewer-close">&times;</button>
        <div class="product-viewer-content"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function createMagnifierHTML() {
    return `
      <div class="pdp-magnifier viewer-magnifier" id="viewer-magnifier">
        <img id="viewer-magnifier-img" src="" alt="">
      </div>
    `;
  }

  function renderProductInOverlay(productId) {
    const product = PRODUCTS[productId];
    if (!product) return;
    
    _currentProduct = product;
    const contentEl = _overlay.querySelector('.product-viewer-content');
    
    contentEl.innerHTML = `
      <div class="pdp-wrapper viewer-wrapper">
        <div class="pdp-main" id="viewer-pdp-main">
          <div class="pdp-gallery" id="viewer-pdp-gallery">
            <div class="pdp-gallery__main-wrap" id="viewer-gallery-main-wrap">
              <img class="pdp-gallery__main-img" id="viewer-gallery-main-img" src="${product.image}" alt="${product.name}">
            </div>
            <div class="pdp-gallery__thumbs" id="viewer-gallery-thumbs"></div>
          </div>
          <div class="pdp-details">
            <p class="pdp-category">${product.category}</p>
            <h1 class="pdp-name">${product.name}</h1>
            <p class="pdp-price" id="viewer-pdp-price">${fmt(product.price)}</p>
            <p class="pdp-desc">A beautiful lighting piece for your home. Designed with Scandinavian minimalism and warm ambient lighting in mind.</p>
            <div id="viewer-pdp-variants-wrap">
              <p class="pdp-option-label">Finish</p>
              <div class="pdp-variants" id="viewer-pdp-variants"></div>
            </div>
            <div style="display:flex;gap:10px;align-items:center;margin-bottom:20px;">
              <div class="lumio-qty-control lumio-qty-control--lg">
                <button class="lumio-qty-btn lumio-qty-btn--minus" id="viewer-qty-minus">−</button>
                <span class="lumio-qty-val" id="viewer-qty-val">1</span>
                <button class="lumio-qty-btn lumio-qty-btn--plus" id="viewer-qty-plus">+</button>
              </div>
              <button class="lumio-btn lumio-btn--primary pdp-atc-btn" id="viewer-atc-btn">Add to Cart</button>
            </div>
            <div class="pdp-perks" id="viewer-pdp-perks">
              <span>Free shipping over €150</span>
              <span>30-day returns</span>
              <span>2-year warranty</span>
            </div>
          </div>
        </div>
        <div class="pdp-section" style="margin-top:24px;">
          <h2 class="pdp-section-title">Frequently Bought Together</h2>
          <div class="pdp-bundle-items-list" id="viewer-bundle-items"></div>
          <div class="pdp-bundle-actions">
            <button class="lumio-btn lumio-btn--primary" id="viewer-bundle-add-all">Add Both to Cart</button>
          </div>
        </div>
        <div class="pdp-section" style="margin-top:24px;">
          <h2 class="pdp-section-title">You May Also Like</h2>
          <div class="pdp-related-grid" id="viewer-related-grid"></div>
        </div>
      </div>
      ${createMagnifierHTML()}
    `;
    
    initializeViewerMagnifier();
    initializeViewerGallery(product);
    initializeViewerVariants(product);
    initializeViewerBundle(product);
    initializeViewerRelated(product);
    initializeViewerCart(product);
  }

  function initializeViewerMagnifier() {
    const magEl = document.getElementById('viewer-magnifier');
    const magImg = document.getElementById('viewer-magnifier-img');
    const mainWrap = document.getElementById('viewer-gallery-main-wrap');
    const mainImg = document.getElementById('viewer-gallery-main-img');
    
    if (!magEl || !mainWrap) return;
    
    // Set high-res image
    let highResSrc = mainImg.src;
    if (highResSrc.includes('w=800')) highResSrc = highResSrc.replace('w=800', 'w=1600');
    magImg.src = highResSrc;
    
    function updateMagnifierSize() {
      const rect = mainWrap.getBoundingClientRect();
      const maxWidth = Math.min(window.innerWidth * 0.4, 500);
      const size = Math.min(maxWidth, rect.width * 1.2);
      magEl.style.width = size + "px";
      magEl.style.height = size + "px";
    }
    
    mainWrap.addEventListener("mousemove", (e) => {
      const rect = mainWrap.getBoundingClientRect();
      const xPct = (e.clientX - rect.left) / rect.width;
      const yPct = (e.clientY - rect.top) / rect.height;
      
      updateMagnifierSize();
      const lensW = magEl.offsetWidth;
      const lensH = magEl.offsetHeight;
      
      let mLeft = rect.right + 20;
      let mTop = rect.top + (rect.height / 2) - (lensH / 2);
      
      if (mLeft + lensW > window.innerWidth - 20) {
        mLeft = rect.left - lensW - 20;
      }
      mLeft = Math.max(10, Math.min(mLeft, window.innerWidth - lensW - 10));
      mTop = Math.max(10, Math.min(mTop, window.innerHeight - lensH - 10));
      
      magEl.style.left = mLeft + "px";
      magEl.style.top = mTop + "px";
      magEl.style.display = "block";
      
      const naturalW = magImg.naturalWidth;
      const naturalH = magImg.naturalHeight;
      
      if (naturalW && naturalH) {
        const zoom = 4;
        const zoomW = naturalW * zoom;
        const zoomH = naturalH * zoom;
        magImg.style.width = zoomW + "px";
        magImg.style.height = zoomH + "px";
        
        const imgX = xPct * naturalW;
        const imgY = yPct * naturalH;
        
        magImg.style.left = -(imgX * zoom - lensW / 2) + "px";
        magImg.style.top = -(imgY * zoom - lensH / 2) + "px";
      }
    });
    
    mainWrap.addEventListener("mouseleave", () => {
      magEl.style.display = "none";
    });
    
    window.addEventListener('resize', () => {
      if (magEl.style.display === 'block') {
        updateMagnifierSize();
      }
    });
  }

  function initializeViewerGallery(product) {
    let currentImgIdx = 0;
    const mainImg = document.getElementById('viewer-gallery-main-img');
    const thumbsWrap = document.getElementById('viewer-gallery-thumbs');
    
    function buildThumbs() {
      thumbsWrap.innerHTML = product.images.map((src, i) => `
        <img class="pdp-gallery__thumb${i === currentImgIdx ? " active" : ""}" src="${src}" alt="View ${i+1}" data-idx="${i}">
      `).join("");
      
      thumbsWrap.querySelectorAll(".pdp-gallery__thumb").forEach(img => {
        img.addEventListener("click", () => {
          currentImgIdx = +img.dataset.idx;
          mainImg.src = product.images[currentImgIdx];
          // Update magnifier high-res
          let highSrc = product.images[currentImgIdx];
          if (highSrc.includes('w=800')) highSrc = highSrc.replace('w=800', 'w=1600');
          document.getElementById('viewer-magnifier-img').src = highSrc;
          buildThumbs();
        });
      });
    }
    
    buildThumbs();
  }

  function initializeViewerVariants(product) {
    if (!product.variants || product.variants.length === 0) return;
    
    let selectedVariant = product.variants[0].id;
    const variantsEl = document.getElementById('viewer-pdp-variants');
    const priceEl = document.getElementById('viewer-pdp-price');
    const mainImg = document.getElementById('viewer-gallery-main-img');
    const magImg = document.getElementById('viewer-magnifier-img');
    
    variantsEl.innerHTML = product.variants.map(v => `
      <button class="pdp-variant-btn${v.id === selectedVariant ? " active" : ""}" data-vid="${v.id}">${v.label}</button>
    `).join("");
    
    variantsEl.querySelectorAll(".pdp-variant-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedVariant = btn.dataset.vid;
        variantsEl.querySelectorAll(".pdp-variant-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const v = product.variants.find(v => v.id === selectedVariant);
        if (v) {
          priceEl.textContent = fmt(v.price);
          mainImg.src = v.image;
          let highSrc = v.image;
          if (highSrc.includes('w=800')) highSrc = highSrc.replace('w=800', 'w=1600');
          magImg.src = highSrc;
        }
      });
    });
  }

  function initializeViewerBundle(product) {
    const bundleEl = document.getElementById('viewer-bundle-items');
    if (!bundleEl || !product.bundled.length) return;
    
    bundleEl.innerHTML = product.bundled.map(item => `
      <div class="pdp-bundle-item">
        <img src="${item.image}" alt="${item.name}">
        <div class="pdp-bundle-item__info">
          <div class="pdp-bundle-item__name">${item.name}</div>
          <div class="pdp-bundle-item__price">${fmt(item.price)} · ${item.desc || ""}</div>
        </div>
      </div>
    `).join("");
    
    document.getElementById('viewer-bundle-add-all').addEventListener('click', () => {
      if (typeof Shop !== "undefined") {
        const v = product.variants ? product.variants.find(v => v.id === (product.variants[0]?.id)) : null;
        Shop.addToCart(product, 1, v?.id, null, v?.image || product.image);
        product.bundled.forEach(bundled => {
          Shop.addToCart({ id: bundled.id, name: bundled.name, price: bundled.price, weight: bundled.weight, image: bundled.image, stock: 99 }, 1);
        });
        Shop.toast(`${product.name} + bundle added to cart`);
      } else {
        alert(`${product.name} + bundle added to cart`);
      }
    });
  }

  function initializeViewerRelated(product) {
    const relatedEl = document.getElementById('viewer-related-grid');
    if (!relatedEl || !product.related.length) return;
    
    relatedEl.innerHTML = product.related.map(r => `
      <div class="pdp-related-card">
        <div class="pdp-related-card__img-wrap">
          <img src="${r.image}" alt="${r.name}">
          <div class="pdp-related-card__overlay">
            <button class="pdp-related-card__buy-btn" data-rid="${r.id}" data-rname="${r.name}" data-rprice="${r.price}">BUY NOW</button>
          </div>
        </div>
        <div class="pdp-related-card__info">
          <div class="pdp-related-card__name">${r.name}</div>
          <div class="pdp-related-card__price">${fmt(r.price)}</div>
        </div>
      </div>
    `).join("");
    
    relatedEl.querySelectorAll(".pdp-related-card__buy-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = { 
          id: btn.dataset.rid, 
          name: btn.dataset.rname, 
          price: +btn.dataset.rprice, 
          weight: 1, 
          image: btn.closest('.pdp-related-card')?.querySelector('img')?.src,
          stock: 99 
        };
        if (typeof Shop !== "undefined") {
          Shop.addToCart(item, 1);
          Shop.toast(`${item.name} added to cart`);
        } else {
          alert(`${item.name} added to cart`);
        }
      });
    });
  }

  function initializeViewerCart(product) {
    let qty = 1;
    const qtyVal = document.getElementById('viewer-qty-val');
    const atcBtn = document.getElementById('viewer-atc-btn');
    
    document.getElementById('viewer-qty-minus')?.addEventListener('click', () => {
      if (qty > 1) { qty--; qtyVal.textContent = qty; }
    });
    
    document.getElementById('viewer-qty-plus')?.addEventListener('click', () => {
      const maxStock = product.stock || 99;
      if (qty < maxStock) { qty++; qtyVal.textContent = qty; }
    });
    
    atcBtn?.addEventListener('click', () => {
      const selectedVariantId = product.variants?.[0]?.id || null;
      if (typeof Shop !== "undefined") {
        Shop.addToCart(product, qty, selectedVariantId, null, product.image);
        Shop.toast(`${product.name} added to cart`);
      } else {
        alert(`${product.name} (Qty: ${qty}) added to cart`);
      }
    });
  }

  function openViewer(productId) {
    if (!_overlay) {
      _overlay = createOverlay();
      _overlay.addEventListener('click', (e) => {
        if (e.target === _overlay || e.target.classList.contains('product-viewer-close')) {
          _overlay.classList.remove('active');
          setTimeout(() => { _overlay.style.display = 'none'; }, 300);
          document.body.style.overflow = '';
        }
      });
    }
    
    renderProductInOverlay(productId);
    _overlay.style.display = 'flex';
    setTimeout(() => _overlay.classList.add('active'), 10);
    document.body.style.overflow = 'hidden';
  }

  function init(selector = '.product-viewer-trigger') {
    if (_initialized) return;
    
    document.querySelectorAll(selector).forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const productId = trigger.dataset.productId;
        if (productId && PRODUCTS[productId]) {
          openViewer(productId);
        }
      });
    });
    
    _initialized = true;
  }

  return { init, openViewer, PRODUCTS };
})();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    ProductViewer.init();
  });
}
