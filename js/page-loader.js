import SITE_CONFIG from './config.js';

export function initPageLoader() {
    const layer = document.getElementById('view-layer');
    const content = document.getElementById('view-content');
    const closeBtn = document.getElementById('close-view');

    // Global function so it can be called from buttons
    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) return;

        try {
            const res = await fetch(page.file);
            const html = await res.text();
            
            content.innerHTML = `<h1>${page.title}</h1>` + html;
            layer.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Stop scrolling behind
        } catch (err) {
            console.error("Failed to load page content.");
        }
    };

    closeBtn.onclick = () => {
        layer.classList.add('hidden');
        document.body.style.overflow = 'auto';
        content.innerHTML = '';
    };
}
