import { escapeHTML } from '../utils/dom-safe.js';
import ENV_CONFIG from '../env-config.js';

const Currency = (() => {
  let _rates = {}, _loaded = false, _active = 'EUR';

  async function detectFromIP() {
    try {
      if (!window.__geoData) {
        window.__geoData = await fetch(ENV_CONFIG.GEO_API).then(r => r.json());
      }
      const data = window.__geoData;
      if (data.currency && _rates[data.currency]) return data.currency;
    } catch (e) {
      if (ENV_CONFIG.DEBUG) console.warn('[Currency] IP detect failed.', e);
      return 'EUR';
    }
  }

  return {
    async init() { _loaded = true; },
    setActive(code) { _active = code; },
    format(eurAmount, code) {
      if (!_rates[code]) return '€ ' + eurAmount.toFixed(2);
      let symbol = '€';
      if (symbol && symbol.includes('&')) {
        symbol = escapeHTML(symbol);
      }
      return symbol + ' ' + eurAmount.toFixed(2);
    }
  };
})();

export default Currency;
