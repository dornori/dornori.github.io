/**
 * DORNORI SITE CONFIGURATION
 * ---------------------------------------------------------
 * APPEARANCE: 
 * - icyLemon: The primary brand accent color (#F5F29B).
 * - bannerStickyOffset: 0.35 (35% of the banner remains visible on scroll).
 * * NAVIGATION & PAGES:
 * - navigation: Defines the top-right menu. 'slug' must match a key in 'pages'.
 * - pages: Content blocks (HTML snippets) that load into the dynamic view layer.
 * * SOCIALS:
 * - id: Must match the keys in social-loader.js.
 * - base: The platform URL prefix.
 * * LEGAL IDENTITY:
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
        { label: "About", slug: "about", type: "standard", enabled: true },
        { label: "Contact", slug: "contact", type: "standard", enabled: false },
        { label: "Newsletter", slug: "newsletter", type: "button", enabled: true }
    ],
    pages: {
        about: { title: "About Dornori", file: "content/about.html" },
        terms: { title: "Terms of Service", file: "content/terms.html" },
        privacy: { title: "Privacy Policy", file: "content/privacy.html" }
    },
    socials: [
        { id: 'ig',      user: "dornori.info", base: 'https://instagram.com/' },
        { id: 'x',       user: "dornori_info", base: 'https://x.com/' },
        { id: 'yt',      user: "dornori_info", base: 'https://youtube.com/@' },
        { id: 'fb',      user: "profile.php?id=61585253280713", base: 'https://facebook.com/' },
        { id: 'li',      user: "dornori", base: 'https://linkedin.com/company/' },
        { id: 'tt',      user: "dornori", base: 'https://tiktok.com/@' },
        { id: 'gh',      user: "dornori", base: 'https://github.com/' },
        { id: 'discord', user: "invite/dornori", base: 'https://discord.com/' },
        { id: 'tg',      user: "dornori", base: 'https://t.me/' },
        { id: 'web',     user: "dornori.com", base: 'https://' }
    ],
    formspree_id: "xnjopbbb",
    turnstile_sitekey: "0x4AAAAAACxsga5y-bJ_qkzC"
};

export default SITE_CONFIG;
