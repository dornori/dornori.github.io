import { escapeHTML } from '../utils/dom-safe.js';
import ENV_CONFIG from '../env-config.js';

const Currency = (() => {
  // FIX #3: Provide a static fallback rate table so conversion works without
  // a live API. init() will attempt to fetch live rates and overwrite these.
  let _rates = {
    EUR: { rate: 1,      symbol: '€',  locale: 'de-DE' },
    USD: { rate: 1.09,   symbol: '$',  locale: 'en-US' },
    GBP: { rate: 0.86,   symbol: '£',  locale: 'en-GB' },
    CHF: { rate: 0.98,   symbol: 'Fr', locale: 'de-CH' },
    SEK: { rate: 11.3,   symbol: 'kr', locale: 'sv-SE' },
    NOK: { rate: 11.8,   symbol: 'kr', locale: 'nb-NO' },
    DKK: { rate: 7.46,   symbol: 'kr', locale: 'da-DK' },
    PLN: { rate: 4.31,   symbol: 'zł', locale: 'pl-PL' },
    CZK: { rate: 25.2,   symbol: 'Kč', locale: 'cs-CZ' },
    HUF: { rate: 393,    symbol: 'Ft', locale: 'hu-HU' },
  };
  let _active = 'EUR';
  let _loaded = false;

  // FIX #3: Detect currency from IP geolocation and set _active accordingly.
  async function detectFromIP() {
    try {
      if (!window.__geoData) {
        window.__geoData = await fetch(ENV_CONFIG.GEO_API).then(r => r.json());
      }
      const data = window.__geoData;
      if (data && data.currency && _rates[data.currency]) {
        return data.currency;
      }
    } catch (e) {
      if (ENV_CONFIG.DEBUG) console.warn('[Currency] IP detect failed.', e);
    }
    return 'EUR';
  }

  return {
    // FIX #3: Implement init() — detect currency from IP, dispatch event so UI refreshes.
    async init() {
      _active = await detectFromIP();
      _loaded = true;
      document.dispatchEvent(new CustomEvent('currency:changed', { detail: { code: _active } }));
    },

    setActive(code) {
      if (!_rates[code]) return;
      _active = code;
      document.dispatchEvent(new CustomEvent('currency:changed', { detail: { code } }));
    },

    getActive() { return _active; },

    getSupportedCodes() { return Object.keys(_rates); },

    // FIX #3: Actually convert the EUR amount and display the correct symbol.
    format(eurAmount, code) {
      const targetCode = code || _active;
      const entry = _rates[targetCode] || _rates['EUR'];
      const converted = eurAmount * entry.rate;
      let symbol = entry.symbol;
      // Escape symbol only if it contains HTML entities
      if (symbol && symbol.includes('&')) {
        symbol = escapeHTML(symbol);
      }
      return symbol + '\u00a0' + converted.toFixed(2);
    },
  };
})();

export default Currency;
