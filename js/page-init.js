/**
 * page-init.js
 * Replaces the inline scroll listener duplicated across all HTML pages.
 * Does NOT set __PAGE_LANG__ or __PAGE_SLUG__ — those are set inline in each
 * HTML page before this script runs (ensures correct values for aliased URLs).
 */
(function () {
    function initScrollListener() {
        window.addEventListener('scroll', function () {
            var html = document.documentElement;
            if (window.scrollY === 0) {
                html.classList.add('at-top');
            } else {
                html.classList.remove('at-top');
                html.style.overflowY = '';
            }
        }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollListener);
    } else {
        initScrollListener();
    }
})();
