/**
 * DORNORI SITE CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for every path, key, and constant used by the site.
 *
 * Language/country data is loaded from data/countries.json at runtime.
 * Records with a `siteLang` field participate in geo-popup suggestions.
 * The site language list is derived from SITE_CONFIG.initCountries().
 *
 * To move the site:  set  appearance.base_path  —  everything else derives.
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
         */
        base_path: '/test/',
    },

    // ─── PATHS ────────────────────────────────────────────────────────────────
    paths: {
        countries_file: 'data/countries.json',
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

    // ─── RUNTIME DATA (populated by initCountries) ────────────────────────────
    countries:  null,   // full countries.json array
    languages:  null,   // unique site languages [{code, hreflang, label, flag}]

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

// ─── COUNTRY / LANGUAGE INIT ──────────────────────────────────────────────────
/**
 * Loads data/countries.json and derives:
 *   SITE_CONFIG.countries  — full array
 *   SITE_CONFIG.languages  — unique site-supported languages
 *   SITE_CONFIG.countryMap — Map<code, record> for O(1) lookup
 */
SITE_CONFIG.initCountries = async function () {
    if (this.countries) return;
    const url = this.appearance.base_path + this.paths.countries_file;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.countries = await res.json();
    } catch (err) {
        console.warn('[config] Could not load countries.json, using built-in fallback:', err);
        this.countries = [
            { code: 'GB', language: 'en', siteLang: 'en', label: 'United Kingdom', flag: '🇬🇧', hreflang: 'en', currency: 'GBP' },
            { code: 'DE', language: 'de', siteLang: 'de', label: 'Deutschland',    flag: '🇩🇪', hreflang: 'de', currency: 'EUR' },
            { code: 'NL', language: 'nl', siteLang: 'nl', label: 'Nederland',      flag: '🇳🇱', hreflang: 'nl', currency: 'EUR' },
            { code: 'FR', language: 'fr', siteLang: 'fr', label: 'France',         flag: '🇫🇷', hreflang: 'fr', currency: 'EUR' },
        ];
    }

    // Build O(1) lookup map
    this.countryMap = new Map(this.countries.map(c => [c.code, c]));

    // Derive unique site languages (records that have a siteLang matching a url_slugs key)
    const seen = new Set();
    const siteLangCodes = new Set(Object.keys(this.url_slugs));
    this.languages = this.countries
        .filter(c => c.siteLang && siteLangCodes.has(c.siteLang) && !seen.has(c.siteLang) && seen.add(c.siteLang))
        .map(c => ({
            code:     c.siteLang,
            hreflang: c.siteLang,
            label:    this._siteLangLabel(c.siteLang),
            flag:     this._siteLangFlag(c.siteLang),
        }));

    // Ensure all url_slugs languages are represented even if no country has siteLang set
    for (const code of siteLangCodes) {
        if (!this.languages.find(l => l.code === code)) {
            this.languages.push({ code, hreflang: code, label: code.toUpperCase(), flag: '' });
        }
    }
};

// Canonical labels/flags for site languages (used only for the language switcher)
SITE_CONFIG._siteLangLabel = function (code) {
    const map = { en: 'English', de: 'Deutsch', nl: 'Nederlands', fr: 'Français' };
    return map[code] || code.toUpperCase();
};
SITE_CONFIG._siteLangFlag = function (code) {
    const map = { en: '🇬🇧', de: '🇩🇪', nl: '🇳🇱', fr: '🇫🇷' };
    return map[code] || '';
};

// ─── BACKWARD COMPAT: initLanguages → initCountries ───────────────────────────
SITE_CONFIG.initLanguages = function () { return this.initCountries(); };

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

/** Returns country record for ISO code, or null. */
SITE_CONFIG.country = function (code) {
    return (this.countryMap && this.countryMap.get(code.toUpperCase())) || null;
};

/** Returns the site language suggested for a given country code, or null. */
SITE_CONFIG.suggestedLangForCountry = function (code) {
    const rec = this.country(code);
    if (!rec || !rec.siteLang) return null;
    if (!this.supportedLangCodes().has(rec.siteLang)) return null;
    return rec.siteLang;
};

/** Returns the country's display name (its own label field). */
SITE_CONFIG.localisedCountryName = function (code) {
    const rec = this.country(code);
    return rec ? rec.label : code;
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

SITE_CONFIG.cartUrl = function (lang) {
    const base     = this.appearance.base_path;
    const fallback = 'en';
    const slug     = (this.url_slugs[lang] || this.url_slugs[fallback])?.cart
                   || this.url_slugs[fallback].cart
                   || 'cart';
    return `${base}${lang}/${slug}/`;
};

SITE_CONFIG.shopUrl = function (subPath) {
    return this.appearance.base_path + this.paths.shop_dir + subPath;
};

export default SITE_CONFIG;
