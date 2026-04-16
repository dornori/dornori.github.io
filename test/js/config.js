const SITE_CONFIG = {
    // DEPLOYMENT - CHANGE THIS ONE LINE WHEN MOVING TO ROOT
    base_path: '/test/',  // ← Change to '/' for production, keep '/test/' for testing
    root_url: 'https://dornori.com',
    
    // APPEARANCE
    icyLemon: '#F5F29B',
    bgDark: '#050505',
    bannerStickyOffset: 0.35,
    
    // LANGUAGES
    languages: [
        { code: 'en', hreflang: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch', flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français', flag: '🇫🇷' },
    ],
    default_language: 'en',
    
    // NAVIGATION
    navigation: [
        { slug: 'about',  icon: '/assets/icons/about-icon-200x200.svg',   type: 'standard', enabled: true },
        { slug: 'built',  icon: '/assets/icons/assembled-lamp-icon-200x200.svg', type: 'standard', enabled: true },
        { slug: 'kit',    icon: '/assets/icons/building-kit-icon-200x200.svg',   type: 'standard', enabled: true },
        { slug: 'parts',  icon: '/assets/icons/3d-printer-icon-200x200.svg',     type: 'standard', enabled: true },
        { slug: 'files',  icon: '/assets/icons/3d-file-icon-200x200.svg',        type: 'standard', enabled: true },
    ],
    
    // FOOTER
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
    
    // FORMS
    formspree_id: 'xnjopbbb',
    turnstile_sitekey: '0x4AAAAAACxsga5y-bJ_qkzC',
};

export default SITE_CONFIG;
