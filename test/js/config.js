const SITE_CONFIG = {
    appearance: {
        root_url:  'https://dornori.com',
        base_path: '/test/',           // ← Change this to '/' when you move to root
    },

    languages: [
        { code: 'en', hreflang: 'en', label: 'English',    flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch',    flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français',   flag: '🇫🇷' },
    ],

    navigation: [
        { slug: 'about',  enabled: true },
        { slug: 'built',  enabled: true },
        { slug: 'kit',    enabled: true },
        { slug: 'parts',  enabled: true },
        { slug: 'files',  enabled: true },
    ],

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
