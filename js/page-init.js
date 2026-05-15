/**
 * page-init.js
 * Tracks whether the page is scrolled to the top and toggles the
 * 'at-top' class on <html> accordingly (used to hide the scrollbar at top).
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
        updateAtTop();
        window.addEventListener('scroll', updateAtTop, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollListener);
    } else {
        initScrollListener();
    }
})();
