/**
 * site-boot.js
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ONLY FILE YOU EDIT TO MOVE THE SITE.
 * Set BASE_PATH below — everything else derives from it.
 * Must match SITE_CONFIG.appearance.base_path in js/config.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
    'use strict';

    // Derive BASE_PATH from this script's own URL — zero hardcoding in HTML.
    // Works at any deployment path automatically.
    // With defer, document.currentScript is null — fall back to searching script tags.
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
        // Strip everything from /js/site-boot.js onward
        var idx = src.indexOf('/js/site-boot.js');
        if (idx === -1) return '/';
        var abs = src.slice(0, idx + 1); // e.g. https://example.com/sandbox/
        // Return just the path portion
        var a = document.createElement('a');
        a.href = abs;
        return a.pathname; // e.g. /sandbox/
    })();
    window.__BASE_PATH__ = BASE_PATH;

    // ── Inject all CSS and JS assets using BASE_PATH ──────────────────────────
    function injectStyles(hrefs) {
        hrefs.forEach(function (href) {
            var fullHref = BASE_PATH + href;
            // Skip if already present (e.g. inlined in index.html <head>)
            var existing = document.querySelector('link[rel="stylesheet"][href="' + fullHref + '"]');
            if (existing) return;
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

    function injectScript(src, isModule, onload) {
        var s    = document.createElement('script');
        s.src    = BASE_PATH + src;
        if (isModule) s.type = 'module';
        if (onload)   s.onload = onload;
        document.head.appendChild(s);
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

    // Only inject assets on full shell pages (not content partials)
    var isSitePage = !!document.getElementById('home-view')
                  || !!document.getElementById('appContent')
                  || document.body === null; // injected before body — always run

    injectFavicons();

    injectPreloads([
        { href: 'assets/images/dornori-logo-transparent.webp', as: 'image', fetchpriority: 'high' },
        { href: 'css/main.css',       as: 'style' },
        { href: 'shop/css/shop.css',  as: 'style' },
    ]);

    injectStyles([
        'css/profiles.css',
        'css/main.css',
        'shop/css/shop.css',
        'css/shop-bridge.css',
    ]);

    // ── Language ──────────────────────────────────────────────────────────────
    var LANG_KEY = 'dornori-lang';
    var lang     = localStorage.getItem(LANG_KEY) || 'en';

    if (!window.__PAGE_LANG__) {
        window.__PAGE_LANG__ = lang;
    } else {
        lang = window.__PAGE_LANG__;
    }

    document.documentElement.setAttribute('lang', lang);

    // ── Globals derived from BASE_PATH ────────────────────────────────────────
    window.__CART_URL__ = BASE_PATH + lang + '/cart/';

    window.SHOP_CONFIG = {
        basePath: BASE_PATH + 'shop/',
        dataPath: BASE_PATH + 'data/',
        jsPath:   BASE_PATH + 'shop/js/',
    };

    if (window.__PAGE_SLUG__ === undefined) {
        window.__PAGE_SLUG__ = '';
    }

// ── FIX #5 & #8: Initialize countries cache from localStorage ──────────────
    // Loads countries data from localStorage on boot (no network request!)
    // If not cached or stale, site-main.js will fetch and update
    (function initCountriesCache() {
        try {
            var cached = localStorage.getItem('dornori-countries-cache');
            var timestamp = localStorage.getItem('dornori-cache-timestamp');
            var now = Date.now();
            var CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            if (cached && timestamp && (now - parseInt(timestamp)) < CACHE_TTL) {
                // Cache is valid - use it immediately
                window.__countriesCache = JSON.parse(cached);
            }
        } catch (e) {
            // Gracefully ignore localStorage errors
        }
    })();

    // Wait for DOM so we don't race with inline __PAGE_LANG__ overrides
    document.addEventListener('DOMContentLoaded', function () {
        // FIX #6: Dependency-aware script loading instead of seq()
        // Parallel: independent scripts load together
        // Sequential: scripts with deps wait for their dependencies
        loadScriptsWithDeps([
            // Chain: config -> lang-bridge -> shop-init (must be sequential)
            { id: 'cfg', src: 'shop/js/config.js' },
            { id: 'lang', src: 'shop/js/lang-bridge.js', deps: ['cfg'] },
            { id: 'shop', src: 'js/shop-init.js', deps: ['lang'] },
            // Parallel: these load alongside the chain, independent of it
            { id: 'main', src: 'js/site-main.js', module: true },
            { id: 'geo', src: 'js/geo-popup.js', module: true },
        ]);
    });

    // ── FIX #6: Dependency-aware script loader ──────────────────────────────
    function loadScriptsWithDeps(scripts) {
        var loaded = {};
        var promises = {};
        var scriptMap = {};
        scripts.forEach(function(s) { scriptMap[s.id] = s; });

        function load(id) {
            if (promises[id]) return promises[id];
            var script = scriptMap[id];
            if (!script) return Promise.resolve();

            var depPromises = (script.deps || []).map(load);
            promises[id] = Promise.all(depPromises).then(function() {
                return new Promise(function(resolve) {
                    var s = document.createElement('script');
                    s.src = BASE_PATH + script.src;
                    if (script.module) s.type = 'module';
                    s.onload = resolve;
                    s.onerror = function() {
                        console.warn('[site-boot] Failed to load:', script.src);
                        resolve();
                    };
                    document.head.appendChild(s);
                });
            });
            return promises[id];
        }

        scripts.forEach(function(s) { load(s.id); });
    }

    // ── Logo src ──────────────────────────────────────────────────────────────
    // Shell HTML has <img id="banner-img"> with no src — injected here.
    document.addEventListener('DOMContentLoaded', function () {
        var logoEl = document.getElementById('banner-img');
        if (logoEl && !logoEl.src) {
            logoEl.src = BASE_PATH + 'assets/images/dornori-logo-transparent.webp';
        }
    });

})();