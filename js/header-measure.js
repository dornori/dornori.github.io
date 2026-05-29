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

  function measureAndApply() {
    // Get actual header element
    const mobileNav = document.querySelector('.mobile-nav');
    const mainHeader = document.querySelector('#main-header');
    const header = mobileNav || mainHeader;

    if (!header) {
      return;
    }

    // Get real computed height of header
    const rect = header.getBoundingClientRect();
    const headerHeight = Math.round(rect.height);

    // Get safe-area-inset-top from computed styles
    const htmlStyle = window.getComputedStyle(document.documentElement);
    const safeAreaTop = parseFloat(htmlStyle.getPropertyValue('--safe-area-inset-top')) || 
                        parseInt(htmlStyle.paddingTop) || 0;

    // Total distance from viewport top to content start (minus 2px for perfect alignment)
    const totalOffset = headerHeight + safeAreaTop - 2;

    // Apply scroll-margin-top to page-view
    const pageView = document.getElementById('page-view');
    if (pageView) {
      pageView.style.scrollMarginTop = totalOffset + 'px';
    }

    // Apply padding-top to main viewport so content doesn't hide behind header
    const main = document.querySelector('main#viewport');
    if (main) {
      if (window.innerWidth <= 768) {
        main.style.paddingTop = totalOffset + 'px';
      } else {
        main.style.paddingTop = '';
      }
    }

    // Store for use in scroll functions
    window.__headerHeight = headerHeight;
    window.__safeAreaTop = safeAreaTop;
    window.__totalOffset = totalOffset;
  }

  // Wait for DOM and nav to be ready, then measure
  function init() {
    // If nav already populated, measure immediately
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav && mobileNav.children.length > 0) {
      measureAndApply();
      return;
    }

    // Otherwise wait for nav to be populated
    let attempts = 0;
    const checkNav = setInterval(() => {
      const nav = document.querySelector('.mobile-nav');
      attempts++;

      if ((nav && nav.children.length > 0) || attempts > 100) {
        clearInterval(checkNav);
        measureAndApply();
      }
    }, 50);
  }

  // Start after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-measure on resize
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

})();
