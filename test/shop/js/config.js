const CONFIG = {
  shopName: "LUMIO",
  tagline: "Curated lighting for modern spaces",
  currency: "€",
  currencyCode: "EUR",
  language: "en",
  defaultLanguage: "en",
  supportedLanguages: ["en", "no", "nl"],

  taxRate: 0.25,
  taxLabel: "VAT (25%)",

  shipping: {
    freeThreshold: 150,       // free shipping above this amount
    base: 8.50,               // base shipping cost
    perKg: 1.20,              // per kg rate
    maxFreeWeight: 20,        // max kg for free shipping
    estimatedDays: "3–5",
  },

  paypal: {
    // Replace with your PayPal client ID
    clientId: "AZFu2Eo7iRJdQWLDMb-SAMPLE-PAYPAL-CLIENT-ID",
    currency: "EUR",
    returnUrl: window.location ? window.location.origin + "/success.html" : "",
    cancelUrl: window.location ? window.location.origin + "/cart.html" : "",
  },

  formspree: {
    id: "xwvaleqz",
    endpoint: "https://formspree.io/f/xwvaleqz",
  },

  // Tax-exempt countries (no tax applied)
  taxExemptCountries: [],

  // Business VAT exemption
  businessVatExempt: false,
};