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

    // ── BOOT CONFIGURATION ─────────────────────────────────────────────────────
    // Centralized paths for easy configuration
    var BOOT_CONFIG = {
        icons: {
            favicon:        'assets/icons/favicon.ico',
            appleTouchIcon: 'assets/icons/apple-touch-icon.png',
            manifest:       'assets/icons/site.webmanifest'
        },
        images: {
            logo:           'assets/images/dornori-logo-transparent.webp'
        },
        styles: {
            profiles:       'css/profiles.css',
            main:           'css/main.css',
            shop:           'css/shop.css',
            shopBridge:     'css/shop-bridge.css',
            integration:    'css/integration.css'
        },
        storage: {
            langKey:        'dornori-lang'
        }
    };

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
            { rel: 'icon',             href: BOOT_CONFIG.icons.favicon,        sizes: 'any' },
            { rel: 'apple-touch-icon', href: BOOT_CONFIG.icons.appleTouchIcon              },
            { rel: 'manifest',         href: BOOT_CONFIG.icons.manifest                    },
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
        { href: BOOT_CONFIG.images.logo,  as: 'image', fetchpriority: 'high' },
        { href: BOOT_CONFIG.styles.main,  as: 'style' },
        { href: BOOT_CONFIG.styles.shop,  as: 'style' },
    ]);

    injectStyles([
        BOOT_CONFIG.styles.profiles,
        BOOT_CONFIG.styles.main,
        BOOT_CONFIG.styles.shop,
        BOOT_CONFIG.styles.shopBridge,
        BOOT_CONFIG.styles.integration,
    ]);

    // ── Language ──────────────────────────────────────────────────────────────
    var LANG_KEY = BOOT_CONFIG.storage.langKey;
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

    // ── Logo src injection ────────────────────────────────────────────────────
    // Called from removeSkeleton() so the fade-in plays as the skeleton lifts.
    function injectLogoSrc() {
        var logoEl = document.getElementById('banner-img');
        if (logoEl && !logoEl.getAttribute('src')) {
            logoEl.src = BASE_PATH + BOOT_CONFIG.images.logo;
        }
    }


    // ── Page skeleton ─────────────────────────────────────────────────────────
    // Home pages get the full hero/stats/cards skeleton.
    // Sub-pages (any PAGE_SLUG that is set and non-empty and not 'home') get a
    // simpler header-bar + content-block skeleton so the shapes don't mismatch.
    // Fades out and removes itself once loadHome() (home) or page:ready (sub) fires.
    (function injectSkeleton() {
        var isSubPage = window.__PAGE_SLUG__ && window.__PAGE_SLUG__ !== '' && window.__PAGE_SLUG__ !== 'home';

        var skel = document.createElement('div');
        skel.id  = 'page-skeleton';

        if (isSubPage) {
            // ── Generic sub-page skeleton ─────────────────────────────────────
            skel.innerHTML = [
                '<div class="sk-header">',
                    '<div class="sk-logo"></div>',
                '</div>',
                '<div class="sk-subpage-wrap">',
                    '<div class="sk-subpage-title"></div>',
                    '<div class="sk-subpage-line sk-subpage-line--wide"></div>',
                    '<div class="sk-subpage-line sk-subpage-line--mid"></div>',
                    '<div class="sk-subpage-line sk-subpage-line--wide"></div>',
                    '<div class="sk-subpage-line sk-subpage-line--narrow"></div>',
                    '<div class="sk-subpage-line sk-subpage-line--wide"></div>',
                    '<div class="sk-subpage-line sk-subpage-line--mid"></div>',
                '</div>',
            ].join('');
        } else {
            // ── Full home skeleton ────────────────────────────────────────────
            skel.innerHTML = [
                // header bar
                '<div class="sk-header">',
                    '<div class="sk-logo"></div>',
                '</div>',
                // hero block (video proportions ~56vw tall)
                '<div class="sk-hero"><div class="sk-hero-inner"></div></div>',
                // stats strip
                '<div class="sk-stats">',
                    '<div class="sk-stat"></div><div class="sk-stat"></div><div class="sk-stat"></div>',
                    '<div class="sk-stat"></div><div class="sk-stat"></div>',
                '</div>',
                // section label + title
                '<div class="sk-section-head">',
                    '<div class="sk-line sk-line--sm"></div>',
                    '<div class="sk-line sk-line--lg"></div>',
                    '<div class="sk-line sk-line--md"></div>',
                '</div>',
                // 3 cards
                '<div class="sk-cards">',
                    '<div class="sk-card"><div class="sk-card-img"></div><div class="sk-card-body"><div class="sk-line sk-line--sm"></div><div class="sk-line sk-line--lg"></div><div class="sk-line sk-line--md"></div></div></div>',
                    '<div class="sk-card"><div class="sk-card-img"></div><div class="sk-card-body"><div class="sk-line sk-line--sm"></div><div class="sk-line sk-line--lg"></div><div class="sk-line sk-line--md"></div></div></div>',
                    '<div class="sk-card"><div class="sk-card-img"></div><div class="sk-card-body"><div class="sk-line sk-line--sm"></div><div class="sk-line sk-line--lg"></div><div class="sk-line sk-line--md"></div></div></div>',
                '</div>',
                // 4 USP blocks
                '<div class="sk-usps">',
                    '<div class="sk-usp"><div class="sk-usp-icon"></div><div class="sk-line sk-line--md"></div><div class="sk-line sk-line--sm"></div></div>',
                    '<div class="sk-usp"><div class="sk-usp-icon"></div><div class="sk-line sk-line--md"></div><div class="sk-line sk-line--sm"></div></div>',
                    '<div class="sk-usp"><div class="sk-usp-icon"></div><div class="sk-line sk-line--md"></div><div class="sk-line sk-line--sm"></div></div>',
                    '<div class="sk-usp"><div class="sk-usp-icon"></div><div class="sk-line sk-line--md"></div><div class="sk-line sk-line--sm"></div></div>',
                '</div>',
                // lifestyle photo strip
                '<div class="sk-photos">',
                    '<div class="sk-photo"></div><div class="sk-photo"></div>',
                    '<div class="sk-photo"></div><div class="sk-photo"></div>',
                '</div>',
            ].join('');
        }

        var style = document.createElement('style');
        style.id  = 'sk-styles';
        style.textContent = [
            '@keyframes sk-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
            '#page-skeleton{',
                'position:fixed;inset:0;z-index:9999;',
                'background:#1a3a2a;',
                'overflow-y:auto;overflow-x:hidden;',
                'opacity:1;transition:opacity 0.4s ease;',
                'padding-bottom:60px;',
            '}',
            '#page-skeleton.sk-fade{opacity:0;pointer-events:none;}',
            '.sk-shimmer{',
                'background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(168,213,181,.18) 50%,rgba(255,255,255,.06) 75%);',
                'background-size:200% 100%;',
                'animation:sk-shimmer 1.8s ease-in-out infinite;',
                'border-radius:6px;',
            '}',
            // header
            '.sk-header{height:60px;background:#112b1e;display:flex;align-items:center;padding:0 clamp(16px,5vw,80px);margin-bottom:24px;}',
            '.sk-logo{width:120px;height:32px;}',
            '.sk-logo{background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(168,213,181,.18) 50%,rgba(255,255,255,.06) 75%);background-size:200% 100%;animation:sk-shimmer 1.8s ease-in-out infinite;border-radius:6px;}',
            // hero
            '.sk-hero{padding:0 clamp(16px,5vw,80px);margin-bottom:2rem;}',
            '.sk-hero-inner{width:100%;aspect-ratio:16/7;border-radius:24px;background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(168,213,181,.18) 50%,rgba(255,255,255,.06) 75%);background-size:200% 100%;animation:sk-shimmer 1.8s ease-in-out infinite;}',
            // stats
            '.sk-stats{display:flex;gap:12px;padding:0 clamp(16px,5vw,80px);margin-bottom:2.5rem;flex-wrap:wrap;}',
            '.sk-stat{flex:1;min-width:80px;height:56px;background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(168,213,181,.18) 50%,rgba(255,255,255,.06) 75%);background-size:200% 100%;animation:sk-shimmer 1.8s ease-in-out infinite;border-radius:8px;}',
            // section head
            '.sk-section-head{padding:0 clamp(16px,5vw,80px);margin-bottom:2rem;display:flex;flex-direction:column;align-items:center;gap:10px;}',
            '.sk-line{height:12px;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(168,213,181,.18) 50%,rgba(255,255,255,.06) 75%);background-size:200% 100%;animation:sk-shimmer 1.8s ease-in-out infinite;}',
            '.sk-line--sm{width:120px;height:10px;}',
            '.sk-line--md{width:220px;}',
            '.sk-line--lg{width:340px;height:18px;}',
            // cards
            '.sk-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:0 clamp(16px,5vw,80px);margin-bottom:2.5rem;}',
            '@media(max-width:700px){.sk-cards{grid-template-columns:1fr;}}',
            '.sk-card{border-radius:16px;overflow:hidden;background:rgba(255,255,255,.04);}',
            '.sk-card-img{aspect-ratio:4/3;background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(168,213,181,.18) 50%,rgba(255,255,255,.06) 75%);background-size:200% 100%;animation:sk-shimmer 1.8s ease-in-out infinite;}',
            '.sk-card-body{padding:16px;display:flex;flex-direction:column;gap:10px;}',
            // usps
            '.sk-usps{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:0 clamp(16px,5vw,80px);margin-bottom:2.5rem;}',
            '@media(max-width:700px){.sk-usps{grid-template-columns:1fr 1fr;}}',
            '.sk-usp{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:20px;background:rgba(255,255,255,.04);border-radius:12px;}',
            '.sk-usp-icon{width:36px;height:36px;border-radius:50%;background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(168,213,181,.18) 50%,rgba(255,255,255,.06) 75%);background-size:200% 100%;animation:sk-shimmer 1.8s ease-in-out infinite;}',
            // photos
            '.sk-photos{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:0 clamp(16px,5vw,80px);}',
            '@media(max-width:700px){.sk-photos{grid-template-columns:1fr 1fr;}}',
            '.sk-photo{aspect-ratio:4/3;border-radius:12px;background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(168,213,181,.18) 50%,rgba(255,255,255,.06) 75%);background-size:200% 100%;animation:sk-shimmer 1.8s ease-in-out infinite;}',
            // sub-page generic skeleton
            '.sk-subpage-wrap{padding:clamp(24px,6vw,80px) clamp(16px,5vw,80px);max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:16px;}',
            '.sk-subpage-title{height:28px;width:55%;border-radius:8px;background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(168,213,181,.18) 50%,rgba(255,255,255,.06) 75%);background-size:200% 100%;animation:sk-shimmer 1.8s ease-in-out infinite;margin-bottom:8px;}',
            '.sk-subpage-line{height:13px;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(168,213,181,.18) 50%,rgba(255,255,255,.06) 75%);background-size:200% 100%;animation:sk-shimmer 1.8s ease-in-out infinite;}',
            '.sk-subpage-line--wide{width:100%;}',
            '.sk-subpage-line--mid{width:72%;}',
            '.sk-subpage-line--narrow{width:45%;}',
        ].join('');

        document.head.appendChild(style);
        document.body ? document.body.appendChild(skel) : document.addEventListener('DOMContentLoaded', function() { document.body.appendChild(skel); });

        // Remove skeleton once real home content is ready
        function removeSkeleton() {
            var el = document.getElementById('page-skeleton');
            if (!el) return;
            injectLogoSrc();
            el.classList.add('sk-fade');
            setTimeout(function() {
                el.remove();
                var st = document.getElementById('sk-styles');
                if (st) st.remove();
            }, 420);
        }

        document.addEventListener('home:ready', removeSkeleton, { once: true });
        document.addEventListener('page:ready', removeSkeleton, { once: true });
        // Fallback: remove after 6s no matter what
        setTimeout(removeSkeleton, 4000);
    })();

    // ── Boot sequence ─────────────────────────────────────────────────────────
    // shop-config.js and lang-bridge.js need no DOM — start immediately.
    // shop-init.js only touches DOM after webshop:ready fires.
    // site-main.js and geo-popup.js handle their own DOM readiness.
    loadScriptsWithDeps([
        { id: 'cfg',  src: 'js/shop-config.js' },
        { id: 'lang', src: 'js/lang-bridge.js', deps: ['cfg'] },
        { id: 'shop', src: 'js/shop-init.js',   deps: ['lang'] },
        { id: 'main', src: 'js/site-main.js',   module: true },
        { id: 'geo',  src: 'js/geo-popup.js',   module: true },
    ]);

})();
