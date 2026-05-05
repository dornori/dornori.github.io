/**
 * DORNORI SITE CONFIGURATION
 */

const SITE_CONFIG = {
    appearance: {
        icyLemon:           '#F5F29B',
        bgDark:             '#050505',
        bannerStickyOffset: 0.35,
        root_url:           'https://dornori.com/sandbox',
        base_path:          '/',
    },

    paths: {
        countries_file:  'data/countries.json',
        shipping_file:   'data/shipping.json',
        lang_dir:        'lang/',
        content_dir:    'content/',
        icons_dir:      'assets/icons/',
        shop_dir:       'shop/',
        js_dir:         'js/',
    },

    storageKeys: {
        lang:  'dornori-lang',
        theme: 'dornori-theme',
    },

    // Static language list — structural config, not fetched at runtime
    languages: [
        { code: 'en', hreflang: 'en', label: 'English',    flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch',    flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français',   flag: '🇫🇷' },
    ],

    features: {
        profiles: ['dark', 'light', 'cutting-mat', 'cutting-blue']
    },

    endpoints: {
        formHandler: 'https://edge-form-handler-api.dornori-info.workers.dev',
    },

    defaults: {
        redirectUrl:     '/',
        redirectMessage: '✓ Issue resolved! Redirecting...',
    },

    navigation: [
        { slug: 'about',  icon: 'about-icon-200x200.svg',          type: 'standard', enabled: true  },
        { slug: 'built',  icon: 'assembled-lamp-icon-200x200.svg',  type: 'standard', enabled: true  },
        { slug: 'kit',    icon: 'building-kit-icon-200x200.svg',    type: 'standard', enabled: true  },
        { slug: 'parts',  icon: '3d-printer-icon-200x200.svg',      type: 'standard', enabled: true  },
        { slug: 'files',  icon: '3d-file-icon-200x200.svg',         type: 'standard', enabled: true  },
    ],

    footer: [
        {
            label: 'Company',
            links: [
                { slug: 'gallery',  enabled: true  },
                { slug: 'about',    enabled: true  },
                { slug: 'contact',  enabled: true  },
            ]
        },
        {
            label: 'Legal',
            links: [
                { slug: 'terms',    enabled: true  },
                { slug: 'privacy',  enabled: false },
                { slug: 'cookies',  enabled: false },
                { slug: 'imprint',  enabled: true  },
                { slug: 'returns',  enabled: false },
                { slug: 'children', enabled: false },
                { slug: 'security', enabled: false },
            ]
        }
    ],

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
        contact:             { file: 'form.html'              },
        support:             { file: 'support.html'           },
        gallery:             { file: 'gallery-1.html'         },
        cart:                { file: 'cart.html'              },
        shop:                { file: 'shop.html'              },
        product:             { file: 'product.html'           },
    },

    socials: [
        { id: 'ig',  user: 'dornori.info', base: 'https://instagram.com/' },
        { id: 'x',   user: 'dornori_info', base: 'https://x.com/'         },
        { id: 'yt',  user: 'dornori_info', base: 'https://youtube.com/@'  },
        { id: 'fb',  user: 'Dornori.info', base: 'https://facebook.com/'  },
        { id: 'web', user: 'dornori.com',  base: 'https://'               },
    ],

    turnstile_sitekey: '0x4AAAAAACxsga5y-bJ_qkzC',
};

export default SITE_CONFIG;
