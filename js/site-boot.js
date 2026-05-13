/**
 * site-boot.js
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ONLY FILE YOU EDIT TO MOVE THE SITE.
 * Plain IIFE (not a module) so document.currentScript works and BASE_PATH
 * can be auto-detected from this script's own URL.
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
    'use strict';

    // ── BASE_PATH auto-detection ──────────────────────────────────────────────
    // Works at any deployment path — zero hardcoding in HTML.
    var BASE_PATH = (function() {
        var src = '';
        if (document.currentScript && document.currentScript.src) {
            src = document.currentScript.src;
        } else {
            // Deferred script: find ourselves by filename
            var scripts = document.querySelectorAll('script[src]');
            for (var i = 0; i < scripts.length; i++) {
                if (scripts[i].src.indexOf('/js/site-boot.js') !== -1) {
                    src = scripts[i].src;
                    break;
                }
            }
        }
        // src is absolute: https://example.com/sandbox/js/site-boot.js
        var idx = src.indexOf('/js/site-boot.js');
        if (idx === -1) return '/';
        var abs = src.slice(0, idx + 1);
        var a = document.createElement('a');
        a.href = abs;
        return a.pathname; // e.g. /sandbox/ or /
    })();
    window.__BASE_PATH__ = BASE_PATH;

    // ── Service Worker ────────────────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(BASE_PATH + 'sw.js').catch(function() {});
    }

    // ── Asset injection helpers ───────────────────────────────────────────────
    function injectStyles(hrefs) {
        hrefs.forEach(function (href) {
            var fullHref = BASE_PATH + href;
            if (document.querySelector('link[rel="stylesheet"][href="' + fullHref + '"]')) return;
            var link  = document.createElement('link');
            link.rel  = 'stylesheet';
            link.href = fullHref;
            document.head.appendChild(link);
        });
    }

    function injectPreloads(assets) {
        assets.forEach(function (a) {
            var link  = document.createElement('link');
            link.rel  = 'preload';
            link.href = BASE_PATH + a.href;
            link.as   = a.as;
            if (a.fetchpriority) link.setAttribute('fetchpriority', a.fetchpriority);
            document.head.appendChild(link);
        });
    }

    function injectFavicons() {
        var favicons = [
            { rel: 'icon',             href: 'assets/icons/favicon.ico',         sizes: 'any' },
            { rel: 'apple-touch-icon', href: 'assets/icons/apple-touch-icon.png'              },
            { rel: 'manifest',         href: 'assets/icons/site.webmanifest'                  },
        ];
        favicons.forEach(function (f) {
            var link  = document.createElement('link');
            link.rel  = f.rel;
            link.href = BASE_PATH + f.href;
            if (f.sizes) link.setAttribute('sizes', f.sizes);
            document.head.appendChild(link);
        });
    }

    injectFavicons();

    var SHOP_SLUGS = ['shop','cart','product','kit','parts','success','succes',
        'winkel','winkelwagen','bouwpakket','onderdelen','reserveonderdelen','kant-en-klaar','built'];
    var isShopPage = SHOP_SLUGS.indexOf(window.__PAGE_SLUG__ || '') !== -1;

    var _preloads = [
        { href: 'assets/images/dornori-logo-transparent.webp', as: 'image', fetchpriority: 'high' },
        { href: 'css/main.css',  as: 'style' },
    ];
    if (isShopPage) _preloads.push({ href: 'css/shop.css', as: 'style' });
    injectPreloads(_preloads);

    var _styles = ['css/profiles.css', 'css/main.css'];
    if (isShopPage) { _styles.push('css/shop.css'); _styles.push('css/shop-bridge.css'); }
    injectStyles(_styles);

    // ── Language ──────────────────────────────────────────────────────────────
    var LANG_KEY = 'dornori-lang';
    var lang = localStorage.getItem(LANG_KEY) || 'en';
    if (!window.__PAGE_LANG__) {
        window.__PAGE_LANG__ = lang;
    } else {
        lang = window.__PAGE_LANG__;
    }
    document.documentElement.setAttribute('lang', lang);

    // ── Globals derived from BASE_PATH ────────────────────────────────────────
    window.__CART_URL__ = BASE_PATH + lang + '/cart/';
    window.SHOP_CONFIG = {
        basePath: BASE_PATH,
        dataPath: BASE_PATH + 'data/',
        jsPath:   BASE_PATH + 'js/',
    };
    if (window.__PAGE_SLUG__ === undefined) {
        window.__PAGE_SLUG__ = '';
    }

    // ── Countries cache init from localStorage (FIX #5/#8) ───────────────────
    (function initCountriesCache() {
        try {
            var cached    = localStorage.getItem('dornori-countries-cache');
            var timestamp = localStorage.getItem('dornori-cache-timestamp');
            var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
            if (cached && timestamp && (Date.now() - parseInt(timestamp)) < CACHE_TTL) {
                window.__countriesCache = JSON.parse(cached);
            }
        } catch (e) {}
    })();

    // ── Dependency-aware script loader (FIX #6) ───────────────────────────────
    function loadScriptsWithDeps(scripts) {
        var promises  = {};
        var scriptMap = {};
        scripts.forEach(function(s) { scriptMap[s.id] = s; });

        function load(id) {
            if (promises[id]) return promises[id];
            var script = scriptMap[id];
            if (!script) return Promise.resolve();
            var depPromises = (script.deps || []).map(load);
            promises[id] = Promise.all(depPromises).then(function() {
                return new Promise(function(resolve) {
                    var s    = document.createElement('script');
                    s.src    = BASE_PATH + script.src;
                    if (script.module) s.type = 'module';
                    s.onload  = resolve;
                    s.onerror = function() { console.warn('[site-boot] Failed:', script.src); resolve(); };
                    document.head.appendChild(s);
                });
            });
            return promises[id];
        }
        scripts.forEach(function(s) { load(s.id); });
    }

    // ── Logo src injection ────────────────────────────────────────────────────
    function injectLogoSrc() {
        var logoEl = document.getElementById('banner-img');
        if (logoEl && !logoEl.getAttribute('src')) {
            logoEl.src = BASE_PATH + 'assets/images/dornori-logo-transparent.webp';
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectLogoSrc);
    } else {
        injectLogoSrc();
    }

    // ── Boot sequence ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        loadScriptsWithDeps([
            // Chain: config -> lang-bridge -> shop-init (sequential dependencies)
            { id: 'cfg',  src: 'js/shop-config.js' },
            { id: 'lang', src: 'js/lang-bridge.js', deps: ['cfg'] },
            { id: 'shop', src: 'js/shop-init.js',   deps: ['lang'] },
            // Parallel: independent of shop chain
            { id: 'main', src: 'js/site-main.js', module: true },
            { id: 'geo',  src: 'js/geo-popup.js',  module: true },
        ]);
    });

})();
