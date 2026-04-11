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
        { label: "About Us",        icon: "assets/icons/building-kit-icon-200x200.svg",  mobileLabel: "About Us",    slug: "about",        type: "standard", enabled: true },
        { label: "Fully Built",     icon: "assets/icons/assembled-lamp-icon-200x200.svg",  mobileLabel: "Built", slug: "built", type: "standard",   enabled: true  },
        { label: "Build-It Kits", icon: "assets/icons/building-kit-icon-200x200.svg",    mobileLabel: "Build-It", slug: "kit", type: "standard", enabled: true },
        { label: "Printed Parts",     icon: "assets/icons/3d-printer-icon-200x200.svg",       mobileLabel: "Parts",    slug: "parts", type: "standard", enabled: true },
        { label: "3D FIles",        icon: "assets/icons/3d-file-icon-200x200.svg",  mobileLabel: "BYOHW",    slug: "files",        type: "standard", enabled: true },
       ],

    // ─── FOOTER LINK COLUMNS ──────────────────────────────────────────────────
    footer: [
        {
            label: "Company",
            links: [
                { label: "Gallery",  slug: "gallery",   enabled: true  },
                { label: "About Us",  slug: "about",   enabled: true  },
                { label: "Contact",   slug: "contact", enabled: true  }
            ]
        },
        {
            label: "Legal",
            links: [
                { label: "Terms of Service",  slug: "terms",    enabled: true  },
                { label: "Privacy Policy",    slug: "privacy",  enabled: false  },
                { label: "Cookie Policy",     slug: "cookies",  enabled: false  },
                { label: "Imprint",           slug: "imprint",  enabled: true  },
                { label: "Return Policy",     slug: "returns",  enabled: false  },
                { label: "Child Safety",      slug: "children", enabled: false  },
                { label: "Security Center",   slug: "security", enabled: false }
            ]
        }
    ],

    pages: {
        // PRODUCT PAGES
         "built": { title: "Fully Built",       file: "content/built.html"     },
         "kit":   { title: "Build-It Kit",      file: "content/kit.html" },
         "parts": { title: "Replacement Parts", file: "content/parts.html"     },
         "files": { title: "3D Print Files",    file: "content/files.html"        },
        // INFO & LEGAL 
        "mission-statement":        { title: "Mission Statement",          file: "content/mission-statement.html"        },
        about:    { title: "About Dornori",           file: "content/about-us.html"  },
        terms:    { title: "Terms of Service",           file: "content/terms.html"     },
        privacy:  { title: "Privacy Policy",             file: "content/privacy.html"   },
        children: { title: "Child Safety Guidelines",    file: "content/children.html"  },
        security: { title: "Security Center",            file: "content/security.html"  },
        cookies:  { title: "Cookie Policy",              file: "content/cookies.html"   },
        imprint:  { title: "Imprint / Legal Disclosure", file: "content/imprint.html"   },
        returns:  { title: "Return Policy",              file: "content/returns.html"   },
        // FUTURE
        contact:    { title: "Contact Us",  file: "content/gallery-1.html"    },
        newsletter: { title: "Newsletter",  file: "content/newsletter.html" },
        gallery:    { title: "Gallery",     file: "content/gallery-1.html"    }
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
