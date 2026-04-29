/* =========================================================
   WEBSHOP — Currency Module  (js/modules/currency.js)
   =========================================================
   Reads:  CONFIG.data.currenciesCsv
           CONFIG.storageKeys.currencyKey
   Emits:  CustomEvent "currency:changed" { detail: { code } }
   ========================================================= */

const Currency = (() => {
  let _rates  = {};
  let _active = "EUR";
  let _loaded = false;
  let _initPromise = null;

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
      const res = await fetch(CONFIG.data.currenciesCsv);
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${CONFIG.data.currenciesCsv}`);
      const text = await res.text();
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
      if (!_rates["EUR"]) {
        _rates["EUR"] = { symbol: "€", name: "Euro", rate: 1, buffer: 0, decimals: 2, locale: "de-DE" };
      }
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
    const c = _rates[code];
    if (!c) return eurAmount;
    return eurAmount * (c.rate + c.buffer);
  }

  function fmt(eurAmount, code = _active) {
    if (!_loaded || Object.keys(_rates).length === 0) {
      return "€\u00A0" + eurAmount.toFixed(2);
    }
    const c = _rates[code];
    if (!c) {
      const eur = _rates["EUR"];
      if (eur) return eur.symbol + "\u00A0" + eurAmount.toFixed(eur.decimals);
      return "€\u00A0" + eurAmount.toFixed(2);
    }
    const val = convert(eurAmount, code);
    let symbol = c.symbol;
    if (symbol && typeof symbol === "string" && symbol.includes("&")) {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = symbol;
      symbol = textarea.value;
    }
    return symbol + "\u00A0" + val.toFixed(c.decimals);
  }

  function setActive(code) {
    if (!_rates[code]) {
      console.warn("[Currency] Unknown currency code:", code, "fallback to EUR");
      code = "EUR";
    }
    _active = code;
    localStorage.setItem(CONFIG.storageKeys.currencyKey, code);
    document.dispatchEvent(new CustomEvent("currency:changed", { detail: { code } }));
  }

  function list()      { return Object.entries(_rates).map(([code, c]) => ({ code, ...c })); }
  function getActive() { return _active; }
  function getRates()  { return _rates; }
  function isReady()   { return _loaded && _rates[_active] !== undefined; }

  async function init() {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
      // Phase 1 — load CSV (local file, fast). Resolves in ~50ms.
      try {
        await load();
      } catch (e) {
        console.warn("[Currency] Init failed, using EUR fallback", e);
        _rates["EUR"] = { symbol: "€", name: "Euro", rate: 1, buffer: 0, decimals: 2, locale: "de-DE" };
        _loaded = true;
      }

      // Phase 2 — pick active currency.
      // Returning visitor: use saved pref instantly (no network).
      // First visit: set EUR now, detect from IP in background and update silently.
      const key   = CONFIG.storageKeys.currencyKey;
      const saved = localStorage.getItem(key);
      if (saved && _rates[saved]) {
        setActive(saved);
      } else {
        setActive("EUR"); // render immediately with EUR
        detectFromIP().then(code => {
          if (code && _rates[code] && code !== _active) {
            setActive(code); // fires currency:changed → selector re-renders automatically
          }
        }).catch(() => {});
      }
      return _active;
    })();
    return _initPromise;
  }

  // Resolves once CSV is loaded and initial currency is set.
  // Does NOT wait for background IP detection — that updates via currency:changed.
  async function waitForReady() {
    await init();
    return isReady();
  }

  return {
    load,
    init,
    waitForReady,
    detect: detectFromIP,
    convert,
    fmt,
    setActive,
    getActive,
    list,
    getRates,
    isReady
  };
})();
