/**
 * DORNORI SITE CONFIGURATION
 */

const SITE_CONFIG = {
    appearance: {
        icyLemon: '#F5F29B',
        bgDark: '#050505',
        bannerStickyOffset: 0.35,
        root_url: 'https://dornori.com',
    },

    // Supported languages
    languages: [
        { code: 'en', hreflang: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch', flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français', flag: '🇫🇷' },
    ],
    
    // Navigation - slugs match folder names
    navigation: [
        { slug: 'about',  icon: '/assets/icons/about-icon-200x200.svg',   type: 'standard', enabled: true },
        { slug: 'built',  icon: '/assets/icons/assembled-lamp-icon-200x200.svg', type: 'standard', enabled: true },
        { slug: 'kit',    icon: '/assets/icons/building-kit-icon-200x200.svg',   type: 'standard', enabled: true },
        { slug: 'parts',  icon: '/assets/icons/3d-printer-icon-200x200.svg',     type: 'standard', enabled: true },
        { slug: 'files',  icon: '/assets/icons/3d-file-icon-200x200.svg',        type: 'standard', enabled: true },
    ],

    // Footer
    footer: [
        {
            label: 'Company',
            links: [
                { slug: 'gallery',  enabled: true },
                { slug: 'about',    enabled: true },
                { slug: 'contact',  enabled: true },
            ]
        },
        {
            label: 'Legal',
            links: [
                { slug: 'terms',    enabled: true },
                { slug: 'imprint',  enabled: true },
            ]
        }
    ],

    // Pages mapping (slug -> content file)
    pages: {
        about:   { file: 'about-us.html' },
        built:   { file: 'built.html' },
        kit:     { file: 'kit.html' },
        parts:   { file: 'parts.html' },
        files:   { file: 'files.html' },
        terms:   { file: 'terms.html' },
        imprint: { file: 'imprint.html' },
        contact: { file: 'gallery-1.html' },
        gallery: { file: 'gallery-1.html' },
    },

    formspree_id:      'xnjopbbb',
    turnstile_sitekey: '0x4AAAAAACxsga5y-bJ_qkzC',
};

export default SITE_CONFIG;
