/**
 * geo-popup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows a one-time language-suggestion popup when the visitor's geo country
 * suggests a site language different from the current page language.
 *
 * All country→language mapping and localised country names are read from
 * SITE_CONFIG (which loads data/countries.json) — no hardcoded tables here.
 *
 * Integration points:
 *   • window.__geoData  — set by currency.js detectFromIP() (ipapi.co)
 *   • window.LANG       — current active language code (set by i18n.js)
 *   • window.setLang()  — existing language switcher (i18n.js)
 *   • window.SITE_CONFIG_READY — Promise resolved after SITE_CONFIG.initCountries()
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'dornori-geo-popup-seen';

  // ── Guard ─────────────────────────────────────────────────────────────────
  function shouldShow(suggestedLang) {
    if (!suggestedLang) return false;
    if (suggestedLang === window.LANG) return false;
    try { if (sessionStorage.getItem(STORAGE_KEY)) return false; } catch (e) {}
    if (document.getElementById('geo-lang-popup')) return false;
    return true;
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('geo-popup-style')) return;
    var s = document.createElement('style');
    s.id = 'geo-popup-style';
    s.textContent = [
      '#geo-lang-popup{',
        'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);',
        'z-index:9999;',
        'display:flex;align-items:flex-start;gap:14px;',
        'background:var(--bg,#fff);color:var(--text,#111);',
        'border:1px solid var(--border,rgba(0,0,0,.15));border-radius:10px;',
        'box-shadow:0 6px 28px rgba(0,0,0,.15);',
        'padding:16px 20px;max-width:440px;width:calc(100vw - 40px);',
        'font-family:var(--font-sans,system-ui,sans-serif);font-size:14px;line-height:1.5;',
        'animation:_gp-in .22s ease;',
      '}',
      '@keyframes _gp-in{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}',
      '#geo-lang-popup .gp-icon{font-size:26px;flex-shrink:0;margin-top:1px}',
      '#geo-lang-popup .gp-body{flex:1;min-width:0}',
      '#geo-lang-popup .gp-msg{margin:0 0 4px;font-weight:500}',
      '#geo-lang-popup .gp-sub{margin:0 0 12px;opacity:.7;font-size:13px}',
      '#geo-lang-popup .gp-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '#geo-lang-popup .gp-btn{',
        'padding:6px 14px;border-radius:6px;border:none;cursor:pointer;',
        'font-size:13px;font-weight:600;letter-spacing:.01em;',
        'font-family:inherit;transition:opacity .15s;',
      '}',
      '#geo-lang-popup .gp-btn:hover{opacity:.8}',
      '#geo-lang-popup .gp-confirm{background:var(--accent,#0057ff);color:#fff}',
      '#geo-lang-popup .gp-dismiss{background:var(--surface-2,#f0f0f0);color:var(--text,#333)}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render(suggestedLang, countryCode, strings) {
    strings = strings || {};
    var SC = window.SITE_CONFIG;
    var countryName = (SC && SC.localisedCountryName)
      ? SC.localisedCountryName(countryCode)
      : countryCode;

    var message    = (strings.message    || 'It looks like you\'re visiting from {country}.').replace('{country}', countryName);
    var suggestion = strings.suggestion  || 'Would you like to switch languages?';
    var confirmTxt = strings.confirm     || 'Switch language';
    var dismissTxt = strings.dismiss     || 'Stay on this page';

    injectStyles();

    var popup = document.createElement('div');
    popup.id = 'geo-lang-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-live', 'polite');
    popup.innerHTML =
      '<span class="gp-icon" aria-hidden="true">🌐</span>' +
      '<div class="gp-body">' +
        '<p class="gp-msg">' + esc(message) + '</p>' +
        '<p class="gp-sub">' + esc(suggestion) + '</p>' +
        '<div class="gp-actions">' +
          '<button class="gp-btn gp-confirm">' + esc(confirmTxt) + '</button>' +
          '<button class="gp-btn gp-dismiss">' + esc(dismissTxt) + '</button>' +
        '</div>' +
      '</div>';

    popup.querySelector('.gp-confirm').addEventListener('click', function () {
      dismiss(popup);
      if (typeof window.setLang === 'function') window.setLang(suggestedLang);
    });
    popup.querySelector('.gp-dismiss').addEventListener('click', function () {
      dismiss(popup);
    });

    document.body.appendChild(popup);
  }

  function dismiss(popup) {
    popup.style.transition = 'opacity .18s,transform .18s';
    popup.style.opacity = '0';
    popup.style.transform = 'translateX(-50%) translateY(8px)';
    setTimeout(function () { if (popup.parentNode) popup.parentNode.removeChild(popup); }, 200);
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function tryInit() {
    var geo = window.__geoData;
    if (!geo || !geo.country_code) return false;
    if (!window.LANG) return false;
    var SC = window.SITE_CONFIG;
    if (!SC || !SC.countries) return false;  // countries not loaded yet

    var countryCode   = geo.country_code.toUpperCase();
    var suggestedLang = SC.suggestedLangForCountry(countryCode);

    if (!shouldShow(suggestedLang)) return true;

    var basePath = (SC.appearance && SC.appearance.base_path) || '/';
    fetch(basePath + 'lang/' + suggestedLang + '.json')
      .then(function (r) { return r.json(); })
      .then(function (t) {
        if (!shouldShow(suggestedLang)) return;
        render(suggestedLang, countryCode, t.geoPopup || {});
      })
      .catch(function () {
        render(suggestedLang, countryCode, {});
      });

    return true;
  }

  function boot() {
    if (tryInit()) return;
    var attempts = 0;
    var timer = setInterval(function () {
      if (tryInit() || ++attempts > 50) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
