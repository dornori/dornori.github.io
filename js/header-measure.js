/**
 * header-measure.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamically measures actual header height and applies proper scroll margins
 * to ensure content always starts exactly at the header bottom, accounting for
 * notches, safe-area-insets, and responsive header height changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function() {
  'use strict';

  // Measure and apply header offset
  function measureAndApply() {
    const mobileNav  = document.querySelector('.mobile-nav');
    const mainHeader = document.querySelector('#main-header');

    if (window.innerWidth > 768) {
      // Desktop: clear mobile overrides
      const main = document.querySelector('main#viewport');
      if (main) main.style.paddingTop = '';
      return;
    }

    const header = mobileNav || mainHeader;
    if (!header) {
      requestAnimationFrame(measureAndApply);
      return;
    }

    // .mobile-nav is fixed at top:0 — its bottom edge IS the total offset needed
    const rect        = header.getBoundingClientRect();
    const totalOffset = Math.ceil(rect.bottom);

    // Apply padding-top to main so content starts below the fixed nav
    const main = document.querySelector('main#viewport');
    if (main) main.style.paddingTop = totalOffset + 'px';

    // Apply scroll-margin-top to page-view
    const pageView = document.getElementById('page-view');
    if (pageView) pageView.style.scrollMarginTop = totalOffset + 'px';

    // Store for scroll helpers
    window.__headerHeight = totalOffset;
    window.__safeAreaTop  = 0;
    window.__totalOffset  = totalOffset;
  }

  // Measure on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', measureAndApply);
  } else {
    measureAndApply();
  }

  // Re-measure after full page load (images/fonts may affect header size)
  window.addEventListener('load', measureAndApply);

  // Re-measure on resize (header might change on orientation change)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measureAndApply, 100);
  });

  // Expose scroll-to function that respects header
  window.scrollToContent = function(element, offset = 0) {
    if (!element) return;
    const totalOffset = window.__totalOffset || 0;
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const targetScroll = elementTop - totalOffset - offset;
    window.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    });
  };

  // Intercept scrollIntoView calls on page-view
  const pageView = document.getElementById('page-view');
  if (pageView) {
    const originalScrollIntoView = pageView.scrollIntoView;
    pageView.scrollIntoView = function(options) {
      if (!options) options = {};
      // Use our custom function instead
      window.scrollToContent(this, 0);
      return;
    };
  }

})();