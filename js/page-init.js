/**
 * page-init.js
 * Replaces the inline scroll listener duplicated across all HTML pages.
 * Does NOT set __PAGE_LANG__ or __PAGE_SLUG__ — those are set inline in each
 * HTML page before this script runs (ensures correct values for aliased URLs).
 */
(function () {
    var html = document.documentElement;

    function updateAtTop() {
        if (window.scrollY === 0) {
            html.classList.add('at-top');
        } else {
            html.classList.remove('at-top');
        }
    }

    function initScrollListener() {
        // Set correct state immediately on load
        updateAtTop();
        window.addEventListener('scroll', updateAtTop, { passive: true });
    }

    // Allow external callers (page-loader viewPage / loadHome) to re-apply at-top
    // after a programmatic scrollTo(0,0) so the scrollbar hides straight away.
    window.__resetAtTop = function () {
        window.scrollTo({ top: 0, behavior: 'instant' });
        // Use rAF to let the scroll position settle before checking
        requestAnimationFrame(function () {
            requestAnimationFrame(updateAtTop);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollListener);
    } else {
        initScrollListener();
    }
})();
