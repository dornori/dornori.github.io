/**
 * shipping.js — Shipping module (v2 - FIXED)
 *
 * FIX: The original module exposed only populateCountrySelect().
 *      shop.js line 186 calls Shipping.getRate(countryCode) which did not exist,
 *      so every calculateTotals() call with a country code threw a TypeError.
 *
 * FIX: countries[] array was empty — populateCountrySelect() rendered no options.
 *      Now loaded from shipping.json via init().
 *
 * FIX: CONFIG.supportedLanguages is populated here from shipping.json active countries.
 */

import { setTextContent } from '../utils/dom-safe.js';

const Shipping = (() => {
  // Defaults from CONFIG.shipping (set in shop-config.js) — used as fallback
  // if shipping.json cannot be fetched or a country has no specific rate.
  function _defaults() {
    const s = (typeof CONFIG !== 'undefined' && CONFIG.shipping) || {};
    return {
      base:           s.base          ?? 8.50,
      perKg:          s.perKg         ?? 1.20,
      freeThreshold:  s.freeThreshold ?? 150,
      maxFreeWeight:  s.maxFreeWeight ?? 20,
      estimatedDays:  s.estimatedDays ?? '3–5',
    };
  }

  let _settings = null;   // parsed shipping.json settings (key/value map)
  let _rates    = [];     // parsed shipping.json country_rates array
  let _countries = [];    // [{ code, name, language, ... }] from shipping.json
  let _loaded   = false;

  /**
   * Parse the flat settings array into a key→value map.
   * shipping.json settings format: [{ key, value, ... }, ...]
   */
  function _parseSettings(arr) {
    const out = {};
    (arr || []).forEach(item => { out[item.key] = item.value; });
    return out;
  }

  /**
   * getRate(countryCode) — called by shop.js calculateTotals().
   * Returns { base, perKg, freeThreshold, estimatedDays } for the given country.
   * Falls back to global defaults if no specific rate is found.
   */
  function getRate(countryCode) {
    const defs = _defaults();
    if (!countryCode || !_loaded) return defs;

    const upper = countryCode.toUpperCase();
    const row   = _rates.find(r => r.country_code === upper);
    if (!row) return defs;

    // shipping.json uses base_eur as the *surcharge on top of* the global base rate
    const globalBase = (_settings && _settings.base_rate != null)
      ? _settings.base_rate
      : defs.base;
    const globalPerKg = (_settings && _settings.per_kg_rate != null)
      ? _settings.per_kg_rate
      : defs.perKg;

    return {
      base:          globalBase + (row.base_eur  ?? 0),
      perKg:         globalPerKg + (row.per_kg_eur ?? 0),
      freeThreshold: row.free_threshold_override ?? ((_settings && _settings.free_threshold) || defs.freeThreshold),
      maxFreeWeight: (_settings && _settings.max_free_weight) || defs.maxFreeWeight,
      estimatedDays: row.estimated_days          ?? defs.estimatedDays,
    };
  }

  function populateCountrySelect(selectEl, placeholderText) {
    if (!selectEl) return;
    placeholderText = placeholderText || 'Select country...';
    selectEl.innerHTML = '';

    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    setTextContent(placeholderOpt, placeholderText);
    selectEl.appendChild(placeholderOpt);

    _countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      setTextContent(opt, c.name);
      selectEl.appendChild(opt);
    });
  }

  return {
    /**
     * init() — load shipping.json; called once by shop-init / modules loader.
     * Also sets CONFIG.supportedLanguages from active shipping countries.
     */
    async init() {
      if (_loaded) return;
      try {
        const src = (typeof CONFIG !== 'undefined' && CONFIG.data && CONFIG.data.shippingJson)
          || 'data/shipping.json';
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        _settings  = _parseSettings(json.settings || []);
        _rates     = json.country_rates || [];
        _countries = _rates.map(r => ({ code: r.country_code, name: r.country_name, language: r.language || null }));

        // FIX: Populate CONFIG.supportedLanguages from active shipping countries
        // so resolveLanguage() in shop.js works with the real supported list.
        if (typeof CONFIG !== 'undefined') {
          const langs = [...new Set(_rates.map(r => r.language).filter(Boolean))];
          if (langs.length) CONFIG.supportedLanguages = langs;

          // Also sync global shipping defaults from the JSON settings
          if (_settings.base_rate        != null) CONFIG.shipping.base          = _settings.base_rate;
          if (_settings.per_kg_rate      != null) CONFIG.shipping.perKg         = _settings.per_kg_rate;
          if (_settings.free_threshold   != null) CONFIG.shipping.freeThreshold = _settings.free_threshold;
          if (_settings.max_free_weight  != null) CONFIG.shipping.maxFreeWeight  = _settings.max_free_weight;
          if (_settings.estimated_days_default != null) CONFIG.shipping.estimatedDays = _settings.estimated_days_default;
        }

        _loaded = true;
      } catch (e) {
        // Silently degrade — CONFIG.shipping fallbacks remain in effect
        _loaded = true;
      }
    },

    getRate,
    populateCountrySelect,
  };
})();

window.Shipping = Shipping;
export default Shipping;
