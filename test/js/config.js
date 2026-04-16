/**
 * DORNORI SITE CONFIGURATION
 * Only structure and defaults here.
 * Translated text and per-language slugs go in lang/*.json
 */

const SITE_CONFIG = {
    appearance: {
        root_url:  'https://dornori.com',
        base_path: '/test/',           // ← Change this when needed. Must end with '/'
    },

    // Supported languages
    languages: [
        { code: 'en', hreflang: 'en', label: 'English',    flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch',    flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français',   flag: '🇫🇷' },
    ],

    // Default navigation (English slugs)
    navigation: [
        { slug: 'about',  enabled: true },
        { slug: 'built',  enabled: true },
        { slug: 'kit',    enabled: true },
        { slug: 'parts',  enabled: true },
        { slug: 'files',  enabled: true },
    ],

    // Default page slugs (English)
    pages: {
        about:               'about',
        built:               'built',
        kit:                 'kit',
        parts:               'parts',
        files:               'files',
        'mission-statement': 'mission-statement',
        terms:               'terms',
        imprint:             'imprint',
        contact:             'contact',
        gallery:             'gallery',
    }
};

export default SITE_CONFIG;
