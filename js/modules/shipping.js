/* =========================================================
   WEBSHOP — Shipping Module  (js/modules/shipping.js)
   Reads:  CONFIG.data.shippingJson  (data/shipping.json)
   Populates:
     · CONFIG.shipping  (overrides defaults from config.js)
     · CONFIG.supportedCountries  — list of ISO codes
     · CONFIG.supportedLanguages  — derived from country list
   ========================================================= */

import { setTextContent } from '../utils/dom-safe.js';

const Shipping = (() => {
  let _settings  = {};
  let _countries = {};
  let _loaded    = false;

  const COUNTRY_LANG = {
    NL: 'nl', BE: 'nl',
    DE: 'de', AT: 'de', CH: 'de',
    NO: 'no',
    SE: 'sv', DK: 'da', FI: 'fi',
    FR: 'fr', ES: 'es', IT: 'it',
    PL: 'pl', CZ: 'cs', PT: 'pt',
    GB: 'en', IE: 'en',
    US: 'en', CA: 'en', AU: 'en', NZ: 'en',
    SG: 'en', HK: 'en',
    JP: 'ja',
  };

  const AVAILABLE_LANG_FILES = ['en', 'no', 'nl', 'de', 'fr', 'cs', 'es', 'it', 'pt'];

  async function load() {
    if (_loaded) return;
    try {
      const res  = await fetch(CONFIG.data.shippingJson);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // settings is an array of { key, value, ... } rows
      (data.settings || []).forEach(r => { _settings[r.key] = r.value; });
      CONFIG.shipping.base          = parseFloat(_settings.base_rate)       || CONFIG.shipping.base;
      CONFIG.shipping.perKg         = parseFloat(_settings.per_kg_rate)     || CONFIG.shipping.perKg;
      CONFIG.shipping.freeThreshold = parseFloat(_settings.free_threshold)  || CONFIG.shipping.freeThreshold;
      CONFIG.shipping.maxFreeWeight = parseFloat(_settings.max_free_weight) || CONFIG.shipping.maxFreeWeight;
      CONFIG.shipping.estimatedDays = _settings.estimated_days_default      || CONFIG.shipping.estimatedDays;

      // country_rates is an array of { country_code, country_name, zone, ... }
      (data.country_rates || []).forEach(r => { _countries[r.country_code] = r; });

      CONFIG.supportedCountries = Object.values(_countries).map(c => ({
        code: c.country_code,
        name: c.country_name,
        zone: c.zone,
      }));

      const derivedLangs = new Set(['en']);
      CONFIG.supportedCountries.forEach(c => {
        const lang = COUNTRY_LANG[c.code];
        if (lang && AVAILABLE_LANG_FILES.includes(lang)) derivedLangs.add(lang);
      });
      CONFIG.supportedLanguages = [...derivedLangs];

      _loaded = true;
    } catch (e) {
      console.warn('[Shipping] JSON load failed — defaults used.', e);
      CONFIG.supportedCountries = [];
      CONFIG.supportedLanguages = ['en'];
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
      zone:          c.zone,
      notes:         c.notes,
    };
  }

  function populateCountrySelect(selectEl, placeholderText) {
    if (!selectEl) return;
    placeholderText = placeholderText || 'Select country…';
    // Clear existing options
    selectEl.innerHTML = '';
    
    // Add placeholder option
    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    setTextContent(placeholderOpt, placeholderText);
    selectEl.appendChild(placeholderOpt);
    
    // Add country options safely
    CONFIG.supportedCountries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      setTextContent(opt, c.name);
      selectEl.appendChild(opt);
    });
  }

  return { load, getRate, populateCountrySelect, getCountries: () => _countries, getSettings: () => _settings };
})();
