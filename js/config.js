/**
 * SITE CONFIGURATION MASTER
 * * HOW TO MODIFY:
 * 1. NAVIGATION: Add objects to the 'navigation' array. 
 * - type: "button" for Icy Lemon highlight, "standard" for text only.
 * - enabled: true/false to toggle visibility without deleting code.
 * * 2. SOCIALS: Add objects to 'socials' array.
 * - id: must match a key in social-loader.js (ig, x, yt, fb, li, tt, gh, discord, tg, web).
 * * 3. LIMITATIONS: 
 * - BannerStickyOffset should stay between 0.1 and 0.5 for best UX.
 * - Ensure Formspree ID is updated when moving to production.
 */


const SITE_CONFIG = {
    appearance: {
        icyLemon: "#F5F29B",
        bgDark: "#050505",
        bannerStickyOffset: 0.35,
        root_url: "https://dornori.com" // New Parameter
    },
    navigation: [
        { label: "About", link: "about.html", type: "standard", enabled: false },
        { label: "Contact", link: "contact.html", type: "standard", enabled: false },
        { label: "Newsletter", link: "#newsletter", type: "button", enabled: true }
    ],
    socials: [
        { id: 'ig',  user: "dornori.info", base: 'https://instagram.com/' },
        { id: 'x',   user: "dornori_info", base: 'https://x.com/' },
        { id: 'yt',  user: "dornori_info", base: 'https://youtube.com/@' },
        { id: 'fb',  user: "profile.php?id=61585253280713",  base: 'https://facebook.com/' },
        { id: 'tt',  user: "dornori",  base: 'https://tiktok.com/' },
        { id: 'li',  user: "dornori",  base: 'https://linkedin.com/' },
        { id: 'web', user: "dornori.com", base: 'https://' }
    ],
    formspree_id: "xnjopbbb"
};

export default SITE_CONFIG;
