/**
 * DORNORI SITE CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Labels and translated text are NOT stored here.
 * They live in lang/en.json, lang/de.json etc.
 *
 * This file contains only structural config:
 * - appearance settings
 * - path configuration (all hardcoded paths centralised here)
 * - storage keys (centralised here)
 * - supported languages loaded from languages.json (see languages_file)
 * - navigation slugs + icons + enabled flags
 * - footer slugs + enabled flags
 * - page file mappings
 * - url_slugs: per-language pretty URL segment for each page slug
 * - socials, formspree, turnstile
 */

const SITE_CONFIG = {
    appearance: {
        icyLemon:           '#F5F29B',
        bgDark:             '#050505',
        bannerStickyOffset: 0.35,
        root_url:           'https://dornori.com',
        // Change to '/' when deployed to root. Must include trailing slash.
        base_path:          '/test/',
    },

    // ─── PATHS ────────────────────────────────────────────────────────────────
    // All filesystem/URL paths centralised here.
    paths: {
        languages_file: 'languages.json',   // relative to base_path
        lang_dir:       'lang/',            // relative to base_path
        content_dir:    'content/',         // relative to base_path
        icons_dir:      'assets/icons/',    // relative to base_path
        shop_dir:       'shop/',            // relative to base_path
        js_dir:         'js/',              // relative to base_path
    },

    // ─── STORAGE KEYS ─────────────────────────────────────────────────────────
    // All localStorage key names centralised here.
    storageKeys: {
        lang:  'dornori-lang',
        theme: 'dornori-theme',
    },

    // ─── SUPPORTED LANGUAGES ──────────────────────────────────────────────────
    // Loaded at runtime from paths.languages_file via initLanguages().
    // First entry = fallback language.
    // Populated by initLanguages() — do not access SITE_CONFIG.languages
    // until initLanguages() has resolved.
    languages: null,

    // ─── LANGUAGE URL SLUGS ──────────────────────────────────────────────────
    // Maps canonical (English) page slugs → per-language URL segments.
    // English slugs are also listed so we have a single source of truth.
    // If a language entry is missing for a slug, falls back to English slug.
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
        },
    },

    // ─── NAVIGATION ──────────────────────────────────────────────────────────
    navigation: [
        { slug: 'about',  icon: 'about-icon-200x200.svg',          type: 'standard', enabled: true  },
        { slug: 'built',  icon: 'assembled-lamp-icon-200x200.svg',  type: 'standard', enabled: true  },
        { slug: 'kit',    icon: 'building-kit-icon-200x200.svg',    type: 'standard', enabled: true  },
        { slug: 'parts',  icon: 'assets/icons/3d-printer-icon-200x200.svg', type: 'standard', enabled: true  },
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
        built:               { file: 'built.html'              },
        kit:                 { file: 'kit.html'                },
        parts:               { file: 'parts.html'              },
        files:               { file: 'files.html'              },
        'mission-statement': { file: 'mission-statement.html'  },
        about:               { file: 'about-us.html'           },
        terms:               { file: 'terms.html'              },
        privacy:             { file: 'privacy.html'            },
        children:            { file: 'children.html'           },
        security:            { file: 'security.html'           },
        cookies:             { file: 'cookies.html'            },
        imprint:             { file: 'imprint.html'            },
        returns:             { file: 'returns.html'            },
        contact:             { file: 'gallery-1.html'          },
        gallery:             { file: 'gallery-1.html'          },
        cart:                { file: 'cart.html'               },
        product:             { file: 'product.html'            },
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
// Fetches languages.json and populates SITE_CONFIG.languages.
// Must be awaited before accessing SITE_CONFIG.languages, SITE_CONFIG.fallbackLang(),
// or SITE_CONFIG.supportedLangCodes().
SITE_CONFIG.initLanguages = async function () {
    if (this.languages) return; // already loaded
    const base = this.appearance.base_path;
    const url  = base + this.paths.languages_file;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
        this.languages = await res.json();
    } catch (err) {
        console.warn('[config] Could not load languages.json, using empty list:', err);
        this.languages = [];
    }
};

// ─── CONVENIENCE HELPERS ──────────────────────────────────────────────────────

// Returns the fallback (first) language code, e.g. 'en'.
SITE_CONFIG.fallbackLang = function () {
    return (this.languages && this.languages[0]?.code) || 'en';
};

// Returns a Set of supported language codes.
SITE_CONFIG.supportedLangCodes = function () {
    return new Set((this.languages || []).map(l => l.code));
};

// Returns the full icon URL for a nav icon filename.
SITE_CONFIG.iconPath = function (iconFilename) {
    return this.appearance.base_path + this.paths.icons_dir + iconFilename;
};

// ─── URL SLUG HELPERS ─────────────────────────────────────────────────────────
// Returns the URL segment for a page in a given language.
// e.g. pageUrlSlug('about', 'nl') → 'over-ons'
SITE_CONFIG.pageUrlSlug = function(slug, lang) {
    const langSlugs = this.url_slugs[lang] || this.url_slugs[this.fallbackLang()];
    return langSlugs[slug] || this.url_slugs[this.fallbackLang()][slug] || slug;
};

// Reverse lookup: given a URL segment and language, return canonical slug.
// e.g. canonicalSlug('over-ons', 'nl') → 'about'
SITE_CONFIG.canonicalSlug = function(urlSegment, lang) {
    const fallback  = this.fallbackLang();
    const langSlugs = this.url_slugs[lang] || this.url_slugs[fallback];
    const entry = Object.entries(langSlugs).find(([, v]) => v === urlSegment);
    if (entry) return entry[0];
    const enEntry = Object.entries(this.url_slugs[fallback]).find(([, v]) => v === urlSegment);
    return enEntry ? enEntry[0] : null;
};

export default SITE_CONFIG;
