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
      // Ensure EUR is always present as fallback
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
    if (!c) return eurAmount; // fallback to raw amount
    return eurAmount * (c.rate + c.buffer);
  }

  function fmt(eurAmount, code = _active) {
    // CRITICAL FIX: If rates aren't loaded yet, return Euro format as fallback
    if (!_loaded || Object.keys(_rates).length === 0) {
      return "€" + eurAmount.toFixed(2);
    }
    
    const c = _rates[code];
    if (!c) {
      // If the requested currency isn't found, fall back to EUR
      const eur = _rates["EUR"];
      if (eur) {
        return eur.symbol + eurAmount.toFixed(eur.decimals);
      }
      return "€" + eurAmount.toFixed(2);
    }
    
    const val = convert(eurAmount, code);
    // Handle symbol that might be HTML entity or raw character
    let symbol = c.symbol;
    // If symbol is HTML entity (like &euro;), decode it
    if (symbol && typeof symbol === 'string' && symbol.includes('&')) {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = symbol;
      symbol = textarea.value;
    }
    return symbol + val.toFixed(c.decimals);
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

  function list() { 
    return Object.entries(_rates).map(([code, c]) => ({ code, ...c })); 
  }
  
  function getActive() { 
    // Return the stored preference even if rates aren't loaded yet
    if (_active) return _active;
    return "EUR";
  }
  
  function getRates()  { return _rates; }
  function isReady()   { return _loaded && _rates[_active] !== undefined; }

  async function init() {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
      try {
        await load();
      } catch (e) {
        console.warn("[Currency] Init failed, using EUR fallback", e);
        // Ensure EUR is always available as fallback
        _rates["EUR"] = { symbol: "€", name: "Euro", rate: 1, buffer: 0, decimals: 2, locale: "de-DE" };
        _loaded = true;
      }
      const key = CONFIG.storageKeys.currencyKey;
      const saved = localStorage.getItem(key);
      let code = "EUR";
      if (saved && _rates[saved]) {
        code = saved;
      } else {
        try {
          code = await detectFromIP();
          if (!_rates[code]) code = "EUR";
        } catch { code = "EUR"; }
      }
      setActive(code);
      return code;
    })();
    return _initPromise;
  }

  // Wait for initialization (useful for modules that depend on Currency)
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
