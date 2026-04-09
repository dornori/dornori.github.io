// page-loader_DRAFT.js
import SITE_CONFIG        from './config_DRAFT.js';
import { initSlideshows } from './slideshow.js';
import SLIDESHOW_CONFIGS  from './slideshow-config.js';

export function initPageLoader() {
    const homeView    = document.getElementById('home-view');
    const pageView    = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');
    const emailInput  = document.querySelector('#waitlist-form input[type="email"]');

   function initPageSlideshows() {
    // Just find any .slideshow-root without data-ss-mounted in the fresh content
    pageContent.querySelectorAll('.slideshow-root:not([data-ss-mounted])').forEach(root => {
        // Import and call the slideshow init
        import('./slideshow.js').then(module => {
            // Re-run the mounting (the function will check data-ss-mounted)
            if (root && !root.hasAttribute('data-ss-mounted')) {
                // We need to expose mountSlideshow or re-run init
                // Simplest: trigger a custom event that slideshow.js listens for
                const event = new CustomEvent('slideshow-init', { detail: { root } });
                document.dispatchEvent(event);
            }
        });
    });
}

        // 2. Data-attribute driven: any .slideshow-root with data-images
        //    that hasn't been mounted yet
        pageContent.querySelectorAll('.slideshow-root[data-images]').forEach(root => {
            if (root.dataset.ssMounted) return;
            const folder   = root.dataset.folder   || '';
            const interval = parseInt(root.dataset.interval, 10) || 4000;
            const fit      = root.dataset.fit      || 'cover';
            const height   = root.dataset.height   || '420px';
            const images   = root.dataset.images.split(',').map(s => s.trim()).filter(Boolean);
            // Pass the element directly so no selector lookup is needed
            initSlideshows([{ _el: root, folder, images, interval, fit, height }]);
        });
    }

    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) {
            console.error(`Page "${slug}" not found in config`);
            return;
        }

        try {
            const res = await fetch(page.file);
            if (!res.ok) throw new Error(`Failed to load ${page.file}: ${res.status}`);
            const html = await res.text();

            pageContent.innerHTML = html;
            initPageSlideshows();

            window.history.pushState({ slug }, page.title, `/${slug}`);
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error('Page load error:', err);
            pageContent.innerHTML = `<h1>Error</h1><p>Content could not be loaded: ${err.message}</p>`;
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
        }
    };

    // Handle internal links in loaded content
    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const slug = link.getAttribute('data-page');

        if (slug) {
            e.preventDefault();
            if (SITE_CONFIG.pages[slug]) {
                window.viewPage(slug);
            } else {
                console.error(`Page slug "${slug}" not found in config`);
            }
        } else if (link.classList && link.classList.contains('internal-link')) {
            e.preventDefault();
            const href = link.getAttribute('href');
            const extractedSlug = href.replace(/^\/|\/page\//g, '');
            if (SITE_CONFIG.pages[extractedSlug]) {
                window.viewPage(extractedSlug);
            }
        }
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.slug) {
            window.viewPage(event.state.slug);
        } else {
            window.showHome();
        }
    });

    window.showHome = (shouldFocus = false) => {
        pageView.classList.add('hidden');
        homeView.classList.remove('hidden');
        window.history.pushState({}, '', '/');

        if (shouldFocus && emailInput) {
            setTimeout(() => {
                emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                emailInput.focus();
            }, 100);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !pageView.classList.contains('hidden')) {
            window.showHome();
        }
    });
}
