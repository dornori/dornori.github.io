/**
 * geo-popup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows a one-time language-suggestion popup when the visitor's geo country
 * suggests a language different from the current page language.
 *
 * Integration points (no extra network requests):
 *   • window.__geoData  — set by currency.js detectFromIP() (ipapi.co response)
 *   • window.LANG       — current active language code (set by i18n.js)
 *   • window.setLang()  — existing language switcher (i18n.js)
 *
 * Popup text is fetched from the *suggested* language's lang/*.json file so
 * the visitor is always addressed in their own language.
 *
 * Add to index.html just before </body>:
 *   <script src="/test/js/geo-popup.js"></script>
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'dornori-geo-popup-seen'; // sessionStorage — ask once per tab
  var BASE_PATH   = '/test/';

  // ── Country → suggested language ─────────────────────────────────────────────
  // Only languages the site actually supports (en / de / nl / fr).
  var COUNTRY_LANG = {
    DE: 'de', AT: 'de', CH: 'de',
    NL: 'nl', BE: 'nl',
    FR: 'fr', LU: 'fr',
  };

  // ── Country display names ────────────────────────────────────────────────────
  var COUNTRY_NAMES = {
    DE: 'Deutschland', AT: 'Österreich', CH: 'der Schweiz',
    NL: 'Nederland',   BE: 'België',
    FR: 'France',      LU: 'Luxemburg',
  };

  // Country name in the suggested language (for the message string)
  var COUNTRY_NAMES_LOCALISED = {
    de: { DE: 'Deutschland', AT: 'Österreich', CH: 'der Schweiz', NL: 'den Niederlanden', BE: 'Belgien',    FR: 'Frankreich', LU: 'Luxemburg' },
    nl: { DE: 'Duitsland',   AT: 'Oostenrijk', CH: 'Zwitserland', NL: 'Nederland',        BE: 'België',     FR: 'Frankrijk',  LU: 'Luxemburg' },
    fr: { DE: 'Allemagne',   AT: 'Autriche',   CH: 'Suisse',      NL: 'Pays-Bas',         BE: 'Belgique',   FR: 'France',     LU: 'Luxembourg' },
  };

  // ── Guard ────────────────────────────────────────────────────────────────────
  function shouldShow(suggestedLang) {
    if (!suggestedLang) return false;
    if (suggestedLang === window.LANG) return false;
    try { if (sessionStorage.getItem(STORAGE_KEY)) return false; } catch (e) {}
    if (document.getElementById('geo-lang-popup')) return false;
    return true;
  }

  // ── Styles ───────────────────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────────
  function render(suggestedLang, countryCode, strings) {
    strings = strings || {};
    var names = COUNTRY_NAMES_LOCALISED[suggestedLang] || {};
    var countryName = names[countryCode] || COUNTRY_NAMES[countryCode] || countryCode;

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
      if (typeof window.setLang === 'function') {
        window.setLang(suggestedLang);
      }
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

  // ── Boot ─────────────────────────────────────────────────────────────────────
  function tryInit() {
    var geo = window.__geoData;
    if (!geo || !geo.country_code) return false;
    if (!window.LANG) return false; // i18n not ready yet

    var countryCode   = geo.country_code.toUpperCase();
    var suggestedLang = COUNTRY_LANG[countryCode] || null;

    if (!shouldShow(suggestedLang)) return true; // no popup needed — stop polling

    // Fetch the *suggested* language's JSON so the popup speaks the visitor's language
    fetch(BASE_PATH + 'lang/' + suggestedLang + '.json')
      .then(function (r) { return r.json(); })
      .then(function (t) {
        if (!shouldShow(suggestedLang)) return; // guard: user may have switched in the meantime
        render(suggestedLang, countryCode, t.geoPopup || {});
      })
      .catch(function () {
        render(suggestedLang, countryCode, {});
      });

    return true; // stop polling — fetch is in flight
  }

  function boot() {
    if (tryInit()) return;
    var attempts = 0;
    var timer = setInterval(function () {
      if (tryInit() || ++attempts > 30) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
