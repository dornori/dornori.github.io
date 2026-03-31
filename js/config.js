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
        { id: 'web', user: "dornori.com", base: 'https://' }
    ],
    formspree_id: "xnjopbbb"
};

export default SITE_CONFIG;
