/**
 * header-measure.js
 * ─────────────────────────────────────────────────────────────────────────────
 * On mobile, both #main-header (logo) and .mobile-nav (icons) are position:fixed.
 * This script measures their combined height after the logo image has loaded,
 * then sets two CSS custom properties that cascade through the entire layout:
 *
 *   --mobile-logo-height   → pushes .mobile-nav below the logo
 *   --mobile-total-offset  → pushes main content below both
 *
 * On desktop, fixed positioning is not used so no measurement is needed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function() {
  'use strict';

  function measureAndApply() {
    if (window.innerWidth > 768) {
      document.documentElement.style.removeProperty('--mobile-logo-height');
      document.documentElement.style.removeProperty('--mobile-total-offset');
      return;
    }

    const logoImg    = document.querySelector('.billboard-logo');
    const mainHeader = document.querySelector('#main-header');
    const mobileNav  = document.querySelector('.mobile-nav');

    if (!mainHeader || !mobileNav) {
      requestAnimationFrame(measureAndApply);
      return;
    }

    const doMeasure = () => {
      setTimeout(() => {
        // Step 1: measure logo header height and set CSS var so nav repositions
        const logoHeight = mainHeader.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--mobile-logo-height', logoHeight + 'px');

        // Step 2: after nav has repositioned, measure its bottom edge as total offset
        requestAnimationFrame(() => {
          const totalOffset = mobileNav.getBoundingClientRect().bottom;
          document.documentElement.style.setProperty('--mobile-total-offset', totalOffset + 'px');

          // Store for scrollToContent helper
          window.__totalOffset = totalOffset;

          console.log('[header-measure] logoHeight:', logoHeight, 'totalOffset:', totalOffset);
        });
      }, 250);
    };

    if (logoImg && !logoImg.complete) {
      logoImg.addEventListener('load', doMeasure, { once: true });
    } else {
      doMeasure();
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', measureAndApply);
  } else {
    measureAndApply();
  }

  // Re-measure after full page load
  window.addEventListener('load', measureAndApply);

  // Re-measure on resize / orientation change
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measureAndApply, 100);
  });

  // Scroll helper that respects the fixed header offset
  window.scrollToContent = function(element, offset = 0) {
    if (!element) return;
    const totalOffset = window.__totalOffset || 0;
    const elementTop  = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: Math.max(0, elementTop - totalOffset - offset),
      behavior: 'smooth'
    });
  };

  // Intercept scrollIntoView on page-view
  const pageView = document.getElementById('page-view');
  if (pageView) {
    pageView.scrollIntoView = function() {
      window.scrollToContent(this, 0);
    };
  }

})();
