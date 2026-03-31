import SITE_CONFIG from './config.js';

export function initPageLoader() {
    const layer = document.getElementById('view-layer');
    const content = document.getElementById('view-content');
    const closeBtn = document.getElementById('close-view');

    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) return;

        try {
            const res = await fetch(page.file);
            const html = await res.text();
            content.innerHTML = `<h1>${page.title}</h1>` + html;
            layer.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } catch (err) {
            content.innerHTML = "<h1>Error</h1><p>Content could not be loaded.</p>";
            layer.classList.remove('hidden');
        }
    };

    closeBtn.onclick = () => {
        layer.classList.add('hidden');
        document.body.style.overflow = 'auto';
    };

    // ESC key listener
    window.addEventListener('keydown', (e) => {
        if (e.key === "Escape") closeBtn.onclick();
    });
}
