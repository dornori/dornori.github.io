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

  // Create a reference element to measure safe area
  const createSafeAreaMeasure = () => {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      padding-top: env(safe-area-inset-top);
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
      pointer-events: none;
      visibility: hidden;
    `;
    return el;
  };

  const safeAreaEl = createSafeAreaMeasure();

  // Measure and apply header offset
  function measureAndApply() {
    // Get actual header element
    const mobileNav = document.querySelector('.mobile-nav');
    const mainHeader = document.querySelector('#main-header');
    const header = mobileNav || mainHeader;

    if (!header) {
      // If header doesn't exist yet, retry
      requestAnimationFrame(measureAndApply);
      return;
    }

    // Measure all candidate elements so we can identify which matches reality
    const rect = header.getBoundingClientRect();
    const navHeight = rect.height;

    const elMainHeader    = document.querySelector('#main-header');
    const elLogoWrap      = document.querySelector('.billboard-logo-wrap');
    const elLogoImg       = document.querySelector('.billboard-logo');
    const elTopNav        = document.querySelector('.top-nav');
    const elMobileNavItem = document.querySelector('.mobile-nav-item');
    const elMobileNavIcon = document.querySelector('.mobile-nav-icon');

    const hMainHeader    = elMainHeader    ? elMainHeader.getBoundingClientRect().height    : 'n/a';
    const hLogoWrap      = elLogoWrap      ? elLogoWrap.getBoundingClientRect().height      : 'n/a';
    const hLogoImg       = elLogoImg       ? elLogoImg.getBoundingClientRect().height       : 'n/a';
    const hTopNav        = elTopNav        ? elTopNav.getBoundingClientRect().height        : 'n/a';
    const hMobileNavItem = elMobileNavItem ? elMobileNavItem.getBoundingClientRect().height : 'n/a';
    const hMobileNavIcon = elMobileNavIcon ? elMobileNavIcon.getBoundingClientRect().height : 'n/a';

    console.log('[header-measure] navHeight:', navHeight);
    console.log('[header-measure] #main-header:', hMainHeader);
    console.log('[header-measure] .billboard-logo-wrap:', hLogoWrap);
    console.log('[header-measure] .billboard-logo (img):', hLogoImg);
    console.log('[header-measure] .top-nav:', hTopNav);
    console.log('[header-measure] .mobile-nav-item:', hMobileNavItem);
    console.log('[header-measure] .mobile-nav-icon:', hMobileNavIcon);

    const headerHeight = Math.round(rect.height) - 46.5;

    // Get safe-area-inset-top
    const styles = window.getComputedStyle(safeAreaEl);
    const safeAreaTop = parseFloat(styles.paddingTop) || 0;

    // Total distance from viewport top to content start
    const totalOffset = headerHeight + safeAreaTop;

    // Apply scroll-margin-top to page-view so scroll-into-view has proper spacing
    const pageView = document.getElementById('page-view');
    if (pageView) {
      pageView.style.scrollMarginTop = totalOffset + 'px';
    }

    // Apply padding-top to main viewport so content doesn't hide behind header
    const main = document.querySelector('main#viewport');
    if (main) {
      // Only override on mobile where this is critical
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