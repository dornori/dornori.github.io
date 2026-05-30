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
      const main = document.querySelector('main#viewport');
      if (main) main.style.paddingTop = '';
      return;
    }

    if (!mobileNav) {
      requestAnimationFrame(measureAndApply);
      return;
    }

    // Step 1: measure fixed nav bar height and expose as CSS var so #main-header margin-top tracks it
    const navRect    = mobileNav.getBoundingClientRect();
    const navHeight  = Math.ceil(navRect.bottom); // fixed at top:0, so bottom = height incl. safe-area
    document.documentElement.style.setProperty('--mobile-nav-height', navHeight + 'px');

    // Step 2: after layout settles with correct margin-top, measure logo header height
    requestAnimationFrame(() => {
      const headerRect   = mainHeader ? mainHeader.getBoundingClientRect() : null;
      const logoHeight   = headerRect ? Math.ceil(headerRect.height) : 0;

      // Total offset = nav bar + logo header (content starts below both)
      const totalOffset  = navHeight + logoHeight;

      const main = document.querySelector('main#viewport');
      if (main) main.style.paddingTop = totalOffset + 'px';

      const pageView = document.getElementById('page-view');
      if (pageView) pageView.style.scrollMarginTop = totalOffset + 'px';

      window.__headerHeight = navHeight;
      window.__safeAreaTop  = 0;
      window.__totalOffset  = totalOffset;
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