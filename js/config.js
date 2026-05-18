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
        shop_dir:        'shop/',
        js_dir:          'js/',
        formJsonPath:    (lang) => `${window.__BASE_PATH__ || '/'}lang/${lang}/form.json`,
    },

    storageKeys: {
        lang:  'dornori-lang',
        theme: 'dornori-theme',
        cart:  'dornori-cart',
    },

    endpoints: {
        formHandler:   ENV_CONFIG.API_ENDPOINT,
        queue:         ENV_CONFIG.API_ENDPOINT,
        supportEmail:  'support@dornori.com',
        privacyEmail:  'privacy@dornori.com',
        securityEmail: 'security@dornori.com',
        legalEmail:    'legal@dornori.com',
    },

    messages: {
        title:           'DORNORI',
        redirectTitle:   'Processing...',
        redirectMessage: '✓ Issue resolved! Redirecting...',
    },

    turnstile: {
        sitekey: ENV_CONFIG.TURNSTILE_KEY,
    },

    navigation: [
        { slug: 'about',  icon: 'about-icon-200x200.svg',           type: 'standard', enabled: true  },
        { slug: 'built',  icon: 'assembled-lamp-icon-200x200.svg',  type: 'standard', enabled: true  },
        { slug: 'kit',    icon: 'building-kit-icon-200x200.svg',    type: 'standard', enabled: true  },
        { slug: 'parts',  icon: '3d-printer-icon-200x200.svg',      type: 'standard', enabled: true  },
        { slug: 'files',  icon: '3d-file-icon-200x200.svg',         type: 'standard', enabled: true  },
        { slug: 'shop',   icon: 'shop-icon-200x200.svg',            type: 'standard', enabled: true  },
    ],

    defaults: {
        redirectUrl:     '/en/success/',
        redirectMessage: '✓ Issue resolved! Redirecting...',
    },

    pages: {
        built:               { file: 'built.html'             },
        kit:                 { file: 'kit.html'               },
        parts:               { file: 'parts.html'             },
        files:               { file: 'files.html'             },
        'mission-statement': { file: 'mission-statement.html' },
        about:               { file: 'about-us.html'          },
        terms:               { file: 'terms.html'             },
        privacy:             { file: 'privacy.html'           },
        children:            { file: 'children.html'          },
        security:            { file: 'security.html'          },
        cookies:             { file: 'cookies.html'           },
        imprint:             { file: 'imprint.html'           },
        returns:             { file: 'returns.html'           },
        contact:             { file: 'support.html'              },
        support:             { file: 'support.html'           },
        gallery:             { file: 'gallery.html'           },
        cart:                { file: 'cart.html'              },
        shop:                { file: 'shop.html'              },
        product:             { file: 'product.html'           },
        success:             { file: 'success.html'           },
        'faq':               { file: 'faq.html'               },
        'reviews':           { file: 'reviews.html'           },
        // Additional aliases kept for direct access
        'about-us':               { file: 'about-us.html'              },
        'form':                   { file: 'form.html'                  },
    },

    socials: [
        { id: 'ig',  user: 'dornori.info', base: 'https://instagram.com/' },
        { id: 'x',   user: 'dornori_info', base: 'https://x.com/'         },
        { id: 'yt',  user: 'dornori_info', base: 'https://youtube.com/@'  },
        { id: 'fb',  user: 'Dornori.info', base: 'https://facebook.com/'  },
        { id: 'web', user: 'dornori.com',  base: 'https://'               },
    ],

    footer: [
        {
            label: 'Company',
            links: [
                { slug: 'gallery',  enabled: true  },
                { slug: 'about',    enabled: true  },
                { slug: 'contact',  enabled: true  },
                { slug: 'support',  enabled: true  },
            ]
        },
        {
            label: 'Legal',
            links: [
                { slug: 'terms',    enabled: true  },
                { slug: 'privacy',  enabled: true },
                { slug: 'cookies',  enabled: true },
                { slug: 'imprint',  enabled: true  },
                { slug: 'returns',  enabled: false },
                { slug: 'children', enabled: true },
                { slug: 'security', enabled: true },
            ]
        }
    ],

    turnstile_sitekey: ENV_CONFIG.TURNSTILE_KEY,
};

// Expose globally for plain (non-module) scripts, and export for ES module consumers.
// NOTE: SITE_CONFIG is a single object reference — mutations made via the import
// (e.g. SITE_CONFIG.languages = [...]) are visible on window.SITE_CONFIG and vice versa
// because JavaScript objects are passed by reference. Do not reassign either binding.
window.SITE_CONFIG = SITE_CONFIG;
export default SITE_CONFIG;
export { SITE_CONFIG };
