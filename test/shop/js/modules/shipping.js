/* =========================================================
   LUMIO — Shipping Module  (js/modules/shipping.js)
   =========================================================
   Reads:  CONFIG.data.shippingCsv
   Populates:
     · CONFIG.shipping  (overrides defaults from config.js)
     · CONFIG.supportedCountries  — list of ISO codes from CSV
     · CONFIG.supportedLanguages  — derived from country locales,
         deduplicated (e.g. en-US + en-GB + en-CA → "en")
   Emits:  nothing (synchronous data load only)

   Country locale → language mapping:
     Each country row in shipping.csv carries an implicit locale
     that is cross-referenced against currencies.csv.
     For countries not in currencies.csv the fallback is "en".
   ========================================================= */

const Shipping = (() => {
  let _settings  = {};
  let _countries = {};   // keyed by country_code
  let _loaded    = false;

  /* Map ISO country code → base language code.
   * Built from what we know about the shipping destinations.
   * Extend this map if new countries are added to shipping.csv.
   */
  const COUNTRY_LANG = {
    NL: "nl", BE: "nl", // Dutch-speaking (BE also has FR but shop uses nl)
    DE: "de", AT: "de", CH: "de",
    NO: "no",
    SE: "sv", DK: "da", FI: "fi",
    FR: "fr", ES: "es", IT: "it",
    PL: "pl", CZ: "cs", PT: "pt",
    GB: "en", IE: "en",
    US: "en", CA: "en", AU: "en", NZ: "en",
    SG: "en", HK: "en",
    JP: "ja",
  };

  /* Languages the shop actually has translation files for.
   * Derived at load time from COUNTRY_LANG + available files. */
  const AVAILABLE_LANG_FILES = ["en", "no", "nl", "de"];

  function parseCSV(text) {
    const lines = text.trim().split("\n").filter(l => l && !l.startsWith("#") && !l.startsWith("["));
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
      const text           = await fetch(CONFIG.data.shippingCsv).then(r => r.text());
      const settingsMatch  = text.match(/\[settings\]([\s\S]*?)\[country_rates\]/);
      const countriesMatch = text.match(/\[country_rates\]([\s\S]*)/);

      if (settingsMatch) {
        parseCSV(settingsMatch[1]).forEach(r => { _settings[r.key] = r.value; });
        CONFIG.shipping.base          = parseFloat(_settings.base_rate)       || CONFIG.shipping.base;
        CONFIG.shipping.perKg         = parseFloat(_settings.per_kg_rate)     || CONFIG.shipping.perKg;
        CONFIG.shipping.freeThreshold = parseFloat(_settings.free_threshold)  || CONFIG.shipping.freeThreshold;
        CONFIG.shipping.maxFreeWeight = parseFloat(_settings.max_free_weight) || CONFIG.shipping.maxFreeWeight;
        CONFIG.shipping.estimatedDays = _settings.estimated_days_default      || CONFIG.shipping.estimatedDays;
      }

      if (countriesMatch) {
        parseCSV(countriesMatch[1]).forEach(r => { _countries[r.country_code] = r; });
      }

      /* ── Derive supported countries ──────────────────── */
      CONFIG.supportedCountries = Object.values(_countries).map(c => ({
        code: c.country_code,
        name: c.country_name,
        zone: c.zone,
      }));

      /* ── Derive supported languages ──────────────────── */
      /* Take the base language for each shipping country,
       * deduplicate, then filter to only those with actual
       * translation files. "en" is always included.
       */
      const derivedLangs = new Set(["en"]);
      CONFIG.supportedCountries.forEach(c => {
        const lang = COUNTRY_LANG[c.code];
        if (lang && AVAILABLE_LANG_FILES.includes(lang)) derivedLangs.add(lang);
      });
      CONFIG.supportedLanguages = [...derivedLangs];

      _loaded = true;
    } catch (e) {
      console.warn("[Shipping] CSV load failed — CONFIG defaults used.", e);
      CONFIG.supportedCountries = [];
      CONFIG.supportedLanguages = ["en"];
      _loaded = true;
    }
  }

  function getRate(countryCode) {
    const c = _countries[countryCode];
    const { base, perKg, freeThreshold, estimatedDays } = CONFIG.shipping;
    if (!c) return { base, perKg, freeThreshold, estimatedDays };
    return {
      base:          base + (parseFloat(c.base_eur)    || 0),
      perKg:         perKg + (parseFloat(c.per_kg_eur) || 0),
      freeThreshold: c.free_threshold_override ? parseFloat(c.free_threshold_override) : freeThreshold,
      estimatedDays: c.estimated_days || estimatedDays,
      zone:  c.zone,
      notes: c.notes,
    };
  }

  /* Populate a <select> element with country options from the CSV.
   * Call after load() has resolved.
   * @param {HTMLSelectElement} selectEl
   * @param {string} [placeholderText]  translated placeholder
   */
  function populateCountrySelect(selectEl, placeholderText = "Select country…") {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="">${placeholderText}</option>` +
      CONFIG.supportedCountries.map(c =>
        `<option value="${c.code}">${c.name}</option>`
      ).join("");
  }

  return { load, getRate, populateCountrySelect, getCountries: () => _countries, getSettings: () => _settings };
})();
