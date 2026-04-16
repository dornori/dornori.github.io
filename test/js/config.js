const SITE_CONFIG = {
    appearance: {
        icyLemon: '#F5F29B',
        bgDark: '#050505',
        bannerStickyOffset: 0.35,
        root_url: 'https://dornori.com',
        base_path: '/',
        // Helper for clean language URLs
        getLangPrefix: (lang) => lang === 'en' ? '' : `/${lang}`
    },

    languages: [
        { code: 'en', hreflang: 'en', label: 'English',    flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch',    flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français',   flag: '🇫🇷' },
    ],

    navigation: [
        { slug: 'about',  icon: '/assets/icons/about-icon-200x200.svg',   enabled: true },
        { slug: 'built',  icon: '/assets/icons/assembled-lamp-icon-200x200.svg', enabled: true },
        { slug: 'kit',    icon: '/assets/icons/building-kit-icon-200x200.svg',   enabled: true },
        { slug: 'parts',  icon: '/assets/icons/3d-printer-icon-200x200.svg',     enabled: true },
        { slug: 'files',  icon: '/assets/icons/3d-file-icon-200x200.svg',        enabled: true },
    ],

    footer: [
        {
            label: 'Company',
            links: [
                { slug: 'gallery', enabled: true },
                { slug: 'about',   enabled: true },
                { slug: 'contact', enabled: true },
            ]
        },
        {
            label: 'Legal',
            links: [
                { slug: 'terms',    enabled: true },
                { slug: 'privacy',  enabled: true },
                { slug: 'cookies',  enabled: true },
                { slug: 'imprint',  enabled: true },
                { slug: 'returns',  enabled: true },
                { slug: 'children', enabled: true },
                { slug: 'security', enabled: true },
            ]
        }
    ],

    pages: {
        built:               { file: 'built.html' },
        kit:                 { file: 'kit.html' },
        parts:               { file: 'parts.html' },
        files:               { file: 'files.html' },
        about:               { file: 'about-us.html' },
        terms:               { file: 'terms.html' },
        privacy:             { file: 'privacy.html' },
        children:            { file: 'children.html' },
        security:            { file: 'security.html' },
        cookies:             { file: 'cookies.html' },
        imprint:             { file: 'imprint.html' },
        returns:             { file: 'returns.html' },
        contact:             { file: 'gallery-1.html' },
        gallery:             { file: 'gallery-1.html' },
    },

    socials: [
        { id: 'ig', user: 'dornori.info', base: 'https://instagram.com/' },
        { id: 'x',  user: 'dornori_info', base: 'https://x.com/' },
        { id: 'yt', user: 'dornori_info', base: 'https://youtube.com/@' },
        { id: 'fb', user: 'Dornori.info', base: 'https://facebook.com/' },
    ],

    formspree_id: 'xnjopbbb',
    turnstile_sitekey: '0x4AAAAAACxsga5y-bJ_qkzC',
};

export default SITE_CONFIG;