import SITE_CONFIG from './config.js';

export function initSocials() {
    const dock = document.getElementById('social-dock');
    if (!dock) return;

    const ICONS = {
        ig:  '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path></svg>',
        x:   '<svg viewBox="0 0 24 24"><path d="M4 4l11.733 16h4.267l-11.733 -16z M4 20l6.768 -6.768 M12.456 12.456l6.774 6.774"></path></svg>',
        yt:  '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
        fb:  '<svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>',
        web: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'
    };

    SITE_CONFIG.socials.forEach(item => {
        const a = document.createElement('a');
        a.href = item.base + item.user;
        a.target = "_blank";
        a.className = 'social-link';
        a.setAttribute('data-type', item.id);
        a.innerHTML = ICONS[item.id];
        dock.appendChild(a);
    });
}
