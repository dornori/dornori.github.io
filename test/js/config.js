const SITE_CONFIG = {
    // CHANGE THIS ONE LINE FOR PRODUCTION
    base_path: '/test/',  // ← Change to '/' when deploying to root
    
    root_url: 'https://dornori.com',
    icyLemon: '#F5F29B',
    bgDark: '#050505',
    bannerStickyOffset: 0.35,
    
    languages: [
        { code: 'en', hreflang: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch', flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français', flag: '🇫🇷' },
    ],
    default_language: 'en',
    
    navigation: [
        { slug: 'about',  icon: '/assets/icons/about-icon-200x200.svg',   type: 'standard', enabled: true },
        { slug: 'built',  icon: '/assets/icons/assembled-lamp-icon-200x200.svg', type: 'standard', enabled: true },
        { slug: 'kit',    icon: '/assets/icons/building-kit-icon-200x200.svg',   type: 'standard', enabled: true },
        { slug: 'parts',  icon: '/assets/icons/3d-printer-icon-200x200.svg',     type: 'standard', enabled: true },
        { slug: 'files',  icon: '/assets/icons/3d-file-icon-200x200.svg',        type: 'standard', enabled: true },
    ],
    
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
    
    formspree_id: 'xnjopbbb',
    turnstile_sitekey: '0x4AAAAAACxsga5y-bJ_qkzC',
};

// Make available globally for non-module scripts
window.SITE_CONFIG = SITE_CONFIG;

export default SITE_CONFIG;
