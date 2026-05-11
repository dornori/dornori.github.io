/* =========================================================
   WEBSHOP CONFIG  –  shop-config.js  (v5 - plain script)
   =========================================================
   RULES FOR THIS FILE:
   · Loaded as a plain (non-module) script by site-boot.js.
   · No import/export statements.
   · All logic (Currency, Shipping, Payment modules) lives
     in their own .js files under js/modules/.
   · Supported languages are derived at runtime from the
     shipping.json country list (see js/modules/shipping.js).
   ========================================================= */

const CONFIG = {

  /* ── Shop identity ─────────────────────────────────── */
  shopName: "Dornori",
  tagline:  "Curated lighting for modern spaces",

  /* ── Base currency (always EUR internally) ─────────── */
  baseCurrency: "EUR",

  /* ── FIX: currencyCode was missing; shop.js line 890 uses it. */
  currencyCode: "EUR",

  /* ── Language defaults ─────────────────────────────── */
  defaultLanguage: "en",

  /* ── FIX: supportedLanguages was missing; shop.js uses it.
   * Bootstrap fallback — Shipping module overwrites at runtime. */
  supportedLanguages: ["en", "nl", "de", "fr", "es", "it", "pt", "cs"],

  /* ── FIX: basePath was missing; shop.js reads CONFIG.basePath. */
  basePath: window.__BASE_PATH__ || '/',

  /* ── localStorage key names ────────────────────────── */
  storageKeys: {
    parentLangKey:  "dornori-lang",
    shopLangKey:    "dornori-lang",
    currencyKey:    "webshop_currency",
    cartKey:        "webshop_cart",
  },

  /* ── Feature flags ─────────────────────────────────── */
  features: {
    showLanguageSwitcher: false,
    showCurrencySelector: true,
  },

  /* ── Image naming convention ─────────────────────────*/
  images: {
    imageExt: "webp",
    imageDir: "images/products/",
  },

  /* ── Tax ───────────────────────────────────────────── */
  taxRate:            0.21,
  taxLabel:           "VAT (21%)",
  taxExemptCountries: [],
  businessVatExempt:  false,

  /* ── Shipping defaults ─────────────────────────────── */
  shipping: {
    freeThreshold: 150,
    base:          8.50,
    perKg:         1.20,
    maxFreeWeight: 20,
    estimatedDays: "3–5",
  },

  /* ── Data file paths ───────────────────────────────── */
  data: {
    shippingJson:    "data/shipping.json",
    langDir:         "lang/",
    productsJson:    "data/products.json",
  },

  /* ── Modules to load ───────────────────────────────── */
  modules: [
    "js/modules/currency.js",
    "js/modules/shipping.js",
    "js/modules/payment.js",
  ],

  /* ── Payment ───────────────────────────────────────── */
  payment: {
    activeProcessor: "paypal",

    paypal: {
      clientId:  "",
      currency:  "EUR",
      intent:    "capture",
      returnPath: "/success.html",
      cancelPath: "/cart.html",
    },

    stripe: {
      publishableKey:  "pk_test_SAMPLE_STRIPE_PUBLISHABLE_KEY",
      currency:        "eur",
      intentEndpoint:  "",
      returnPath:      "/success.html",
      cancelPath:      "/cart.html",
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

  /* ── Email queue ───────────────────────────────────── */
  queue: {
    endpoint: (typeof globalThis !== 'undefined' && globalThis.__ENV_API_ENDPOINT__)
              || 'https://edge-form-handler-api.dornori-info.workers.dev',
  },

  /* ── Bot protection (Cloudflare Turnstile) ─────────── */
  turnstile: {
    sitekey: (typeof globalThis !== 'undefined' && globalThis.__ENV_TURNSTILE_KEY__)
             || '0x4AAAAAACxsga5y-bJ_qkzC',
  },

};

/* ── Queue sender (available globally to shop.js and cart pages) ─────────── */
async function sendToQueue(category, data, isTest = false) {
  const payload = { category, ...data };
  if (isTest) payload.test = true;
  const response = await fetch(CONFIG.queue.endpoint, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  await response.text();
  return response.ok;
}

window.CONFIG      = CONFIG;
window.sendToQueue = sendToQueue;
