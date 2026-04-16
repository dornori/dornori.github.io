/**
 * DORNORI SITE CONFIGURATION
 * All paths and keys are centralised here.
 * Change `base_path` to '/' when moving to root.
 */

const SITE_CONFIG = {
    appearance: {
        icyLemon:           '#F5F29B',
        bgDark:             '#050505',
        bannerStickyOffset: 0.35,
        root_url:           'https://dornori.com',
        base_path:          '/test/',   // ← change to '/' when moving to root
    },

    // Local storage key for language preference
    storageKey: 'dornori-lang',

    languages: [
        { code: 'en', hreflang: 'en', label: 'English',    flag: '🇬🇧' },
        { code: 'de', hreflang: 'de', label: 'Deutsch',    flag: '🇩🇪' },
        { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
        { code: 'fr', hreflang: 'fr', label: 'Français',   flag: '🇫🇷' },
    ],
    
    url_slugs: {
        en: {
            about:   'about',
            kit:     'kit',
            built:   'built',
            files:   'files',
            parts:   'parts',
            gallery: 'gallery',
            contact: 'contact',
            terms:   'terms',
            imprint: 'imprint',
            children:'children',
            security:'security',
            cookies: 'cookies',
            returns: 'returns',
            'mission-statement': 'mission-statement',
            'parents-educators': 'parents-educators'
        },
        de: {
            about:   'uber-uns',
            kit:     'bausatz',
            built:   'fertig',
            files:   'dateien',
            parts:   'teile',
            gallery: 'galerie',
            contact: 'kontakt',
            terms:   'agb',
            imprint: 'impressum',
            children:'kinder',
            security:'sicherheit',
            cookies: 'cookies',
            returns: 'widerruf',
            'mission-statement': 'leitbild',
            'parents-educators': 'eltern-lehrer'
        },
        nl: {
            about:   'over-ons',
            kit:     'bouwkit',
            built:   'kant-en-klaar',
            files:   'bestanden',
            parts:   'onderdelen',
            gallery: 'galerij',
            contact: 'contact',
            terms:   'voorwaarden',
            imprint: 'colofon',
            children:'kinderen',
            security:'veiligheid',
            cookies: 'cookies',
            returns: 'retourneren',
            'mission-statement': 'missie',
            'parents-educators': 'ouders-docenten'
        },
        fr: {
            about:   'a-propos',
            kit:     'kit',
            built:   'pret-a-utiliser',
            files:   'fichiers',
            parts:   'pieces',
            gallery: 'galerie',
            contact: 'contact',
            terms:   'conditions',
            imprint: 'mentions-legales',
            children:'enfants',
            security:'securite',
            cookies: 'cookies',
            returns: 'retours',
            'mission-statement': 'mission',
            'parents-educators': 'parents-educateurs'
        }
    },

    navigation: [
        { slug: 'about',  icon: '/assets/icons/about-icon-200x200.svg',   type: 'standard', enabled: true  },
        { slug: 'built',  icon: '/assets/icons/assembled-lamp-icon-200x200.svg', type: 'standard', enabled: true  },
        { slug: 'kit',    icon: '/assets/icons/building-kit-icon-200x200.svg',   type: 'standard', enabled: true  },
        { slug: 'parts',  icon: '/assets/icons/3d-printer-icon-200x200.svg',     type: 'standard', enabled: true  },
        { slug: 'files',  icon: '/assets/icons/3d-file-icon-200x200.svg',        type: 'standard', enabled: true  },
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
                { slug: 'imprint',  enabled: true  },
                { slug: 'children', enabled: true  },
            ]
        }
    ],

    pages: {
        built:               { file: 'built.html'              },
        kit:                 { file: 'kit.html'                },
        parts:               { file: 'parts.html'              },
        files:               { file: 'files.html'              },
        'mission-statement': { file: 'mission-statement.html'  },
        about:               { file: 'about-us.html'           },
        terms:               { file: 'terms.html'              },
        privacy:             { file: 'privacy.html'            },
        children:            { file: 'children.html'           },
        security:            { file: 'security.html'           },
        cookies:             { file: 'cookies.html'            },
        imprint:             { file: 'imprint.html'            },
        returns:             { file: 'returns.html'            },
        contact:             { file: 'gallery-1.html'          },
        gallery:             { file: 'gallery-1.html'          },
        'parents-educators': { file: 'parents-educators.html'  },
    },

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
