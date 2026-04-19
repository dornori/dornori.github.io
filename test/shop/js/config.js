/* =========================================================
   LUMIO CONFIG  –  config.js  (v3)
   =========================================================
   KEY CHANGES v3:
   · CONFIG.userPrefs  — configurable localStorage key names
     (set langKey / currencyKey to match your wider site)
   · CONFIG.features   — toggle UI without touching HTML
   · CONFIG.images     — image naming convention settings
   · CONFIG.payment    — pluggable: "paypal" | "stripe" | "none"
   · Language auto-detected from browser; currency from IP.
   ========================================================= */

const CONFIG = {
  shopName: "Dornori",
  tagline:  "Curated lighting for modern spaces",

  baseCurrency: "EUR",
  currency:     "€",
  currencyCode: "EUR",

  language:           "en",
  defaultLanguage:    "en",
  supportedLanguages: ["en", "no", "nl", "de"],

  /* ── Configurable storage keys ────────────────────────
   * Change to match your wider site's naming convention.
   * e.g. if your site uses "dornori_locale", set langKey to that.
   */
  userPrefs: {
    langKey:     "dornori-lang",      // localStorage key for language preference default - lumio_lang
    currencyKey: "lumio_currency",  // localStorage key for currency preference
  },

  /* ── Feature flags — show/hide UI without editing HTML ──
   * showLanguageSwitcher: false → language buttons are hidden but
   *   language auto-detection (browser/IP/URL) still runs fully.
   * showCurrencySelector: true  → currency dropdown is rendered.
   */
  features: {
    showLanguageSwitcher: false,  // set true to show EN/NO/NL toggle buttons
    showCurrencySelector: true,
  },

  /* ── Image naming convention ──────────────────────────
   * Format: <imageDir><productId>_<variantId>_<colorSlug>.<imageExt>
   * Example: images/products/dornori_star-a_red-blue.webp
   * If variant.image is explicitly set in product JSON, that takes priority.
   */
  images: {
    imageExt: "webp",
    imageDir: "images/products/",
  },

  taxRate:            0.25,
  taxLabel:           "VAT (25%)",
  taxExemptCountries: [],
  businessVatExempt:  false,

  shipping: {
    freeThreshold: 150,
    base:          8.50,
    perKg:         1.20,
    maxFreeWeight: 20,
    estimatedDays: "3–5",
  },

  /* ── Payment ──────────────────────────────────────────
   * activeProcessor: "paypal" | "stripe" | "none"
   * Switch at any time — only the active SDK is loaded.
   */
  payment: {
    activeProcessor: "paypal",

    paypal: {
      clientId:  "AZFu2Eo7iRJdQWLDMb-SAMPLE-PAYPAL-CLIENT-ID",
      currency:  "EUR",
      intent:    "capture",
      returnUrl: window.location ? window.location.origin + "/success.html" : "",
      cancelUrl: window.location ? window.location.origin + "/cart.html"    : "",
    },

    stripe: {
      publishableKey:  "pk_test_SAMPLE_STRIPE_PUBLISHABLE_KEY",
      currency:        "eur",
      intentEndpoint:  "",   // POST endpoint that returns { clientSecret }
      returnUrl:       window.location ? window.location.origin + "/success.html" : "",
      cancelUrl:       window.location ? window.location.origin + "/cart.html"    : "",
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary:    "#c8a96e",
          colorBackground: "#ffffff",
          fontFamily:      "system-ui, sans-serif",
          borderRadius:    "8px",
        },
      },
    },
  },

  formspree: {
    id:       "xwvaleqz",
    endpoint: "https://formspree.io/f/xwvaleqz",
  },

  turnstile: {
    sitekey: "0x4AAAAAACxsga5y-bJ_qkzC",
  },
};

/* =========================================================
   CURRENCY MODULE
   Auto-detects from IP on first visit; uses configurable
   localStorage key (CONFIG.userPrefs.currencyKey).
   ========================================================= */
const Currency = (() => {
  let _rates  = {};
  let _active = "EUR";
  let _loaded = false;

  function parseCSV(text) {
    const lines = text.trim().split("\n").filter(l => l && !l.startsWith("#"));
    const headers = lines[0].split(",").map(h => h.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim());
      const obj  = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
  }

  async function load() {
    if (_loaded) return;
    try {
      const text = await fetch("data/currencies.csv").then(r => r.text());
      parseCSV(text).forEach(row => {
        _rates[row.code] = {
          symbol:   row.symbol,
          name:     row.name,
          rate:     parseFloat(row.rate_to_eur) || 1,
          buffer:   parseFloat(row.buffer)      || 0,
          decimals: parseInt(row.decimals, 10),
          locale:   row.locale || "en-US",
        };
      });
      _loaded = true;
    } catch (e) {
      console.warn("[Currency] Could not load currencies.csv — EUR fallback.", e);
      _rates  = { EUR: { symbol: "€", name: "Euro", rate: 1, buffer: 0, decimals: 2, locale: "de-DE" } };
      _loaded = true;
    }
  }

  async function detectFromIP() {
    try {
      const data = await fetch("https://ipapi.co/json/").then(r => r.json());
      if (data.currency && _rates[data.currency]) return data.currency;
    } catch { console.warn("[Currency] IP detect failed."); }
    return "EUR";
  }

  function convert(eurAmount, code = _active) {
    const c = _rates[code] || _rates["EUR"];
    return eurAmount * (c.rate + c.buffer);
  }

  function fmt(eurAmount, code = _active) {
    const c   = _rates[code] || _rates["EUR"];
    const val = convert(eurAmount, code);
    return c.symbol + val.toFixed(c.decimals);
  }

  function setActive(code) {
    if (!_rates[code]) return;
    _active                 = code;
    localStorage.setItem(CONFIG.userPrefs.currencyKey, code);
    CONFIG.currency         = _rates[code].symbol;
    CONFIG.currencyCode     = code;
    document.dispatchEvent(new CustomEvent("currency:changed", { detail: { code } }));
  }

  function list()      { return Object.entries(_rates).map(([code, c]) => ({ code, ...c })); }
  function getActive() { return _active; }
  function getRates()  { return _rates; }

  async function init() {
    await load();
    const key   = CONFIG.userPrefs.currencyKey;
    const saved = localStorage.getItem(key);
    const code  = (saved && _rates[saved]) ? saved : await detectFromIP();
    setActive(code);
    return code;
  }

  return { load, init, detect: detectFromIP, convert, fmt, setActive, getActive, list, getRates };
})();

/* =========================================================
   SHIPPING MODULE
   ========================================================= */
const Shipping = (() => {
  let _settings  = {};
  let _countries = {};
  let _loaded    = false;

  function parseCSV(text) {
    const lines = text.trim().split("\n").filter(l => l && !l.startsWith("#") && !l.startsWith("["));
    const headers = lines[0].split(",").map(h => h.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim());
      const obj  = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
  }

  async function load() {
    if (_loaded) return;
    try {
      const text           = await fetch("data/shipping.csv").then(r => r.text());
      const settingsMatch  = text.match(/\[settings\]([\s\S]*?)\[country_rates\]/);
      const countriesMatch = text.match(/\[country_rates\]([\s\S]*)/);
      if (settingsMatch) {
        parseCSV(settingsMatch[1]).forEach(r => { _settings[r.key] = r.value; });
        CONFIG.shipping.base          = parseFloat(_settings.base_rate)       || 8.50;
        CONFIG.shipping.perKg         = parseFloat(_settings.per_kg_rate)     || 1.20;
        CONFIG.shipping.freeThreshold = parseFloat(_settings.free_threshold)  || 150;
        CONFIG.shipping.maxFreeWeight = parseFloat(_settings.max_free_weight) || 20;
        CONFIG.shipping.estimatedDays = _settings.estimated_days_default      || "3–5";
      }
      if (countriesMatch) parseCSV(countriesMatch[1]).forEach(r => { _countries[r.country_code] = r; });
      _loaded = true;
    } catch (e) { console.warn("[Shipping] CSV load failed — CONFIG defaults used.", e); _loaded = true; }
  }

  function getRate(countryCode) {
    const c = _countries[countryCode];
    const { base, perKg, freeThreshold, estimatedDays } = CONFIG.shipping;
    if (!c) return { base, perKg, freeThreshold, estimatedDays };
    return {
      base:          base + (parseFloat(c.base_eur)    || 0),
      perKg:         perKg + (parseFloat(c.per_kg_eur) || 0),
      freeThreshold: c.free_threshold_override ? parseFloat(c.free_threshold_override) : freeThreshold,
      estimatedDays: c.estimated_days || estimatedDays,
      zone:  c.zone,
      notes: c.notes,
    };
  }

  return { load, getRate, getCountries: () => _countries, getSettings: () => _settings };
})();

/* =========================================================
   PAYMENT MODULE  (v3 — pluggable PayPal + Stripe)
   =========================================================
   Quick-start:
     // In your boot sequence:
     await Payment.init();

     // On checkout form submit:
     const orderRef = Shop.generateOrderRef();
     const totals   = Shop.calculateTotals(Shop.getCart());
     Payment.render(Shop.getCart(), totals, orderRef, "#payment-mount");

     // Listen for outcome:
     document.addEventListener("payment:success", e => { ... });
     document.addEventListener("payment:cancel",  e => { ... });
     document.addEventListener("payment:error",   e => { ... });

   Switch processor:
     CONFIG.payment.activeProcessor = "stripe"; // then reload or call Payment.switchProcessor("stripe")
   ========================================================= */
const Payment = (() => {
  let _ready = false;

  function _dispatch(event, detail) {
    document.dispatchEvent(new CustomEvent(event, { detail }));
  }

  function _loadScript(src, attrs = {}) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src*="${src.split("?")[0]}"]`)) { resolve(); return; }
      const s = Object.assign(document.createElement("script"), { src, onload: resolve, onerror: () => reject(new Error("Script load failed: " + src)) });
      Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
      document.head.appendChild(s);
    });
  }

  /* ── PayPal adapter ──────────────────────────────────── */
  const _paypal = {
    async init() {
      const { clientId, currency } = CONFIG.payment.paypal;
      await _loadScript(`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=${CONFIG.payment.paypal.intent || "capture"}`);
    },
    async render(cart, totals, orderRef, el) {
      if (!window.paypal) throw new Error("[Payment/PayPal] SDK not loaded");
      el.innerHTML = "";
      const cfg = CONFIG.payment.paypal;
      await window.paypal.Buttons({
        style: { layout: "vertical", color: "black", shape: "rect", label: "pay", height: 48 },
        createOrder: (data, actions) => actions.order.create({
          purchase_units: [{
            reference_id: orderRef,
            description:  `${CONFIG.shopName} – ${orderRef}`,
            amount: {
              currency_code: cfg.currency,
              value:         totals.total.toFixed(2),
              breakdown: {
                item_total: { currency_code: cfg.currency, value: totals.subtotal.toFixed(2) },
                shipping:   { currency_code: cfg.currency, value: totals.shipping.toFixed(2) },
                tax_total:  { currency_code: cfg.currency, value: totals.tax.toFixed(2) },
              },
            },
            items: cart.map(i => ({
              name:       i.name + (i.selectedColor ? ` (${i.selectedColor})` : ""),
              unit_amount:{ currency_code: cfg.currency, value: i.price.toFixed(2) },
              quantity:   String(i.qty),
            })),
          }],
        }),
        onApprove:  async (data, actions) => { const d = await actions.order.capture(); _dispatch("payment:success", { orderRef, processor: "paypal", details: d }); },
        onCancel:   ()    => _dispatch("payment:cancel", { orderRef, processor: "paypal" }),
        onError:    err   => { console.error("[Payment/PayPal]", err); _dispatch("payment:error", { orderRef, processor: "paypal", error: err }); },
      }).render(el);
    },
  };

  /* ── Stripe adapter ──────────────────────────────────── */
  const _stripe = {
    _instance: null,
    _elements: null,
    async init() {
      await _loadScript("https://js.stripe.com/v3/");
      this._instance = window.Stripe(CONFIG.payment.stripe.publishableKey);
    },
    async render(cart, totals, orderRef, el) {
      if (!this._instance) throw new Error("[Payment/Stripe] Not initialized");
      const cfg = CONFIG.payment.stripe;
      let clientSecret;

      if (cfg.intentEndpoint) {
        try {
          const res = await fetch(cfg.intentEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: Math.round(totals.total * 100), currency: cfg.currency, metadata: { orderRef } }),
          });
          ({ clientSecret } = await res.json());
        } catch (e) {
          console.error("[Payment/Stripe] PaymentIntent failed:", e);
          _dispatch("payment:error", { orderRef, processor: "stripe", error: e });
          return;
        }
      } else {
        // No backend configured — show placeholder
        el.innerHTML = `<div style="padding:20px;text-align:center;color:var(--c-text-3);font-size:0.85rem;border:1px dashed var(--c-border);border-radius:var(--radius);">
          Stripe Payment Element<br><small>Set <code>CONFIG.payment.stripe.intentEndpoint</code> to enable.</small>
        </div>`;
        return;
      }

      this._elements = this._instance.elements({ clientSecret, appearance: cfg.appearance });
      el.innerHTML   = `
        <div id="stripe-pe" style="margin-bottom:14px;"></div>
        <button class="lumio-btn lumio-btn--primary lumio-btn--full" id="stripe-pay">Pay Now</button>
        <p id="stripe-err" style="color:#c0392b;font-size:0.82rem;margin-top:8px;display:none;"></p>`;
      this._elements.create("payment").mount("#stripe-pe");

      const btn = el.querySelector("#stripe-pay");
      const err = el.querySelector("#stripe-err");
      btn.addEventListener("click", async () => {
        btn.disabled = true; btn.textContent = "Processing…"; err.style.display = "none";
        const { error } = await this._instance.confirmPayment({
          elements: this._elements,
          confirmParams: { return_url: cfg.returnUrl + "?ref=" + orderRef },
        });
        if (error) {
          err.textContent = error.message; err.style.display = "block";
          btn.disabled = false; btn.textContent = "Pay Now";
          _dispatch("payment:error", { orderRef, processor: "stripe", error });
        }
        // success: Stripe redirects to returnUrl
      });
    },
  };

  const _adapters = { paypal: _paypal, stripe: _stripe, none: { async init(){}, async render(c,t,o,el){ el.innerHTML=""; } } };

  async function init() {
    if (_ready) return;
    const name = CONFIG.payment.activeProcessor || "none";
    if (!_adapters[name]) { console.warn("[Payment] Unknown processor:", name); return; }
    await _adapters[name].init();
    _ready = true;
  }

  async function render(cart, totals, orderRef, mountEl) {
    if (!_ready) await init();
    const el = typeof mountEl === "string" ? document.querySelector(mountEl) : mountEl;
    if (!el) return;
    await _adapters[CONFIG.payment.activeProcessor || "none"].render(cart, totals, orderRef, el);
  }

  async function switchProcessor(name) {
    if (!_adapters[name]) return;
    _ready = false;
    CONFIG.payment.activeProcessor = name;
    await init();
  }

  return { init, render, switchProcessor, getActive: () => CONFIG.payment.activeProcessor, adapters: _adapters };
})();
