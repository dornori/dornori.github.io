/**
 * DORNORI SITE CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Labels and translated text are NOT stored here.
 * They live in lang/en.json, lang/de.json etc.
 *
 * This file contains only structural config:
 * - appearance settings
 * - supported languages (code, hreflang, flag — for the UI selector)
 * - URL slug mappings per language (for pretty localized URLs)
 * - navigation slugs + icons + enabled flags
 * - footer slugs + enabled flags
 * - page file mappings
 * - socials, formspree, turnstile
 *
 * TO ADD A LANGUAGE:
 *   1. Add entry to `languages` below
 *   2. Add URL slug mapping for each page in `url_slugs`
 *   3. Create lang/{code}.json
 *   4. Create content/{code}/ and translate HTML files
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

    // Local storage key for language preference
    storageKey: 'dornori-lang',

    // ─── SUPPORTED LANGUAGES ─────────────────────────────────────────────────
    // First entry = fallback language (English).
    // `hreflang` must be a valid BCP-47 tag.
    languages: [
        { code: 'en', hreflang: 'en', label: 'English',    flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch',    flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français',   flag: '🇫🇷' },
    ],
    
    // ─── URL SLUG MAPPINGS (for localized pretty URLs) ───────────────────────
    // Each language gets its own slug for each page.
    // When generating links, use getPageUrl(slug) from i18n.js
    url_slugs: {
        en: {
            about:   'about',
            kit:     'kit',
            built:   'built',
            files:   'files',
            parts:   'parts',
            gallery: 'gallery',
            contact: 'contact',
            terms:   'terms',
            imprint: 'imprint',
            children:'children',
            security:'security',
            cookies: 'cookies',
            returns: 'returns',
            'mission-statement': 'mission-statement',
            'parents-educators': 'parents-educators'
        },
        de: {
            about:   'uber-uns',
            kit:     'bausatz',
            built:   'fertig',
            files:   'dateien',
            parts:   'teile',
            gallery: 'galerie',
            contact: 'kontakt',
            terms:   'agb',
            imprint: 'impressum',
            children:'kinder',
            security:'sicherheit',
            cookies: 'cookies',
            returns: 'widerruf',
            'mission-statement': 'leitbild',
            'parents-educators': 'eltern-lehrer'
        },
        nl: {
            about:   'over-ons',
            kit:     'bouwkit',
            built:   'kant-en-klaar',
            files:   'bestanden',
            parts:   'onderdelen',
            gallery: 'galerij',
            contact: 'contact',
            terms:   'voorwaarden',
            imprint: 'colofon',
            children:'kinderen',
            security:'veiligheid',
            cookies: 'cookies',
            returns: 'retourneren',
            'mission-statement': 'missie',
            'parents-educators': 'ouders-docenten'
        },
        fr: {
            about:   'a-propos',
            kit:     'kit',
            built:   'pret-a-utiliser',
            files:   'fichiers',
            parts:   'pieces',
            gallery: 'galerie',
            contact: 'contact',
            terms:   'conditions',
            imprint: 'mentions-legales',
            children:'enfants',
            security:'securite',
            cookies: 'cookies',
            returns: 'retours',
            'mission-statement': 'mission',
            'parents-educators': 'parents-educateurs'
        }
    },

    // ─── NAVIGATION ──────────────────────────────────────────────────────────
    // `label` and `mobileLabel` are intentionally absent — they come from
    // lang/{code}.json so they update when the language switches.
    navigation: [
        { slug: 'about',  icon: 'assets/icons/about-icon-200x200.svg',   type: 'standard', enabled: true  },
        { slug: 'built',  icon: 'assets/icons/assembled-lamp-icon-200x200.svg', type: 'standard', enabled: true  },
        { slug: 'kit',    icon: 'assets/icons/building-kit-icon-200x200.svg',   type: 'standard', enabled: true  },
        { slug: 'parts',  icon: 'assets/icons/3d-printer-icon-200x200.svg',     type: 'standard', enabled: true  },
        { slug: 'files',  icon: 'assets/icons/3d-file-icon-200x200.svg',        type: 'standard', enabled: true  },
    ],

    // ─── FOOTER ──────────────────────────────────────────────────────────────
    // Column headings and link labels come from lang/{code}.json.
    // `label` here is only the English fallback if JSON hasn't loaded yet.
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
                { slug: 'children', enabled: true  },
                { slug: 'security', enabled: false },
            ]
        }
    ],

    // ─── PAGES ───────────────────────────────────────────────────────────────
    // `file` is the filename within content/{lang}/, e.g. content/en/about-us.html
    // Titles and descriptions come from lang/{code}.json — not stored here.
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
        'parents-educators': { file: 'parents-educators.html'  },
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

export default SITE_CONFIG;
