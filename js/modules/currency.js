/* =========================================================
   WEBSHOP — Currency Module  (js/modules/currency.js)
   Reads:  CONFIG.data.countriesJson  (data/countries.json)
   Derives unique currency list from country entries.
   Emits:  CustomEvent "currency:changed" { detail: { code } }
   ========================================================= */

if (typeof window.Currency !== "undefined") { var Currency = window.Currency; } else
var Currency = (() => {
  let _rates       = {};
  let _loaded      = false;
  let _active      = 'EUR';
  let _initPromise = null;

  async function load() {
    if (_loaded) return;
    try {
      // Use shared cache if site-main.js already fetched countries, otherwise fetch
      let countries = window.__countriesCache;
      if (!countries) {
        const res = await fetch(CONFIG.data.countriesJson);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        countries = await res.json();
        window.__countriesCache = countries;
      }

      const seen = new Set();
      countries.forEach(c => {
        if (c.currency && c.currency_symbol && !seen.has(c.currency)) {
          seen.add(c.currency);
          _rates[c.currency] = {
            symbol:   c.currency_symbol,
            name:     c.currency_name     || c.currency,
            rate:     c.currency_rate_to_eur || 1,
            buffer:   0,
            decimals: c.currency_decimals !== undefined ? c.currency_decimals : 2,
            locale:   c.currency_locale   || 'en-US',
          };
        }
      });

      if (!_rates['EUR']) {
        _rates['EUR'] = { symbol: '€', name: 'Euro', rate: 1, buffer: 0, decimals: 2, locale: 'de-DE' };
      }
      _loaded = true;
    } catch (e) {
      console.warn('[Currency] Could not load from countries.json — EUR fallback.', e);
      _rates  = { EUR: { symbol: '€', name: 'Euro', rate: 1, buffer: 0, decimals: 2, locale: 'de-DE' } };
      _loaded = true;
    }
  }

  async function detectFromIP() {
    try {
      if (!window.__geoData) {
        // Shared promise prevents duplicate geo API requests (currency + geo-popup race)
        if (!window.__geoDataPromise) {
          const geoUrl = (typeof ENV_CONFIG !== 'undefined' && ENV_CONFIG.GEO_API) || 'https://ipapi.co/json/';
          window.__geoDataPromise = fetch(geoUrl).then(r => r.json());
        }
        window.__geoData = await window.__geoDataPromise;
      }
      const data = window.__geoData;
      if (data.currency && _rates[data.currency]) return data.currency;
    } catch { console.warn('[Currency] IP detect failed.'); }
    return 'EUR';
  }

  function convert(eurAmount, code = _active) {
    const c = _rates[code];
    if (!c) return eurAmount;
    return eurAmount * (c.rate + (c.buffer || 0));
  }

  function fmt(eurAmount, code = _active) {
    if (!_loaded || !Object.keys(_rates).length) return '€\u00A0' + eurAmount.toFixed(2);
    const c = _rates[code] || _rates['EUR'];
    if (!c) return '€\u00A0' + eurAmount.toFixed(2);
    const val = convert(eurAmount, code);
    let symbol = c.symbol;
    if (symbol && symbol.includes('&')) {
      const ta = document.createElement('textarea');
      ta.innerHTML = symbol;
      symbol = ta.value;
    }
    return symbol + '\u00A0' + val.toFixed(c.decimals);
  }

  function setActive(code) {
    if (!_rates[code]) { console.warn('[Currency] Unknown code:', code); code = 'EUR'; }
    _active = code;
    localStorage.setItem((CONFIG.storageKeys && CONFIG.storageKeys.currencyKey) || "webshop_currency", code);
    document.dispatchEvent(new CustomEvent('currency:changed', { detail: { code } }));
  }

  function list()      { return Object.entries(_rates).map(([code, c]) => ({ code, ...c })); }
  function getActive() { return _active; }
  function getRates()  { return _rates; }
  function isReady()   { return _loaded && !!_rates[_active]; }

  async function init() {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
      await load().catch(e => {
        console.warn('[Currency] Init failed, EUR fallback', e);
        _rates['EUR'] = { symbol: '€', name: 'Euro', rate: 1, buffer: 0, decimals: 2, locale: 'de-DE' };
        _loaded = true;
      });
      const saved = localStorage.getItem((CONFIG.storageKeys && CONFIG.storageKeys.currencyKey) || "webshop_currency");
      if (saved && _rates[saved]) {
        setActive(saved);
      } else {
        setActive('EUR');
        detectFromIP().then(code => {
          if (code && _rates[code] && code !== _active) setActive(code);
        }).catch(() => {});
      }
      return _active;
    })();
    return _initPromise;
  }

  async function waitForReady() { await init(); return isReady(); }

  return { load, init, waitForReady, detect: detectFromIP, convert, fmt, setActive, getActive, list, getRates, isReady };
})();
window.Currency = Currency;
