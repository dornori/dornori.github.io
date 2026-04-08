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
        { label: "About Us",        icon: "assets/icons/building-kit-icon-200x200.svg",  mobileLabel: "About Us",    slug: "about-us",        type: "standard", enabled: true },
        { label: "Fully Built",     icon: "assets/icons/assembled-lamp-icon-200x200.svg",  mobileLabel: "Built", slug: "ready-to-use", type: "standard",   enabled: true  },
        { label: "Build-It Kits", icon: "building-kit-icon-200x200.svg",    mobileLabel: "Build-It", slug: "build-it-kit", type: "standard", enabled: true },
        { label: "Printed Parts",     icon: "3d-printer-icon-200x200.svg",       mobileLabel: "Parts",    slug: "parts", type: "standard", enabled: true },
        { label: "3D FIles",        icon: "assets/icons/3d-file-icon-200x200.svg",  mobileLabel: "BYOHW",    slug: "3d-files"        type: "standard", enabled: true },
       ],

    // ─── FOOTER LINK COLUMNS ──────────────────────────────────────────────────
    footer: [
        {
            label: "Company",
            links: [
                { label: "About Us",  slug: "about",   enabled: false  },
                { label: "Contact",   slug: "contact", enabled: false  }
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
         "fully-built":    { title: "Fully Built",       file: "content/pre-assembled-kit.html"     },
         "build-it-kit":   { title: "Build-It Kit",      file: "content/pre-printed-parts-kit.html" },
         "parts":          { title: "Replacement Parts", file: "content/replacement-parts.html"     },
         "3d-files":       { title: "3D Print Files",    file: "content/3d-print-files.html"        },
        // INFO & LEGAL 
        "mission-statement":        { title: "Mission Statement",          file: "content/mission-statement.html"        },
        about-us:    { title: "About Dornori",           file: "content/about-us.html"  },
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
