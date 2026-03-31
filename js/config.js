/**
 * DORNORI SITE CONFIGURATION
 * ---------------------------------------------------------
 * APPEARANCE: 
 * - icyLemon: The primary brand accent color.
 * - bannerStickyOffset: 0.35 = 35% of the banner remains visible on scroll.
 * * NAVIGATION:
 * - Set 'enabled: true' to show a link in the top-right menu.
 * * SOCIALS:
 * - id: Must match the keys in social-loader.js (ig, x, yt, fb, li, tt, gh, discord, tg, web).
 * - base: The platform URL prefix.
 * * SERVICES:
 * - formspree_id: Your unique endpoint from Formspree.io.
 * - turnstile_sitekey: Your Public Site Key from Cloudflare.
 */
const SITE_CONFIG = {
    appearance: {
        icyLemon: "#F5F29B",
        bgDark: "#050505",
        bannerStickyOffset: 0.35,
        root_url: "https://dornori.com"
    },
    navigation: [
        { label: "About", link: "about.html", type: "standard", enabled: false },
        { label: "Contact", link: "contact.html", type: "standard", enabled: false },
        { label: "Newsletter", link: "#newsletter", type: "button", enabled: true }
    ],
    socials: [
        { id: 'ig',      user: "dornori.info", base: 'https://instagram.com/' },
        { id: 'x',       user: "dornori_info", base: 'https://x.com/' },
        { id: 'yt',      user: "dornori_info", base: 'https://youtube.com/@' },
        { id: 'fb',      user: "profile.php?id=61585253280713", base: 'https://facebook.com/' },
        { id: 'gh',      user: "dornori", base: 'https://github.com/' }
        { id: 'web',     user: "dornori.com", base: 'https://' }
    ],
    formspree_id: "xnjopbbb",
    turnstile_sitekey: "0x4AAAAAACxsga5y-bJ_qkzC"
};

export default SITE_CONFIG;
