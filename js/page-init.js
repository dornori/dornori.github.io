/**
 * page-init.js
 * DISABLED: Scroll listener that toggled 'at-top' class has been disabled
 * to prevent header shrinking on mobile scroll.
 * Tracks last visited shop page for cart navigation.
 */
(function () {
    var html = document.documentElement;

    // DISABLED: Scroll listener
    // function updateAtTop() {
    //     if (window.scrollY === 0) {
    //         html.classList.add('at-top');
    //     } else {
    //         html.classList.remove('at-top');
    //     }
    // }

    // function initScrollListener() {
    //     updateAtTop();
    //     window.addEventListener('scroll', updateAtTop, { passive: true });
    // }

    // if (document.readyState === 'loading') {
    //     document.addEventListener('DOMContentLoaded', initScrollListener);
    // } else {
    //     initScrollListener();
    // }

    // Track last visited shop page for cart navigation
    (function() {
        var pageSlug = window.__PAGE_SLUG__;
        var excludePages = ['product', 'cart'];

        if (pageSlug && excludePages.indexOf(pageSlug) === -1) {
            // Save the current page URL as the last visited shop page
            try {
                localStorage.setItem('webshop_last_page', window.location.href);
            } catch (e) {
                // localStorage not available
            }
        }
    })();
})();
