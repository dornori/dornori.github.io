/**
 * DORNORI SITE CONFIGURATION
 */

import ENV_CONFIG from './env-config.js';

const SITE_CONFIG = {
    appearance: {
        icyLemon:           '#F5F29B',
        bgDark:             '#050505',
        bannerStickyOffset: 0.35,
        root_url:           ENV_CONFIG.ROOT_URL,
        base_path:          window.__BASE_PATH__ || '/',
    },

    paths: {
        countries_file:  'data/countries.json',
        profiles_file:   'data/profiles.json',
        shipping_file:   'data/shipping.json',
        lang_dir:        'lang/',
        content_dir:     'content/',
        icons_dir:       'assets/icons/',
    },

    theme: {
        name:       'dornori',
        theme:      'dornori-theme',
    },

    endpoints: {
        formHandler: ENV_CONFIG.API_ENDPOINT,
        queue:       ENV_CONFIG.API_ENDPOINT,
        supportEmail:  'support@dornori.com',
        privacyEmail:  'privacy@dornori.com',
        securityEmail: 'security@dornori.com',
        legalEmail:    'legal@dornori.com',
    },

    messages: {
        title:          'DORNORI',
        redirectTitle:  'Processing...',
        redirectMessage: '✓ Issue resolved! Redirecting...',
    },

    turnstile: {
        sitekey: ENV_CONFIG.TURNSTILE_KEY,
    },

    navigation: [
        { slug: 'about',  icon: 'about-icon-200x200.svg',          type: 'standard', enabled: true  },
        { slug: 'contact', icon: 'contact-icon-200x200.svg',       type: 'standard', enabled: true  },
        { slug: 'shop',    icon: 'shop-icon-200x200.svg',          type: 'standard', enabled: true  },
    ],

    storageKeys: {
        lang:    'dornori-lang',
        theme:   'dornori-theme',
        cart:    'dornori-cart',
    },

    defaults: {
        redirectUrl:     '/en/success/',
        redirectMessage: '✓ Issue resolved! Redirecting...',
    },

    /**
     * FIX: pages was empty {} — viewPage(slug) always silently returned.
     * Every slug listed in lang/en/common.json url_slugs needs an entry here
     * so the SPA can load the matching content/[lang]/[file].html fragment.
     *
     * Shape: { [canonicalSlug]: { file: '<filename>.html' } }
     * `file` is relative to content/[lang]/ and must match the actual file name.
     */
    pages: {
        'about':               { file: 'about.html' },
        'built':               { file: 'built.html' },
        'cart':                { file: 'cart.html' },
        'children':            { file: 'children.html' },
        'contact':             { file: 'contact.html' },
        'cookies':             { file: 'cookies.html' },
        'files':               { file: 'files.html' },
        'gallery':             { file: 'gallery.html' },
        'imprint':             { file: 'imprint.html' },
        'kit':                 { file: 'kit.html' },
        'mission-statement':   { file: 'mission-statement.html' },
        'parts':               { file: 'parts.html' },
        'privacy':             { file: 'privacy.html' },
        'product':             { file: 'product.html' },
        'replacement-parts':   { file: 'replacement-parts.html' },
        'returns':             { file: 'returns.html' },
        'security':            { file: 'security.html' },
        'shop':                { file: 'shop.html' },
        'success':             { file: 'success.html' },
        'support':             { file: 'support.html' },
        'terms':               { file: 'terms.html' },
        // aliases used by content/ but not in url_slugs — kept for direct access
        'about-us':            { file: 'about-us.html' },
        'complete-assembly-kit':  { file: 'complete-assembly-kit.html' },
        'electronics-bundle':     { file: 'electronics-bundle.html' },
        'pre-assembled-kit':      { file: 'pre-assembled-kit.html' },
        'pre-printed-parts-kit':  { file: 'pre-printed-parts-kit.html' },
        'form':                { file: 'form.html' },
    },

    socials: [
        { id: 'ig',  base: 'https://instagram.com/', user: 'dornori' },
    ],

    footer: [
        {
            label: 'Shop',
            links: [
                { slug: 'shop',    label: 'Shop',    enabled: true },
                { slug: 'product', label: 'Product', enabled: true },
                { slug: 'cart',    label: 'Cart',    enabled: true },
            ],
        },
        {
            label: 'Info',
            links: [
                { slug: 'about',   label: 'About',   enabled: true },
                { slug: 'contact', label: 'Contact', enabled: true },
                { slug: 'support', label: 'Support', enabled: true },
            ],
        },
        {
            label: 'Legal',
            links: [
                { slug: 'privacy', label: 'Privacy',  enabled: true },
                { slug: 'terms',   label: 'Terms',    enabled: true },
                { slug: 'cookies', label: 'Cookies',  enabled: true },
            ],
        },
    ],
};

export default SITE_CONFIG;
export { SITE_CONFIG };
