/**
 * DORNORI SITE CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Change base_path to '/' for root domain or '/test/' for subfolder.
 * All other files derive paths from this config.
 */

const SITE_CONFIG = {
    appearance: {
        icyLemon:           '#F5F29B',
        bgDark:             '#050505',
        bannerStickyOffset: 0.35,
        root_url:           'https://dornori.com',   // Public URL (no trailing slash)
        base_path:          '/test/',                     // ← CHANGE HERE: '/' or '/test/'
    },

    // Languages – first one is default (English)
    languages: [
        { code: 'en', hreflang: 'en', label: 'English',    flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch',    flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français',   flag: '🇫🇷' },
    ],

    // Navigation (labels come from lang JSON)
    navigation: [
        { slug: 'about',  icon: 'assets/icons/about-icon-200x200.svg',   type: 'standard', enabled: true  },
        { slug: 'built',  icon: 'assets/icons/assembled-lamp-icon-200x200.svg', type: 'standard', enabled: true  },
        { slug: 'kit',    icon: 'assets/icons/building-kit-icon-200x200.svg',   type: 'standard', enabled: true  },
        { slug: 'parts',  icon: 'assets/icons/3d-printer-icon-200x200.svg',     type: 'standard', enabled: true  },
        { slug: 'files',  icon: 'assets/icons/3d-file-icon-200x200.svg',        type: 'standard', enabled: true  },
    ],

    // Footer structure (labels from lang JSON)
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

    // All supported page slugs
    pages: {
        about:               {},
        built:               {},
        kit:                 {},
        parts:               {},
        files:               {},
        'mission-statement': {},
        terms:               {},
        privacy:             {},
        children:            {},
        security:            {},
        cookies:             {},
        imprint:             {},
        returns:             {},
        contact:             {},
        gallery:             {},
    },

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
