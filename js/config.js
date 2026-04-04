/**
 * DORNORI SITE CONFIGURATION
 * ---------------------------------------------------------
 * APPEARANCE: 
 * - icyLemon: The primary brand accent color (#F5F29B).
 * - bannerStickyOffset: 0.35 (35% of the banner remains visible on scroll).
 * 
 * NAVIGATION & PAGES:
 * - navigation: Defines the top-right menu. 'slug' must match a key in 'pages'.
 * - footer: Defines footer link columns. Each column has a label and links array.
 *           Set enabled: false on any link to hide it without deleting it.
 * - pages: Content snippets (HTML) loaded into the dynamic view layer.
 * 
 * LEGAL IDENTITY:
 * - The website dornori.com and the brand name "Dornori" are owned 
 * and operated by the registrant of the dornori.com domain.
 */
const SITE_CONFIG = {
    appearance: {
        icyLemon: "#F5F29B",
        bgDark: "#050505",
        bannerStickyOffset: 0.35,
        root_url: "https://dornori.com"
    },

    navigation: [
        // PRODUCT PAGES (buttons)
        { label: "📁 3D Print Files",       slug: "3d-print-files",        type: "standard", enabled: true },
        { label: "⚡ Electronics Bundle",   slug: "electronics-bundle",    type: "standard", enabled: true },
        { label: "🖨️ Pre-Printed Parts",   slug: "pre-printed-parts-kit", type: "standard", enabled: true },
        { label: "🔧 Complete Assembly Kit",slug: "complete-assembly-kit", type: "standard", enabled: true },
        { label: "🎮 Pre-Assembled Kit",    slug: "pre-assembled-kit",     type: "standard", enabled: true },
        { label: "🔩 Replacement Parts",    slug: "replacement-parts",     type: "button", enabled: true },
        // INFO PAGES
        { label: "About",      slug: "about",      type: "standard", enabled: false },
        { label: "Contact",    slug: "contact",    type: "standard", enabled: false },
        { label: "Newsletter", slug: "newsletter", type: "button",   enabled: true  }
    ],

    // ─── FOOTER LINK COLUMNS ──────────────────────────────────────────────────
    // Each object is one column in the footer.
    // 'label'   → column heading (set to "" to hide the heading)
    // 'links'   → array of link entries
    //   - label:   display text
    //   - slug:    must match a key in 'pages' above
    //   - enabled: true = visible, false = hidden (link kept for reference)
    footer: [
        {
            label: "Company",
            links: [
                { label: "About Us",  slug: "about",   enabled: true  },
                { label: "Contact",   slug: "contact", enabled: true  }
            ]
        },
        {
            label: "Legal",
            links: [
                { label: "Terms of Service",       slug: "terms",    enabled: true  },
                { label: "Privacy Policy",         slug: "privacy",  enabled: true  },
                { label: "Cookie Policy",          slug: "cookies",  enabled: true  },
                { label: "Imprint",                slug: "imprint",  enabled: true  },
                { label: "Return Policy",          slug: "returns",  enabled: true  },
                { label: "Child Safety",           slug: "children", enabled: true  },
                { label: "Security Center",        slug: "security", enabled: false }
            ]
        }
    ],
    // ─────────────────────────────────────────────────────────────────────────

    pages: {
        // ========== PRODUCT PAGES ==========
        "3d-print-files":        { title: "3D Print Files",          file: "content/3d-print-files.html"        },
        "electronics-bundle":    { title: "Electronics Bundle",      file: "content/electronics-bundle.html"    },
        "pre-printed-parts-kit": { title: "Pre-Printed Parts Kit",   file: "content/pre-printed-parts-kit.html" },
        "complete-assembly-kit": { title: "Complete Assembly Kit",   file: "content/complete-assembly-kit.html" },
        "pre-assembled-kit":     { title: "Pre-Assembled Kit",       file: "content/pre-assembled-kit.html"     },
        "replacement-parts":     { title: "Replacement Parts",       file: "content/replacement-parts.html"     },

        // ========== INFO & LEGAL PAGES ==========
        about:    { title: "About Dornori",           file: "content/about-us.html"  },
        terms:    { title: "Terms of Service",        file: "content/terms.html"     },
        privacy:  { title: "Privacy Policy",          file: "content/privacy.html"   },
        children: { title: "Child Safety Guidelines", file: "content/children.html"  },
        security: { title: "Security Center",         file: "content/security.html"  },
        cookies:  { title: "Cookie Policy",           file: "content/cookies.html"   },
        imprint:  { title: "Imprint / Legal Disclosure", file: "content/imprint.html" },
        returns:  { title: "Return Policy",           file: "content/returns.html"   },

        // ========== FUTURE / PLACEHOLDER PAGES ==========
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
