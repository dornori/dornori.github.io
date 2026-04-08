/**
 * DORNORI SITE CONFIGURATION
 * ---------------------------------------------------------
 * APPEARANCE:
 * - icyLemon: The primary brand accent color (#F5F29B).
 * - bannerStickyOffset: 0.35 (35% of the banner scrolls out before locking).
 *
 * NAVIGATION:
 * - label       → text shown on the desktop nav button (next to icon)
 * - icon        → SVG file in assets/icons/ — used on BOTH desktop and mobile
 * - mobileLabel → short text shown UNDER the icon on mobile
 * - slug        → must match a key in 'pages'
 * - type        → 'standard' or 'button' (button gets accent styling)
 * - enabled     → true/false
 *
 * To add a new nav item:
 *   1. Drop your SVG into assets/icons/
 *   2. Add an entry here with enabled: true
 *   3. Make sure the slug matches a key in 'pages'
 */
const SITE_CONFIG = {
    appearance: {
        icyLemon: "#F5F29B",
        bgDark: "#050505",
        bannerStickyOffset: 0.35,
        root_url: "https://dornori.com"
    },

    navigation: [
        // PRODUCT PAGES
        { label: "3D Files",              icon: "assets/icons/3d-file-icon-200x200.svg",  mobileLabel: "FILES",    slug: "4d-print-files",                 type: "standard", enabled: true },
        { label: "3D Print Files",        icon: "assets/icons/3d-file-icon-200x200.svg",  mobileLabel: "FILES",    slug: "3d-print-files",        type: "standard", enabled: true },
        { label: "Pre-Printed Parts",     icon: "assets/icons/assembled-lamp-icon-200x200.svg",       mobileLabel: "PARTS",    slug: "pre-printed-parts-kit", type: "standard", enabled: true },
        { label: "Complete Assembly Kit", icon: "assets/icons/3d-printer-icon-200x200.svg",    mobileLabel: "ASSEMBLY", slug: "complete-assembly-kit", type: "standard", enabled: true },
        { label: "Pre-Assembled Kit",     icon: "assets/icons/building-kit-icon-200x200.svg",  mobileLabel: "KIT", slug: "complete-assembly-kit", type: "standard",   enabled: true  }
    ],

    // ─── FOOTER LINK COLUMNS ──────────────────────────────────────────────────
    footer: [
        {
            label: "Company",
            links: [
                { label: "About Us",  slug: "about",   enabled: false  },
                { label: "Contact",   slug: "contact", enabled: false  }
                { label: "Mission Statement",    slug: "mission-statement",   enabled: true },
       
            ]
        },
        {
            label: "Legal",
            links: [
                { label: "Terms of Service",  slug: "terms",    enabled: false  },
                { label: "Privacy Policy",    slug: "privacy",  enabled: false  },
                { label: "Cookie Policy",     slug: "cookies",  enabled: false  },
                { label: "Imprint",           slug: "imprint",  enabled: false  },
                { label: "Return Policy",     slug: "returns",  enabled: false  },
                { label: "Child Safety",      slug: "children", enabled: false  },
                { label: "Security Center",   slug: "security", enabled: false }
            ]
        }
    ],

    pages: {
        // PRODUCT PAGES
        "4d-print-files":        { title: "3D Print Files",          file: "content/3d-print-files.html"        },
        "mission-statement":     { title: "Mission Statement",       file: "content/mission-statement.html"     },
        "3d-print-files":        { title: "3D Print Files",          file: "content/3d-print-files.html"        },
        "electronics-bundle":    { title: "Electronics Bundle",      file: "content/electronics-bundle.html"    },
        "pre-printed-parts-kit": { title: "Pre-Printed Parts Kit",   file: "content/pre-printed-parts-kit.html" },
        "complete-assembly-kit": { title: "Complete Assembly Kit",   file: "content/complete-assembly-kit.html" },
        "pre-assembled-kit":     { title: "Pre-Assembled Kit",       file: "content/pre-assembled-kit.html"     },
        "replacement-parts":     { title: "Replacement Parts",       file: "content/replacement-parts.html"     },
        // INFO & LEGAL
        about:    { title: "About Dornori",              file: "content/about-us.html"  },
        terms:    { title: "Terms of Service",           file: "content/terms.html"     },
        privacy:  { title: "Privacy Policy",             file: "content/privacy.html"   },
        children: { title: "Child Safety Guidelines",    file: "content/children.html"  },
        security: { title: "Security Center",            file: "content/security.html"  },
        cookies:  { title: "Cookie Policy",              file: "content/cookies.html"   },
        imprint:  { title: "Imprint / Legal Disclosure", file: "content/imprint.html"   },
        returns:  { title: "Return Policy",              file: "content/returns.html"   },
        // FUTURE
        contact:    { title: "Contact Us",  file: "content/contact.html"    },
        newsletter: { title: "Newsletter",  file: "content/newsletter.html" }
    },

    socials: [
        { id: 'ig',  user: "dornori.info", base: 'https://instagram.com/' },
        { id: 'x',   user: "dornori_info", base: 'https://x.com/'         },
        { id: 'yt',  user: "dornori_info", base: 'https://youtube.com/@'  },
        { id: 'fb',  user: "Dornori.info", base: 'https://facebook.com/'  },
        { id: 'web', user: "dornori.com",  base: 'https://'               }
    ],

    formspree_id:      "xnjopbbb",
    turnstile_sitekey: "0x4AAAAAACxsga5y-bJ_qkzC"
};

export default SITE_CONFIG;
