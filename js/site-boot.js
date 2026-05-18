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
    var BASE_PATH = (function() {
        var src = '';
        if (document.currentScript && document.currentScript.src) {
            src = document.currentScript.src;
        } else {
            var scripts = document.querySelectorAll('script[src]');
            for (var i = 0; i < scripts.length; i++) {
                if (scripts[i].src.indexOf('/js/site-boot.js') !== -1 ||
                    scripts[i].src.indexOf('/site-boot.js') !== -1) {
                    src = scripts[i].src;
                    break;
                }
            }
        }
        var idx = src.indexOf('/js/site-boot.js');
        if (idx === -1) return '/';
        var abs = src.slice(0, idx + 1);
        var a = document.createElement('a');
        a.href = abs;
        return a.pathname;
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

    injectPreloads([
        { href: 'assets/images/dornori-logo-transparent.webp', as: 'image', fetchpriority: 'high' },
        { href: 'css/main.css',  as: 'style' },
        { href: 'css/shop.css',  as: 'style' },
    ]);

    injectStyles([
        'css/profiles.css',
        'css/main.css',
        'css/shop.css',
        'css/shop-bridge.css',
        'css/integration.css',
    ]);

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

    // ── Countries cache init from localStorage ────────────────────────────────
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

    // ── Nav skeleton ─────────────────────────────────────────────────────────
    // Renders immediately — replaced by real nav once site-main.js initialises.
    (function injectNavSkeleton() {
        var NAV_ITEMS = 6; // matches SITE_CONFIG.navigation enabled count

        function shimmer(w, h, r) {
            return '<div class="skel-item" style="width:' + w + ';height:' + h + 'px;border-radius:' + (r || 6) + 'px"></div>';
        }

        // Desktop nav skeleton
        var desktopNav = document.querySelector('.top-nav');
        if (desktopNav && !desktopNav.querySelector('.skel-item')) {
            var desktopHTML = '';
            for (var i = 0; i < NAV_ITEMS; i++) {
                desktopHTML += '<div class="skel-nav-item">' +
                    shimmer('32px', 32, 50) +
                    shimmer('48px', 10) +
                '</div>';
            }
            desktopNav.innerHTML = desktopHTML;
        }

        // Mobile nav skeleton
        var mobileNav = document.getElementById('mobile-nav');
        if (mobileNav && !mobileNav.querySelector('.skel-item')) {
            var mobileHTML = '';
            for (var j = 0; j < NAV_ITEMS; j++) {
                mobileHTML += '<div class="skel-mobile-nav-item">' +
                    shimmer('28px', 28, 50) +
                    shimmer('44px', 9) +
                '</div>';
            }
            mobileNav.innerHTML = mobileHTML;
        }

        // Inject skeleton styles once
        if (!document.getElementById('skel-styles')) {
            var s = document.createElement('style');
            s.id  = 'skel-styles';
            s.textContent = [
                '@keyframes skel-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
                '.skel-item{',
                '  background:linear-gradient(90deg,var(--border,rgba(255,255,255,.1)) 25%,rgba(255,255,255,.18) 50%,var(--border,rgba(255,255,255,.1)) 75%);',
                '  background-size:200% 100%;',
                '  animation:skel-shimmer 1.6s ease-in-out infinite;',
                '  flex-shrink:0;',
                '}',
                '.skel-nav-item{display:flex;flex-direction:column;align-items:center;gap:5px;padding:0 8px;}',
                '.skel-mobile-nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 10px;}',
            ].join('');
            document.head.appendChild(s);
        }
    })();

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

    // ── Dependency-aware script loader ────────────────────────────────────────
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

    // ── Boot sequence ─────────────────────────────────────────────────────────
    // shop-config.js and lang-bridge.js need no DOM — start immediately.
    // shop-init.js only touches the DOM after webshop:ready fires internally.
    // site-main.js and geo-popup.js handle their own DOM readiness.
    loadScriptsWithDeps([
        { id: 'cfg',  src: 'js/shop-config.js' },
        { id: 'lang', src: 'js/lang-bridge.js', deps: ['cfg'] },
        { id: 'shop', src: 'js/shop-init.js',   deps: ['lang'] },
        { id: 'main', src: 'js/site-main.js',   module: true },
        { id: 'geo',  src: 'js/geo-popup.js',   module: true },
    ]);

})();
