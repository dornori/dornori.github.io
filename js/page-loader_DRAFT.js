import SITE_CONFIG from './config_DRAFT.js';
// slideshow.js imports automatically, no config needed

export function initPageLoader() {
    const homeView = document.getElementById('home-view');
    const pageView = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');
    const emailInput = document.querySelector('#waitlist-form input[type="email"]');

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
            // Slideshow.js MutationObserver automatically handles any new .slideshow-root divs

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
