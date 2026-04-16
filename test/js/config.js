const SITE_CONFIG = {
    base_path: '/test/',  // ← CHANGE TO '/' FOR PRODUCTION
    
    languages: [
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
        { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
    ],
    default_language: 'en',
    
    navigation: [
        { slug: 'about', icon: '/assets/icons/about-icon-200x200.svg', enabled: true },
        { slug: 'built', icon: '/assets/icons/assembled-lamp-icon-200x200.svg', enabled: true },
        { slug: 'kit',   icon: '/assets/icons/building-kit-icon-200x200.svg', enabled: true },
        { slug: 'parts', icon: '/assets/icons/3d-printer-icon-200x200.svg', enabled: true },
        { slug: 'files', icon: '/assets/icons/3d-file-icon-200x200.svg', enabled: true },
    ],

    footer: [
        {
            label: 'Company',
            links: ['gallery', 'about', 'contact']
        },
        {
            label: 'Legal',
            links: ['terms', 'imprint']
        }
    ],

    formspree_id: 'xnjopbbb',
    turnstile_sitekey: '0x4AAAAAACxsga5y-bJ_qkzC',
};

export default SITE_CONFIG;
