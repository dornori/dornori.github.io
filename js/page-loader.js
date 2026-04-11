// page-loader.js - UPDATED VERSION
import SITE_CONFIG from './config.js';

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
            // Construct full path - adjust based on your folder structure
            // If your HTML files are in root/content/, use page.file directly
            // If they're elsewhere, modify this path
            const filePath = page.file; // Already includes "content/about.html" etc.
            
            const res = await fetch(filePath);
            if (!res.ok) throw new Error(`Failed to load ${filePath}: ${res.status}`);
            const html = await res.text();
            
            // Inject the content with title
         //   pageContent.innerHTML = `<h1>${page.title}</h1>` + html;
            pageContent.innerHTML = html;
            
            // Update browser URL without page reload
            window.history.pushState({ slug: slug }, page.title, `/${slug}`);
            
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
        // Check if clicked element or its parent is a link
        const link = e.target.closest('a');
        if (!link) return;
        
        // Check if it's an internal link (data-page attribute or special class)
        const slug = link.getAttribute('data-page');
        
        if (slug) {
            // Option 1: Using data-page attribute
            e.preventDefault();
            if (SITE_CONFIG.pages[slug]) {
                window.viewPage(slug);
            } else {
                console.error(`Page slug "${slug}" not found in config`);
            }
        } 
        else if (link.classList && link.classList.contains('internal-link')) {
            // Option 2: Using class="internal-link"
            e.preventDefault();
            const href = link.getAttribute('href');
            // Extract slug from href like "/terms" or "/page/terms"
            let extractedSlug = href.replace(/^\/|\/page\//g, '');
            if (SITE_CONFIG.pages[extractedSlug]) {
                window.viewPage(extractedSlug);
            }
        }
        // External links will open normally (no e.preventDefault)
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
        
        // Update URL without page reload
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

    // Escape key handler
    window.addEventListener('keydown', (e) => {
        if (e.key === "Escape" && !pageView.classList.contains('hidden')) {
            window.showHome();
        }
    });
}
