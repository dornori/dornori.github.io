/* =========================================================
   WEBSHOP CONFIG  –  shop-config.js  (v5 - plain script)
   =========================================================
   · Loaded as a plain (non-module) script by site-boot.js.
   · No import/export statements.
   · All logic lives in js/modules/.
   ========================================================= */

const CONFIG = {

  shopName: "Dornori",
  tagline:  "Curated lighting for modern spaces",
  baseCurrency: "EUR",
  currencyCode: "EUR",
  defaultLanguage: "en",
  supportedLanguages: ["en", "nl", "de", "fr", "es", "it", "pt", "cs"],
  basePath: window.__BASE_PATH__ || '/',

  storageKeys: {
    parentLangKey: "dornori-lang",
    shopLangKey:   "dornori-lang",
    currencyKey:   "webshop_currency",
    cartKey:       "webshop_cart",
  },

  features: {
    showLanguageSwitcher: false,
    showCurrencySelector: true,
  },

  images: {
    imageExt: "webp",
    imageDir: "images/products/",
  },

  taxRate:            0.21,
  taxLabel:           "VAT (21%)",
  taxExemptCountries: [],
  businessVatExempt:  false,

  shipping: {
    freeThreshold: 150,
    base:          8.50,
    perKg:         1.20,
    maxFreeWeight: 20,
    estimatedDays: "3–5",
  },

  data: {
    shippingJson: "data/shipping.json",
    langDir:      "lang/",
    productsJson: "data/products.json",
  },

  modules: [
    "js/modules/currency.js",
    "js/modules/shipping.js",
    "js/modules/payment.js",
  ],

  payment: {
    activeProcessor: "paypal",
    paypal: {
      clientId:   "",
      currency:   "EUR",
      intent:     "capture",
      returnPath: "/success.html",
      cancelPath: "/cart.html",
    },
    stripe: {
      publishableKey: "pk_test_SAMPLE_STRIPE_PUBLISHABLE_KEY",
      currency:       "eur",
      intentEndpoint: "",
      returnPath:     "/success.html",
      cancelPath:     "/cart.html",
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

  queue: {
    endpoint: (window.__ENV_API_ENDPOINT__) || 'https://edge-form-handler-api.dornori-info.workers.dev',
  },

  turnstile: {
    sitekey: (window.__ENV_TURNSTILE_KEY__) || '0x4AAAAAACxsga5y-bJ_qkzC',
  },

};

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
