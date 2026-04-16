const SITE_CONFIG = {
    // ============================================================
    // DEPLOYMENT - CHANGE THESE WHEN MOVING TO ROOT
    // ============================================================
    
    // Base path for the site ('' for root, '/test/' for testing)
    base_path: '/test/',
    
    // Root domain (no trailing slash)
    root_url: 'https://dornori.com',
    
    // ============================================================
    // APPEARANCE
    // ============================================================
    
    icyLemon: '#F5F29B',
    bgDark: '#050505',
    bannerStickyOffset: 0.35,
    
    // ============================================================
    // LANGUAGES - Add/remove languages here
    // ============================================================
    
    languages: [
        { code: 'en', hreflang: 'en', label: 'English', flag: '🇬🇧', name: 'English' },
        { code: 'de', hreflang: 'de', label: 'Deutsch', flag: '🇩🇪', name: 'German' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱', name: 'Dutch' },
        { code: 'fr', hreflang: 'fr', label: 'Français', flag: '🇫🇷', name: 'French' },
    ],
    
    // Default language (must be one of the codes above)
    default_language: 'en',
    
    // ============================================================
    // NAVIGATION - Add/remove menu items here
    // ============================================================
    
    navigation: [
        { slug: 'about',  icon: '/assets/icons/about-icon-200x200.svg',   type: 'standard', enabled: true },
        { slug: 'built',  icon: '/assets/icons/assembled-lamp-icon-200x200.svg', type: 'standard', enabled: true },
        { slug: 'kit',    icon: '/assets/icons/building-kit-icon-200x200.svg',   type: 'standard', enabled: true },
        { slug: 'parts',  icon: '/assets/icons/3d-printer-icon-200x200.svg',     type: 'standard', enabled: true },
        { slug: 'files',  icon: '/assets/icons/3d-file-icon-200x200.svg',        type: 'standard', enabled: true },
    ],
    
    // ============================================================
    // FOOTER - Add/remove footer sections and links here
    // ============================================================
    
    footer: [
        {
            label: 'Company',
            links: [
                { slug: 'gallery',  enabled: true, label: 'Gallery' },
                { slug: 'about',    enabled: true, label: 'About' },
                { slug: 'contact',  enabled: true, label: 'Contact' },
            ]
        },
        {
            label: 'Legal',
            links: [
                { slug: 'terms',    enabled: true, label: 'Terms' },
                { slug: 'imprint',  enabled: true, label: 'Imprint' },
            ]
        }
    ],
    
    // ============================================================
    // PAGE MAPPING - Map slugs to content files
    // ============================================================
    
    pages: {
        about:   { file: 'about-us.html', title: 'About Dornori', description: 'Where Dornori started and what makes the Star-A lamp different.' },
        built:   { file: 'built.html', title: 'Ready to Use', description: 'Fully assembled Star-A lamp. Drop in batteries and flip the lever.' },
        kit:     { file: 'kit.html', title: 'Complete Assembly Kit', description: 'Build your own Star-A lamp. No soldering, no 3D printer needed.' },
        parts:   { file: 'parts.html', title: 'Replacement Parts', description: 'Every part of the Star-A lamp available separately.' },
        files:   { file: 'files.html', title: '3D Print Files', description: 'Download STL, OBJ, and 3MF files for the Star-A lamp.' },
        terms:   { file: 'terms.html', title: 'Terms of Service', description: 'Terms and conditions for using Dornori products and website.' },
        imprint: { file: 'imprint.html', title: 'Imprint', description: 'Legal information about Dornori.' },
        contact: { file: 'gallery-1.html', title: 'Contact', description: 'Get in touch with Dornori.' },
        gallery: { file: 'gallery-1.html', title: 'Gallery', description: 'Photos of Star-A lamps in action.' },
    },
    
    // ============================================================
    // FORMS
    // ============================================================
    
    formspree_id: 'xnjopbbb',
    turnstile_sitekey: '0x4AAAAAACxsga5y-bJ_qkzC',
    
    // ============================================================
    // HELPER FUNCTIONS (used by other scripts)
    // ============================================================
    
    // Get clean base path (no trailing slash)
    getCleanBasePath() {
        const bp = this.base_path || '/';
        return bp === '/' ? '' : bp.replace(/\/$/, '');
    },
    
    // Get full URL for a page
    getPageUrl(lang, slug = '') {
        const cleanBase = this.getCleanBasePath();
        const base = cleanBase ? `${cleanBase}/` : '/';
        if (slug) {
            return `${base}${lang}/${slug}/`;
        }
        return `${base}${lang}/`;
    },
    
    // Get asset path (with base_path)
    getAssetPath(path) {
        const cleanBase = this.getCleanBasePath();
        if (cleanBase) {
            return `${cleanBase}${path}`;
        }
        return path;
    },
    
    // Validate language code
    isValidLanguage(code) {
        return this.languages.some(l => l.code === code);
    },
    
    // Get language by code
    getLanguage(code) {
        return this.languages.find(l => l.code === code) || this.languages[0];
    },
};

export default SITE_CONFIG;
