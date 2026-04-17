/* =========================================================
   LUMIO CONFIG  –  config.js
   All prices are stored in EUR. Currency conversion and
   buffered rates are handled by the Currency module below.
   ========================================================= */

const CONFIG = {
  shopName: "LUMIO",
  tagline: "Curated lighting for modern spaces",

  /* ── Base currency (all product prices are in EUR) ─────── */
  baseCurrency: "EUR",

  /* ── Active display currency (set by Currency.detect() or user pick) */
  currency: "€",
  currencyCode: "EUR",

  /* ── Language ─────────────────────────────────────────── */
  language: "en",
  defaultLanguage: "en",
  supportedLanguages: ["en", "no", "nl"],

  /* ── Tax ─────────────────────────────────────────────── */
  taxRate: 0.25,
  taxLabel: "VAT (25%)",
  taxExemptCountries: [],
  businessVatExempt: false,

  /* ── Shipping defaults (overridden at runtime by shipping.csv) */
  shipping: {
    freeThreshold: 150,
    base: 8.50,
    perKg: 1.20,
    maxFreeWeight: 20,
    estimatedDays: "3–5",
  },

  /* ── Payment ─────────────────────────────────────────── */
  paypal: {
    clientId: "AZFu2Eo7iRJdQWLDMb-SAMPLE-PAYPAL-CLIENT-ID",
    currency: "EUR",
    returnUrl: window.location ? window.location.origin + "/success.html" : "",
    cancelUrl: window.location ? window.location.origin + "/cart.html" : "",
  },

  formspree: {
    id: "xwvaleqz",
    endpoint: "https://formspree.io/f/xwvaleqz",
  },

  turnstile: {
    sitekey: "0x4AAAAAACxsga5y-bJ_qkzC",
  },
};

/* =========================================================
   CURRENCY MODULE
   Loads currencies.csv, detects from IP, converts EUR→X
   with a configurable buffer so you're not under-priced
   if exchange rates shift before funds settle.
   ========================================================= */
const Currency = (() => {
  let _rates = {};     // { USD: { rate, buffer, symbol, name, decimals, locale }, ... }
  let _active = "EUR";
  let _loaded = false;

  /* ── Parse CSV ────────────────────────────────────────── */
  function parseCSV(text) {
    const lines = text.trim().split("\n").filter(l => l && !l.startsWith("#"));
    const headers = lines[0].split(",").map(h => h.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
  }

  /* ── Load currencies.csv ─────────────────────────────── */
  async function load() {
    if (_loaded) return;
    try {
      const text = await fetch("data/currencies.csv").then(r => r.text());
      const rows = parseCSV(text);
      rows.forEach(row => {
        _rates[row.code] = {
          symbol:   row.symbol,
          name:     row.name,
          rate:     parseFloat(row.rate_to_eur) || 1,
          buffer:   parseFloat(row.buffer) || 0,
          decimals: parseInt(row.decimals, 10),
          locale:   row.locale || "en-US",
        };
      });
      _loaded = true;
    } catch (e) {
      console.warn("[Currency] Could not load currencies.csv — using EUR fallback.", e);
      _rates = {
        EUR: { symbol: "€", name: "Euro", rate: 1, buffer: 0, decimals: 2, locale: "de-DE" },
      };
      _loaded = true;
    }
  }

  /* ── Detect from IP (ipapi.co, free tier) ─────────────── */
  async function detectFromIP() {
    try {
      const data = await fetch("https://ipapi.co/json/").then(r => r.json());
      const code = data.currency;
      if (code && _rates[code]) return code;
    } catch (e) {
      console.warn("[Currency] IP detect failed, defaulting to EUR.");
    }
    return "EUR";
  }

  /* ── Convert EUR amount → active currency ─────────────── */
  function convert(eurAmount, code = _active) {
    const c = _rates[code] || _rates["EUR"];
    // Apply conversion + buffer to protect against rate movement
    return eurAmount * (c.rate + c.buffer);
  }

  /* ── Format a EUR amount in the active display currency ── */
  function fmt(eurAmount, code = _active) {
    const c = _rates[code] || _rates["EUR"];
    const val = convert(eurAmount, code);
    if (code === "EUR") {
      return "€" + val.toFixed(c.decimals);
    }
    return c.symbol + val.toFixed(c.decimals);
  }

  /* ── Set active currency + sync CONFIG ─────────────────── */
  function setActive(code) {
    if (!_rates[code]) return;
    _active = code;
    localStorage.setItem("lumio_currency", code);
    const c = _rates[code];
    CONFIG.currency = c.symbol;
    CONFIG.currencyCode = code;
    // Dispatch so any rendered UI can refresh
    document.dispatchEvent(new CustomEvent("currency:changed", { detail: { code } }));
  }

  /* ── Get list of all available currencies ──────────────── */
  function list() {
    return Object.entries(_rates).map(([code, c]) => ({ code, ...c }));
  }

  /* ── Init: load → detect → set ─────────────────────────── */
  async function init() {
    await load();
    const saved = localStorage.getItem("lumio_currency");
    const code = saved && _rates[saved] ? saved : await detectFromIP();
    setActive(code);
    return code;
  }

  function getActive() { return _active; }
  function getRates()  { return _rates; }

  return { load, init, detect: detectFromIP, convert, fmt, setActive, getActive, list, getRates };
})();

/* =========================================================
   SHIPPING MODULE
   Loads shipping.csv and resolves per-country rates.
   ========================================================= */
const Shipping = (() => {
  let _settings = {};
  let _countries = {};
  let _loaded = false;

  function parseCSV(text) {
    const lines = text.trim().split("\n").filter(l => l && !l.startsWith("#") && !l.startsWith("["));
    const headers = lines[0].split(",").map(h => h.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
  }

  async function load() {
    if (_loaded) return;
    try {
      const text = await fetch("data/shipping.csv").then(r => r.text());

      // Split into sections
      const settingsMatch = text.match(/\[settings\]([\s\S]*?)\[country_rates\]/);
      const countriesMatch = text.match(/\[country_rates\]([\s\S]*)/);

      if (settingsMatch) {
        const rows = parseCSV(settingsMatch[1]);
        rows.forEach(r => { _settings[r.key] = r.value; });
        // Sync to CONFIG.shipping
        CONFIG.shipping.base         = parseFloat(_settings.base_rate)       || 8.50;
        CONFIG.shipping.perKg        = parseFloat(_settings.per_kg_rate)     || 1.20;
        CONFIG.shipping.freeThreshold= parseFloat(_settings.free_threshold)  || 150;
        CONFIG.shipping.maxFreeWeight= parseFloat(_settings.max_free_weight) || 20;
        CONFIG.shipping.estimatedDays= _settings.estimated_days_default      || "3–5";
      }

      if (countriesMatch) {
        const rows = parseCSV(countriesMatch[1]);
        rows.forEach(r => { _countries[r.country_code] = r; });
      }

      _loaded = true;
    } catch (e) {
      console.warn("[Shipping] Could not load shipping.csv — using CONFIG defaults.", e);
      _loaded = true;
    }
  }

  /* ── Get rate for a country code ─────────────────────────
   * Returns { base, perKg, freeThreshold, estimatedDays }
   * all in EUR; caller applies currency conversion.
   */
  function getRate(countryCode) {
    const c = _countries[countryCode];
    const globalBase        = CONFIG.shipping.base;
    const globalPerKg       = CONFIG.shipping.perKg;
    const globalFreeThresh  = CONFIG.shipping.freeThreshold;
    const globalDays        = CONFIG.shipping.estimatedDays;

    if (!c) {
      return { base: globalBase, perKg: globalPerKg, freeThreshold: globalFreeThresh, estimatedDays: globalDays };
    }
    return {
      base:          globalBase + (parseFloat(c.base_eur) || 0),
      perKg:         globalPerKg + (parseFloat(c.per_kg_eur) || 0),
      freeThreshold: c.free_threshold_override ? parseFloat(c.free_threshold_override) : globalFreeThresh,
      estimatedDays: c.estimated_days || globalDays,
      zone:          c.zone,
      notes:         c.notes,
    };
  }

  function getCountries() { return _countries; }
  function getSettings()  { return _settings; }

  return { load, getRate, getCountries, getSettings };
})();
