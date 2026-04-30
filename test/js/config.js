/**
 * DORNORI SITE CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS THE SINGLE SOURCE OF TRUTH for every path, key, and constant used
 * by the site and the shop integration.
 *
 * To move the site from /test/ to /:
 *   Set  appearance.base_path  to  '/'
 *   That's it — every other path is derived from it at runtime.
 *
 * Labels and translated text live in lang/en.json, lang/de.json etc.
 * This file contains only structural config.
 */

const SITE_CONFIG = {
    appearance: {
        icyLemon:           '#F5F29B',
        bgDark:             '#050505',
        bannerStickyOffset: 0.35,
        root_url:           'https://dornori.com',
        /**
         * !! CHANGE THIS TO MOVE THE WHOLE SITE !!
         * Must start and end with '/'.
         * Examples:  '/test/'  |  '/'  |  '/lamp/'
         */
        base_path:          '/test/',
    },

    // ─── PATHS ────────────────────────────────────────────────────────────────
    // All filesystem/URL paths relative to base_path.
    // Absolute URLs are built at runtime: base_path + paths.XXX
    paths: {
        languages_file: 'js/languages.json',
        lang_dir:       'lang/',
        content_dir:    'content/',
        icons_dir:      'assets/icons/',
        shop_dir:       'shop/',
        js_dir:         'js/',
    },

    // ─── STORAGE KEYS ─────────────────────────────────────────────────────────
    storageKeys: {
        lang:  'dornori-lang',
        theme: 'dornori-theme',
    },

    // ─── SUPPORTED LANGUAGES ──────────────────────────────────────────────────
    // Loaded at runtime from paths.languages_file via initLanguages().
    languages: null,

    // ─── LANGUAGE URL SLUGS ──────────────────────────────────────────────────
    url_slugs: {
        en: {
            about:               'about',
            built:               'built',
            kit:                 'kit',
            parts:               'parts',
            files:               'files',
            'mission-statement': 'mission-statement',
            terms:               'terms',
            privacy:             'privacy',
            children:            'children',
            security:            'security',
            cookies:             'cookies',
            imprint:             'imprint',
            returns:             'returns',
            contact:             'contact',
            gallery:             'gallery',
            cart:                'cart',
            shop:                'shop',
        },
        nl: {
            about:               'over-ons',
            built:               'kant-en-klaar',
            kit:                 'bouwpakket',
            parts:               'reserveonderdelen',
            files:               '3d-bestanden',
            'mission-statement': 'onze-missie',
            terms:               'gebruiksvoorwaarden',
            privacy:             'privacybeleid',
            children:            'kinderveiligheid',
            security:            'veiligheidscentrum',
            cookies:             'cookiebeleid',
            imprint:             'colofon',
            returns:             'retourbeleid',
            contact:             'contact',
            gallery:             'galerij',
            cart:                'winkelwagen',
            shop:                'winkel',
            product:             'product',
        },
        de: {
            about:               'ueber-uns',
            built:               'fertig-gebaut',
            kit:                 'bausatz',
            parts:               'ersatzteile',
            files:               '3d-dateien',
            'mission-statement': 'unser-auftrag',
            terms:               'nutzungsbedingungen',
            privacy:             'datenschutz',
            children:            'kindersicherheit',
            security:            'sicherheitszentrum',
            cookies:             'cookie-richtlinie',
            imprint:             'impressum',
            returns:             'rueckgabe',
            contact:             'kontakt',
            gallery:             'galerie',
            cart:                'warenkorb',
            shop:                'shop',
        },
        fr: {
            about:               'a-propos',
            built:               'deja-monte',
            kit:                 'kit-de-construction',
            parts:               'pieces-detachees',
            files:               'fichiers-3d',
            'mission-statement': 'notre-mission',
            terms:               'conditions-dutilisation',
            privacy:             'politique-de-confidentialite',
            children:            'securite-enfants',
            security:            'centre-de-securite',
            cookies:             'politique-cookies',
            imprint:             'mentions-legales',
            returns:             'politique-retour',
            contact:             'contact',
            gallery:             'galerie',
            cart:                'panier',
            shop:                'boutique',
        },
    },

    // ─── NAVIGATION ──────────────────────────────────────────────────────────
    navigation: [
        { slug: 'about',  icon: 'about-icon-200x200.svg',          type: 'standard', enabled: true  },
        { slug: 'built',  icon: 'assembled-lamp-icon-200x200.svg',  type: 'standard', enabled: true  },
        { slug: 'kit',    icon: 'building-kit-icon-200x200.svg',    type: 'standard', enabled: true  },
        { slug: 'parts',  icon: '3d-printer-icon-200x200.svg',      type: 'standard', enabled: true  },
        { slug: 'files',  icon: '3d-file-icon-200x200.svg',         type: 'standard', enabled: true  },
    ],

    // ─── FOOTER ──────────────────────────────────────────────────────────────
    footer: [
        {
            label: 'Company',
            links: [
                { slug: 'gallery',  enabled: true  },
                { slug: 'about',    enabled: true  },
                { slug: 'contact',  enabled: true  },
            ]
        },
        {
            label: 'Legal',
            links: [
                { slug: 'terms',    enabled: true  },
                { slug: 'privacy',  enabled: false },
                { slug: 'cookies',  enabled: false },
                { slug: 'imprint',  enabled: true  },
                { slug: 'returns',  enabled: false },
                { slug: 'children', enabled: false },
                { slug: 'security', enabled: false },
            ]
        }
    ],

    // ─── PAGES ───────────────────────────────────────────────────────────────
    pages: {
        built:               { file: 'built.html'             },
        kit:                 { file: 'kit.html'               },
        parts:               { file: 'parts.html'             },
        files:               { file: 'files.html'             },
        'mission-statement': { file: 'mission-statement.html' },
        about:               { file: 'about-us.html'          },
        terms:               { file: 'terms.html'             },
        privacy:             { file: 'privacy.html'           },
        children:            { file: 'children.html'          },
        security:            { file: 'security.html'          },
        cookies:             { file: 'cookies.html'           },
        imprint:             { file: 'imprint.html'           },
        returns:             { file: 'returns.html'           },
        contact:             { file: 'form.html'              },
        gallery:             { file: 'gallery-1.html'         },
        cart:                { file: 'cart.html'              },
        shop:                { file: 'shop.html'              },
        product:             { file: 'product.html'           },
    },

    // ─── SOCIALS ─────────────────────────────────────────────────────────────
    socials: [
        { id: 'ig',  user: 'dornori.info', base: 'https://instagram.com/' },
        { id: 'x',   user: 'dornori_info', base: 'https://x.com/'         },
        { id: 'yt',  user: 'dornori_info', base: 'https://youtube.com/@'  },
        { id: 'fb',  user: 'Dornori.info', base: 'https://facebook.com/'  },
        { id: 'web', user: 'dornori.com',  base: 'https://'               },
    ],

    formspree_id:      'xnjopbbb',
    turnstile_sitekey: '0x4AAAAAACxsga5y-bJ_qkzC',
};

// ─── LANGUAGE INIT ────────────────────────────────────────────────────────────
SITE_CONFIG.initLanguages = async function () {
    if (this.languages) return;
    const base = this.appearance.base_path;
    const url  = base + this.paths.languages_file;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
        this.languages = await res.json();
    } catch (err) {
        console.warn('[config] Could not load languages.json, using built-in fallback:', err);
        this.languages = [
            { code: 'en', hreflang: 'en', label: 'English',    flag: '🇬🇧' },
            { code: 'de', hreflang: 'de', label: 'Deutsch',    flag: '🇩🇪' },
            { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
            { code: 'fr', hreflang: 'fr', label: 'Français',   flag: '🇫🇷' },
        ];
    }
};

// ─── CONVENIENCE HELPERS ──────────────────────────────────────────────────────

SITE_CONFIG.fallbackLang = function () {
    return (this.languages && this.languages[0]?.code) || 'en';
};

SITE_CONFIG.supportedLangCodes = function () {
    return new Set((this.languages || []).map(l => l.code));
};

SITE_CONFIG.iconPath = function (iconFilename) {
    return this.appearance.base_path + this.paths.icons_dir + iconFilename;
};

// ─── URL SLUG HELPERS ─────────────────────────────────────────────────────────
SITE_CONFIG.pageUrlSlug = function (slug, lang) {
    const langSlugs = this.url_slugs[lang] || this.url_slugs[this.fallbackLang()];
    return langSlugs[slug] || this.url_slugs[this.fallbackLang()][slug] || slug;
};

SITE_CONFIG.canonicalSlug = function (urlSegment, lang) {
    const fallback  = this.fallbackLang();
    const langSlugs = this.url_slugs[lang] || this.url_slugs[fallback];
    const entry = Object.entries(langSlugs).find(([, v]) => v === urlSegment);
    if (entry) return entry[0];
    const enEntry = Object.entries(this.url_slugs[fallback]).find(([, v]) => v === urlSegment);
    return enEntry ? enEntry[0] : null;
};

/**
 * Returns the full cart URL for a given language code.
 * Derived entirely from base_path + url_slugs — no hardcoded paths.
 * Safe to call before initLanguages() resolves.
 *
 * e.g. cartUrl('nl') → '/test/nl/winkelwagen/'
 */
SITE_CONFIG.cartUrl = function (lang) {
    const base     = this.appearance.base_path;
    const fallback = 'en';
    const slug     = (this.url_slugs[lang] || this.url_slugs[fallback])?.cart
                   || this.url_slugs[fallback].cart
                   || 'cart';
    return `${base}${lang}/${slug}/`;
};

/**
 * Returns the absolute URL for a shop sub-path.
 * e.g. shopUrl('data/shipping.csv') → '/test/shop/data/shipping.csv'
 */
SITE_CONFIG.shopUrl = function (subPath) {
    return this.appearance.base_path + this.paths.shop_dir + subPath;
};

export default SITE_CONFIG;
