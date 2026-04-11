/**
 * DORNORI SITE CONFIGURATION
 * ---------------------------------------------------------
 * LANGUAGES
 * ---------
 * - Add a new language by adding an entry to SITE_CONFIG.languages
 * - Create a matching folder: content/[lang-code]/
 * - Each page's `file` is relative; the lang loader prepends the lang folder
 *
 * NAVIGATION
 * ----------
 * - label       → text shown on the desktop nav button (next to icon)
 * - icon        → SVG file in assets/icons/
 * - mobileLabel → short text shown UNDER the icon on mobile
 * - slug        → must match a key in 'pages'
 * - type        → 'standard' or 'button'
 * - enabled     → true/false
 */

const SITE_CONFIG = {
    appearance: {
        icyLemon:          '#F5F29B',
        bgDark:            '#050505',
        bannerStickyOffset: 0.35,
        root_url:          'https://dornori.com',
        // Set to '/' when deployed to root. Include trailing slash.
        base_path:         '/test/'
    },

    // ─── SUPPORTED LANGUAGES ──────────────────────────────────────────────────
    // Order matters: first entry is the fallback when IP detection fails.
    // `hreflang` must be a valid BCP-47 tag (used in <link rel="alternate">).
    languages: [
        { code: 'en', hreflang: 'en', label: 'English',  flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch',  flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français', flag: '🇫🇷' },
    ],

    // ─── NAVIGATION ───────────────────────────────────────────────────────────
    navigation: [
        { label: 'About Us',      icon: 'assets/icons/building-kit-icon-200x200.svg',   mobileLabel: 'About',   slug: 'about',  type: 'standard', enabled: true  },
        { label: 'Fully Built',   icon: 'assets/icons/assembled-lamp-icon-200x200.svg', mobileLabel: 'Built',   slug: 'built',  type: 'standard', enabled: true  },
        { label: 'Build-It Kits', icon: 'assets/icons/building-kit-icon-200x200.svg',   mobileLabel: 'Build-It',slug: 'kit',    type: 'standard', enabled: true  },
        { label: 'Printed Parts', icon: 'assets/icons/3d-printer-icon-200x200.svg',     mobileLabel: 'Parts',   slug: 'parts',  type: 'standard', enabled: true  },
        { label: '3D Files',      icon: 'assets/icons/3d-file-icon-200x200.svg',        mobileLabel: 'Files',   slug: 'files',  type: 'standard', enabled: true  },
    ],

    // ─── FOOTER LINK COLUMNS ──────────────────────────────────────────────────
    footer: [
        {
            label: 'Company',
            links: [
                { label: 'Gallery',  slug: 'gallery',  enabled: true  },
                { label: 'About Us', slug: 'about',    enabled: true  },
                { label: 'Contact',  slug: 'contact',  enabled: true  },
            ]
        },
        {
            label: 'Legal',
            links: [
                { label: 'Terms of Service', slug: 'terms',    enabled: true  },
                { label: 'Privacy Policy',   slug: 'privacy',  enabled: false },
                { label: 'Cookie Policy',    slug: 'cookies',  enabled: false },
                { label: 'Imprint',          slug: 'imprint',  enabled: true  },
                { label: 'Return Policy',    slug: 'returns',  enabled: false },
                { label: 'Child Safety',     slug: 'children', enabled: false },
                { label: 'Security Center',  slug: 'security', enabled: false },
            ]
        }
    ],

    // ─── PAGES ────────────────────────────────────────────────────────────────
    // `file` is the path WITHIN a language folder, e.g. content/en/about-us.html
    // `description` is used for <meta name="description"> on each page
    pages: {
        built:  {
            title: 'Fully Built',
            file:  'built.html',
            description: 'Get the Star-A lamp fully assembled and ready to use. Real kinetic outdoor lighting, built by us, for you.'
        },
        kit: {
            title: 'Build-It Kit',
            file:  'kit.html',
            description: 'Build the Star-A rising lamp yourself. Complete kit with all parts, electronics, and step-by-step instructions.'
        },
        parts: {
            title: 'Replacement Parts',
            file:  'parts.html',
            description: 'Order individual Star-A replacement parts. Every component is available separately — no planned obsolescence.'
        },
        files: {
            title: '3D Print Files',
            file:  'files.html',
            description: 'Download free STL files for the Star-A lamp. Print at home and source the electronics yourself.'
        },
        'mission-statement': {
            title: 'Mission Statement',
            file:  'mission-statement.html',
            description: 'Why Dornori exists — building things together, outdoors, with real components.'
        },
        about: {
            title: 'About Dornori',
            file:  'about-us.html',
            description: 'Learn about Dornori — the team, the story, and the Star-A lamp that started it all.'
        },
        terms: {
            title: 'Terms of Service',
            file:  'terms.html',
            description: 'Dornori terms of service.'
        },
        privacy: {
            title: 'Privacy Policy',
            file:  'privacy.html',
            description: 'Dornori privacy policy.'
        },
        children: {
            title: 'Child Safety Guidelines',
            file:  'children.html',
            description: 'Child safety guidelines for the Star-A lamp project.'
        },
        security: {
            title: 'Security Center',
            file:  'security.html',
            description: 'Dornori security center.'
        },
        cookies: {
            title: 'Cookie Policy',
            file:  'cookies.html',
            description: 'Dornori cookie policy.'
        },
        imprint: {
            title: 'Imprint / Legal Disclosure',
            file:  'imprint.html',
            description: 'Dornori legal imprint and disclosure.'
        },
        returns: {
            title: 'Return Policy',
            file:  'returns.html',
            description: 'Dornori returns and refunds policy.'
        },
        contact: {
            title: 'Contact Us',
            file:  'gallery-1.html',
            description: 'Get in touch with the Dornori team.'
        },
        gallery: {
            title: 'Gallery',
            file:  'gallery-1.html',
            description: 'Photos of Star-A lamps built by our community.'
        },
    },

    // ─── SOCIALS ──────────────────────────────────────────────────────────────
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
