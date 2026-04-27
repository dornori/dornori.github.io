/**
 * DORNORI SITE CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Labels and translated text are NOT stored here.
 * They live in lang/en.json, lang/de.json etc.
 *
 * This file contains only structural config:
 * - appearance settings
 * - supported languages (code, hreflang, flag — for the UI selector)
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
        base_path:          '/test/'
    },

    // ─── SUPPORTED LANGUAGES ─────────────────────────────────────────────────
    // First entry = fallback language (English).
    // `hreflang` must be a valid BCP-47 tag.
    languages: [
        { code: 'en', hreflang: 'en', label: 'English',    flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch',    flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français',   flag: '🇫🇷' },
    ],

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
        { slug: 'about',  icon: 'assets/icons/about-icon-200x200.svg',   type: 'standard', enabled: true  },
        { slug: 'built',  icon: 'assets/icons/assembled-lamp-icon-200x200.svg', type: 'standard', enabled: true  },
        { slug: 'kit',    icon: 'assets/icons/building-kit-icon-200x200.svg',   type: 'standard', enabled: true  },
        { slug: 'parts',  icon: 'assets/icons/3d-printer-icon-200x200.svg',     type: 'standard', enabled: true  },
        { slug: 'files',  icon: 'assets/icons/3d-file-icon-200x200.svg',        type: 'standard', enabled: true  },
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

// ─── URL SLUG HELPERS ─────────────────────────────────────────────────────────
// Returns the URL segment for a page in a given language.
// e.g. pageUrlSlug('about', 'nl') → 'over-ons'
SITE_CONFIG.pageUrlSlug = function(slug, lang) {
    const langSlugs = this.url_slugs[lang] || this.url_slugs['en'];
    return langSlugs[slug] || this.url_slugs['en'][slug] || slug;
};

// Reverse lookup: given a URL segment and language, return canonical slug.
// e.g. canonicalSlug('over-ons', 'nl') → 'about'
SITE_CONFIG.canonicalSlug = function(urlSegment, lang) {
    const langSlugs = this.url_slugs[lang] || this.url_slugs['en'];
    const entry = Object.entries(langSlugs).find(([, v]) => v === urlSegment);
    if (entry) return entry[0];
    // Also try English
    const enEntry = Object.entries(this.url_slugs['en']).find(([, v]) => v === urlSegment);
    return enEntry ? enEntry[0] : null;
};

export default SITE_CONFIG;
