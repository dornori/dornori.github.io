import SITE_CONFIG from './config.js';

export function initSocials() {
    const dock = document.getElementById('social-dock');
    if (!dock) return;

    const ICONS = {
        ig: '<svg viewBox="0 0 24 24" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
        x: '<svg viewBox="0 0 24 24" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z M4 20l6.768 -6.768 M12.456 12.456l6.774 6.774"></path></svg>',
        yt: '<svg viewBox="0 0 24 24" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon></svg>',
        fb: '<svg viewBox="0 0 24 24" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>',
    };

    dock.innerHTML = '';
    SITE_CONFIG.socials.forEach(item => {
        const a = document.createElement('a');
        a.href = item.base + item.user;
        a.target = "_blank";
        a.className = 'social-link';
        a.setAttribute('data-type', item.id);
        a.innerHTML = ICONS[item.id] || ICONS.web;
        dock.appendChild(a);
    });
}
