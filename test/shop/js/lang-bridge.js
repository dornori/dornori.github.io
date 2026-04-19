/**
 * lang-bridge.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Bridges language preference from the main Dornori site into the shop.
 *
 * HOW IT WORKS:
 *   All localStorage key names come from CONFIG.storageKeys (config.js):
 *     CONFIG.storageKeys.parentLangKey  — key the parent site writes
 *     CONFIG.storageKeys.shopLangKey    — key the shop reads/writes
 *
 *   By default both are "dornori-lang" so there is no mismatch.
 *   To bridge from a different parent key, change parentLangKey in config.js.
 *
 * LOAD ORDER — include AFTER config.js, BEFORE shop.js:
 *   <script src="js/config.js"></script>
 *   <script src="js/lang-bridge.js"></script>
 *   <script src="js/shop.js"></script>
 *
 * NOTE: Supported languages are set by the Shipping module at runtime
 *   (derived from shipping.csv). Lang-bridge runs before modules load,
 *   so it uses CONFIG.supportedLanguages if already set, or falls back
 *   to a safe default list matching available translation files.
 */
(function () {
  var keys      = (typeof CONFIG !== "undefined" && CONFIG.storageKeys) || {};
  var parentKey = keys.parentLangKey || "dornori-lang";
  var shopKey   = keys.shopLangKey   || "dornori-lang";

  // Safe fallback before Shipping module sets CONFIG.supportedLanguages
  var supported = (typeof CONFIG !== "undefined" && CONFIG.supportedLanguages)
    || ["en", "nl", "no", "de"];

  var siteLang = localStorage.getItem(parentKey);

  // Validate the parent-site lang is one the shop supports
  var validLang = (siteLang && supported.indexOf(siteLang) !== -1) ? siteLang : null;

  // Fallback chain: parentLangKey → shopLangKey → CONFIG default → "en"
  var shopSaved = (shopKey !== parentKey) ? localStorage.getItem(shopKey) : null;
  var finalLang = validLang
    || (shopSaved && supported.indexOf(shopSaved) !== -1 ? shopSaved : null)
    || (typeof CONFIG !== "undefined" && CONFIG.defaultLanguage)
    || "en";

  // Write into CONFIG (which shop.js reads via resolveLanguage / loadLang)
  if (typeof CONFIG !== "undefined") {
    CONFIG.language = finalLang;
  }

  // Keep shopLangKey in sync
  localStorage.setItem(shopKey, finalLang);
})();
