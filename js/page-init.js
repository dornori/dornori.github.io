/**
 * page-init.js
 * Tracks whether the page is scrolled to the top and toggles the
 * 'at-top' class on <html> accordingly (used to hide the scrollbar at top).
 * Also tracks last visited shop page for cart navigation.
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

    // Track last visited shop page for cart navigation
    (function() {
        var pageSlug = window.__PAGE_SLUG__;
        var config = window.SITE_CONFIG || {};
        var storageKey = (config.storageKeys && config.storageKeys.lastShopPage) || 'webshop_last_page';
        var excludePages = ['product', 'cart'];

        if (pageSlug && excludePages.indexOf(pageSlug) === -1) {
            // Save the current page URL as the last visited shop page
            try {
                localStorage.setItem(storageKey, window.location.href);
            } catch (e) {
                // localStorage not available
            }
        }
    })();
})();
