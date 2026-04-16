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
 * - socials, formspree, turnstile
 *
 * TO ADD A LANGUAGE:
 *   1. Add entry to `languages` below
 *   2. Create lang/{code}.json
 *   3. Create content/{code}/ and translate HTML files
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
 // ─── WEBSITE COLOR PROFILES ─────────────────────────────────────────────────
    // Fallback defined in 'profiles.cc' (cutting-mat)
const PROFILES = [
    { id: 'dark',        label: 'Dark'        },
    { id: 'light',       label: 'Light'       },
    { id: 'cutting-mat', label: 'Cutting Mat' },
],


    
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
                { slug: 'children', enabled: false },
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
