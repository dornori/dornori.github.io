/**
 * page-init.js
 * Replaces the inline scroll listener duplicated across all HTML pages.
 * Does NOT set __PAGE_LANG__ or __PAGE_SLUG__ — those are set inline in each
 * HTML page before this script runs (ensures correct values for aliased URLs).
 */
(function () {
    function initScrollListener() {
        // Hide scrollbar on load
        document.documentElement.classList.add('no-scrollbar');
        // Ensure page starts at top
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);

        window.addEventListener('scroll', function () {
            var html = document.documentElement;
            if (window.scrollY === 0) {
                html.classList.add('at-top');
                html.classList.add('no-scrollbar');
            } else {
                html.classList.remove('at-top'); // triggers banner slide-up animation
                html.classList.remove('no-scrollbar'); // show scrollbar once user scrolls
            }
        }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollListener);
    } else {
        initScrollListener();
    }
})();
