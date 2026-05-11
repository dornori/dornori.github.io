/* =========================================================
   WEBSHOP CONFIG  –  shop-config.js  (v4 - FIXED)
   =========================================================
   RULES FOR THIS FILE:
   · Human-readable parameters ONLY — no executable code.
   · All logic (Currency, Shipping, Payment modules) lives
     in their own .js files under js/modules/.
   · Supported languages are derived at runtime from the
     shipping.json country list (see js/modules/shipping.js).
   · Supported countries for the shipping form come from
     shipping.json — do NOT maintain a separate list here.
   ========================================================= */

import ENV_CONFIG from './env-config.js';
import { sendToQueue } from './modules/queue-sender.js';

const CONFIG = {

  /* ── Shop identity ─────────────────────────────────── */
  shopName: "Dornori",
  tagline:  "Curated lighting for modern spaces",

  /* ── Base currency (always EUR internally) ─────────── */
  baseCurrency: "EUR",

  /* ── Language defaults ─────────────────────────────── */
  /* Supported languages are auto-derived from shipping.json at runtime.
   * defaultLanguage is the final fallback.
   */
  defaultLanguage: "en",

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

  /* ── Image naming convention ─────────────────────────
   * Format: <imageDir><productId>_<variantId>_<colorSlug>.<imageExt>
   * If variant.image is set in the product JSON, that takes priority.
   */
  images: {
    imageExt: "webp",
    imageDir: "images/products/",
  },

  /* ── Tax ───────────────────────────────────────────── */
  taxRate:            0.21,   /* NL standard rate */
  taxLabel:           "VAT (21%)",
  taxExemptCountries: [],
  businessVatExempt:  false,

  /* ── Shipping defaults ─────────────────────────────── */
  /* These are overridden at runtime by shipping.json values.
   * They serve as safe fallbacks if shipping.json cannot be fetched.
   */
  shipping: {
    freeThreshold: 150,
    base:          8.50,
    perKg:         1.20,
    maxFreeWeight: 20,
    estimatedDays: "3–5",
  },

  /* ── Data file paths ───────────────────────────────── */
  data: {
    shippingJson:  "data/shipping.json",
    langDir:       "lang/",
    productsJson:  "data/products.json",
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
      clientId:   ENV_CONFIG.PAYPAL_CLIENT_ID,
      currency:   "EUR",
      intent:     "capture",
      returnPath: "/success.html",
      cancelPath: "/cart.html",
    },

    stripe: {
      publishableKey:  ENV_CONFIG.STRIPE_KEY,
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
    endpoint: ENV_CONFIG.API_ENDPOINT,
  },

  /* ── Bot protection (Cloudflare Turnstile) ─────────── */
  turnstile: {
    sitekey: ENV_CONFIG.TURNSTILE_KEY,
  },

};

window.CONFIG      = CONFIG;
window.sendToQueue = sendToQueue;

export default CONFIG;
export { sendToQueue };
