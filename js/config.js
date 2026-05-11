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

    pages: {},

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
                { slug: 'faq',     label: 'FAQ',     enabled: true },
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