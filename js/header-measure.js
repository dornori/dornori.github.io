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
    if (window.innerWidth > 768) {
      // Desktop: clear any mobile overrides
      const main = document.querySelector('main#viewport');
      if (main) main.style.paddingTop = '';
      return;
    }

    const mainHeader = document.querySelector('#main-header');
    const mobileNav  = document.querySelector('.mobile-nav');

    if (!mainHeader || !mobileNav) {
      requestAnimationFrame(measureAndApply);
      return;
    }

    // Step 1: measure the logo header height (includes safe-area-inset-top)
    const headerRect   = mainHeader.getBoundingClientRect();
    const headerHeight = Math.ceil(headerRect.height);

    // Step 2: push mobile-nav down so it sits directly below the logo header
    document.documentElement.style.setProperty('--mobile-header-height', headerHeight + 'px');

    // Step 3: after layout settles, measure the bottom of the mobile nav bar
    requestAnimationFrame(() => {
      const navRect    = mobileNav.getBoundingClientRect();
      const totalOffset = Math.ceil(navRect.bottom);

      // Apply padding-top to main so content starts below the full fixed header
      const main = document.querySelector('main#viewport');
      if (main) {
        main.style.paddingTop = totalOffset + 'px';
      }

      const pageView = document.getElementById('page-view');
      if (pageView) {
        pageView.style.scrollMarginTop = totalOffset + 'px';
      }

      window.__headerHeight = headerHeight;
      window.__safeAreaTop  = 0; // already baked into headerHeight via env()
      window.__totalOffset  = totalOffset;
      document.documentElement.style.setProperty('--mobile-total-offset', totalOffset + 'px');
    });
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