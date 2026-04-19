/* =========================================================
   LUMIO CONFIG  –  config.js  (v4)
   =========================================================
   RULES FOR THIS FILE:
   · Human-readable parameters ONLY — no executable code.
   · All logic (Currency, Shipping, Payment modules) lives
     in their own .js files under js/modules/.
   · Supported languages are derived at runtime from the
     shipping.csv country list (see js/modules/shipping.js).
   · Supported countries for the shipping form come from
     shipping.csv — do NOT maintain a separate list here.
   ========================================================= */

const CONFIG = {

  /* ── Shop identity ─────────────────────────────────── */
  shopName: "Dornori",
  tagline:  "Curated lighting for modern spaces",

  /* ── Base currency (always EUR internally) ─────────── */
  baseCurrency: "EUR",

  /* ── Language defaults ─────────────────────────────── */
  /* Supported languages are auto-derived from shipping.csv:
   * each country's locale → base language code.
   * Multiple countries sharing a language (en-US, en-GB,
   * en-CA) resolve to the single base code ("en").
   * defaultLanguage is the final fallback.
   */
  defaultLanguage: "en",

  /* ── localStorage key names ────────────────────────── */
  /* Change these to match your parent site's conventions.
   * The shop and lang-bridge both read from parentLangKey.
   * The shop writes its own preference to shopLangKey.
   * Both keys default to the same value so single-site
   * setups need no extra configuration.
   */
  storageKeys: {
    parentLangKey:  "dornori-lang",   // key the parent site (Dornori) writes
    shopLangKey:    "dornori-lang",   // key the shop reads/writes for its own pref
    currencyKey:    "lumio_currency", // key for persisted currency preference
    cartKey:        "lumio_cart",     // key for cart data
  },

  /* ── Feature flags ─────────────────────────────────── */
  features: {
    showLanguageSwitcher: false,  // true = show EN/NO/NL/DE toggle buttons
    showCurrencySelector: true,   // true = show currency dropdown
  },

  /* ── Image naming convention ─────────────────────────
   * Format: <imageDir><productId>_<variantId>_<colorSlug>.<imageExt>
   * Example: images/products/dornori_star-a_red-blue.webp
   * If variant.image is set in the product JSON, that takes priority.
   */
  images: {
    imageExt: "webp",
    imageDir: "images/products/",
  },

  /* ── Tax ───────────────────────────────────────────── */
  taxRate:            0.25,
  taxLabel:           "VAT (25%)",
  taxExemptCountries: [],   // ISO 3166-1 alpha-2 codes exempt from VAT
  businessVatExempt:  false,

  /* ── Shipping defaults ─────────────────────────────── */
  /* These are overridden at runtime by shipping.csv values.
   * They serve as safe fallbacks if the CSV cannot be fetched.
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
    shippingCsv:  "data/shipping.csv",
    currenciesCsv: "data/currencies.csv",
    langUiDir:     "data/lang/ui/",
    langProductsDir: "data/lang/products/",
    productsDir:   "data/products/",
  },

  /* ── Modules to load ───────────────────────────────── */
  /* List module script paths in load order.
   * Comment out or remove a line to disable that module.
   * Add new entries to extend with additional processors.
   */
  modules: [
    "js/modules/currency.js",
    "js/modules/shipping.js",
    "js/modules/payment.js",
  ],

  /* ── Payment ───────────────────────────────────────── */
  /* activeProcessor: "paypal" | "stripe" | "none"
   * Only the active processor's SDK is loaded.
   */
  payment: {
    activeProcessor: "paypal",

    paypal: {
      clientId:  "AZFu2Eo7iRJdQWLDMb-SAMPLE-PAYPAL-CLIENT-ID",
      currency:  "EUR",
      intent:    "capture",
      returnPath: "/success.html",
      cancelPath: "/cart.html",
    },

    stripe: {
      publishableKey:  "pk_test_SAMPLE_STRIPE_PUBLISHABLE_KEY",
      currency:        "eur",
      intentEndpoint:  "",   // POST endpoint that returns { clientSecret }
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

  /* ── Form submission (Formspree) ───────────────────── */
  formspree: {
    id:       "xwvaleqz",
    endpoint: "https://formspree.io/f/xwvaleqz",
  },

  /* ── Bot protection (Cloudflare Turnstile) ─────────── */
  turnstile: {
    sitekey: "0x4AAAAAACxsga5y-bJ_qkzC",
  },

};
