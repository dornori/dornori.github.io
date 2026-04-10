// page-loader.js - Updated with built-in SEO (canonical + title)
import SITE_CONFIG from './config.js';

export function initPageLoader() {
    const homeView = document.getElementById('home-view');
    const pageView = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');

    // ====================== SEO UPDATE FUNCTION ======================
    function updateSEO(slug = '') {
        const mainDomain = 'https://dornori.com';
        let path = slug ? `/${slug}` : '/';

        // Update Canonical Tag (always forces dornori.com)
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = mainDomain + (path === '/' ? '' : path);

        // Update Page Title
        const titleMap = {
            '': 'Dornori — Build Your Own Rising Star Lamp',
            'home': 'Dornori — Build Your Own Rising Star Lamp',
            'about': 'About Dornori — Real Engineering for Kids',
            'mission-statement': 'Dornori Mission Statement',
            'complete-assembly-kit': 'Star-A Complete Assembly Kit — Pre-printed + Electronics',
            'pre-assembled-kit': 'Star-A Ready to Use — Fully Assembled Kinetic Lamp',
            'replacement-parts': 'Star-A Replacement Parts & Upgrades',
            'electronics-bundle': 'Star-A Electronics Bundle',
            'terms': 'Terms of Service',
            'privacy': 'Privacy Policy',
            'children': 'Child Safety Guidelines',
            'returns': 'Returns & Refunds Policy',
            'imprint': 'Imprint & Legal Contact',
            'cookies': 'Cookie Policy',
            'security': 'Security Center'
            // Add more entries here when you enable new pages in config.js
        };

        document.title = titleMap[slug] || 'Dornori';
    }

    // ====================== VIEW PAGE FUNCTION ======================
    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) {
            console.error(`Page "${slug}" not found in config`);
            return;
        }

        try {
            const res = await fetch(page.file);
            if (!res.ok) throw new Error(`Failed to load ${page.file}`);

            const html = await res.text();
            
            // Inject content
            pageContent.innerHTML = html;

            // Show page view, hide home
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');

            // Update browser URL
            window.history.pushState({ slug: slug }, page.title, `/${slug}`);

            // === SEO UPDATES ===
            updateSEO(slug);

            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error('Page load error:', err);
            pageContent.innerHTML = `
                <h1>Error</h1>
                <p>Sorry, the content could not be loaded.</p>
                <button onclick="window.showHome()">Return Home</button>
            `;
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
            updateSEO('');
        }
    };

    // ====================== SHOW HOME ======================
    window.showHome = (shouldFocus = false) => {
        pageView.classList.add('hidden');
        homeView.classList.remove('hidden');
        
        window.history.pushState({}, '', '/');
        
        updateSEO('');   // Reset SEO for homepage

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ====================== INTERNAL LINK HANDLER ======================
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a, button');
        if (!link) return;

        // Handle data-page attribute (recommended way)
        const slug = link.getAttribute('data-page');
        if (slug && SITE_CONFIG.pages[slug]) {
            e.preventDefault();
            window.viewPage(slug);
            return;
        }

        // Fallback for internal-link class
        if (link.classList && link.classList.contains('internal-link')) {
            e.preventDefault();
            let href = link.getAttribute('href') || '';
            let extractedSlug = href.replace(/^\/|\/$/g, '');
            if (SITE_CONFIG.pages[extractedSlug]) {
                window.viewPage(extractedSlug);
            }
        }
    });

    // ====================== BROWSER BACK/FORWARD ======================
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.slug) {
            window.viewPage(event.state.slug);
        } else {
            window.showHome();
        }
    });

    // ====================== ESCAPE KEY ======================
    window.addEventListener('keydown', (e) => {
        if (e.key === "Escape" && !pageView.classList.contains('hidden')) {
            window.showHome();
        }
    });

    // Initial SEO on load
    updateSEO('');
}

// Auto initialize when imported
initPageLoader();
