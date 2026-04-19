/* =========================================================
   LUMIO — Currency Module  (js/modules/currency.js)
   =========================================================
   Reads:  CONFIG.data.currenciesCsv
           CONFIG.storageKeys.currencyKey
   Emits:  CustomEvent "currency:changed" { detail: { code } }
   ========================================================= */

const Currency = (() => {
  let _rates  = {};
  let _active = "EUR";
  let _loaded = false;

  function parseCSV(text) {
    const lines = text.trim().split("\n").filter(l => l && !l.startsWith("#"));
    const headers = lines[0].split(",").map(h => h.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim());
      const obj  = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
  }

  async function load() {
    if (_loaded) return;
    try {
      const text = await fetch(CONFIG.data.currenciesCsv).then(r => r.text());
      parseCSV(text).forEach(row => {
        _rates[row.code] = {
          symbol:   row.symbol,
          name:     row.name,
          rate:     parseFloat(row.rate_to_eur) || 1,
          buffer:   parseFloat(row.buffer)      || 0,
          decimals: parseInt(row.decimals, 10),
          locale:   row.locale || "en-US",
        };
      });
      _loaded = true;
    } catch (e) {
      console.warn("[Currency] Could not load currencies.csv — EUR fallback.", e);
      _rates  = { EUR: { symbol: "€", name: "Euro", rate: 1, buffer: 0, decimals: 2, locale: "de-DE" } };
      _loaded = true;
    }
  }

  async function detectFromIP() {
    try {
      const data = await fetch("https://ipapi.co/json/").then(r => r.json());
      if (data.currency && _rates[data.currency]) return data.currency;
    } catch { console.warn("[Currency] IP detect failed."); }
    return "EUR";
  }

  function convert(eurAmount, code = _active) {
    const c = _rates[code] || _rates["EUR"];
    return eurAmount * (c.rate + c.buffer);
  }

  function fmt(eurAmount, code = _active) {
    const c   = _rates[code] || _rates["EUR"];
    const val = convert(eurAmount, code);
    return c.symbol + val.toFixed(c.decimals);
  }

  function setActive(code) {
    if (!_rates[code]) return;
    _active = code;
    localStorage.setItem(CONFIG.storageKeys.currencyKey, code);
    document.dispatchEvent(new CustomEvent("currency:changed", { detail: { code } }));
  }

  function list()      { return Object.entries(_rates).map(([code, c]) => ({ code, ...c })); }
  function getActive() { return _active; }
  function getRates()  { return _rates; }

  async function init() {
    await load();
    const key   = CONFIG.storageKeys.currencyKey;
    const saved = localStorage.getItem(key);
    const code  = (saved && _rates[saved]) ? saved : await detectFromIP();
    setActive(code);
    return code;
  }

  return { load, init, detect: detectFromIP, convert, fmt, setActive, getActive, list, getRates };
})();
