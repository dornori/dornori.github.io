/**
 * currency.js — Currency module (v2 - FIXED)
 *
 * FIX: Original module was missing getActive(), isReady(), waitForReady(),
 *      list(), and fmt() — all called by shop.js.
 *      shop.js guards every call with `typeof Currency !== "undefined"` but
 *      then calls the methods unconditionally, so missing methods → TypeError.
 *
 * This implementation keeps only EUR (no live FX feed) which is correct for
 * the current shop config. The selector UI will show a single EUR entry.
 * To add real FX rates: extend _loadRates() to fetch a rates API.
 */

import { escapeHTML } from './utils/dom-safe.js';
import ENV_CONFIG from './env-config.js';

if (typeof window.Currency !== "undefined") { var Currency = window.Currency; } else
var Currency = (() => {
  // Supported currencies. EUR is always present (base currency).
  // Add more entries here if FX support is re-introduced.
  const _currencies = [
    { code: 'EUR', symbol: '€', rate: 1 },
  ];

  let _active = 'EUR';
  let _ready  = false;
  let _readyPromise = null;
  let _resolveReady = null;

  // Create a promise that resolves when init() completes
  _readyPromise = new Promise(resolve => { _resolveReady = resolve; });

  async function detectFromIP() {
    try {
      if (!window.__geoData) {
        const cached = sessionStorage.getItem('dornori-geo');
        if (cached) {
          window.__geoData = JSON.parse(cached);
        } else {
          window.__geoData = await fetch(ENV_CONFIG.GEO_API).then(r => r.json());
          sessionStorage.setItem('dornori-geo', JSON.stringify(window.__geoData));
        }
      }
      const data = window.__geoData;
      if (data && data.currency && _currencies.find(c => c.code === data.currency)) {
        return data.currency;
      }
    } catch (e) {
      if (ENV_CONFIG.DEBUG) console.warn('[Currency] IP detect failed.', e);
    }
    return 'EUR';
  }

  return {
    async init() {
      // Attempt geo-based currency detection; fall back to EUR
      const detected = await detectFromIP();
      _active = detected || 'EUR';
      _ready  = true;
      if (_resolveReady) _resolveReady();
      document.dispatchEvent(new CustomEvent('currency:changed', { detail: { currency: _active } }));
    },

    /** FIX: was missing — shop.js line 238/356 */
    isReady() { return _ready; },

    /** FIX: was missing — shop.js line 355 */
    async waitForReady() { return _readyPromise; },

    /** FIX: was missing — shop.js line 238/356 */
    getActive() { return _active; },

    setActive(code) {
      const found = _currencies.find(c => c.code === code);
      if (!found) return;
      _active = code;
      document.dispatchEvent(new CustomEvent('currency:changed', { detail: { currency: code } }));
    },

    /** FIX: was missing — shop.js line 362 */
    list() { return _currencies; },

    /**
     * FIX: original format() used a different signature; shop.js calls Currency.fmt(eurAmount).
     * Named fmt() to match the call-site; also keep format() as alias.
     */
    fmt(eurAmount) {
      const cur = _currencies.find(c => c.code === _active) || _currencies[0];
      const converted = eurAmount * (cur.rate || 1);
      let symbol = cur.symbol || cur.code;
      // Defensive: escape any HTML entities in symbol
      if (symbol.includes('&')) symbol = escapeHTML(symbol);
      return symbol + converted.toFixed(2);
    },

    format(eurAmount, code) {
      const cur = _currencies.find(c => c.code === (code || _active)) || _currencies[0];
      const converted = eurAmount * (cur.rate || 1);
      let symbol = cur.symbol || cur.code;
      if (symbol.includes('&')) symbol = escapeHTML(symbol);
      return symbol + converted.toFixed(2);
    },
  };
})();

window.Currency = Currency;
export default Currency;
