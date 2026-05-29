/**
 * header-measure.js
 * Measures the actual rendered header height and applies it as:
 *   - padding-top on main#viewport (so content clears the fixed header)
 *   - scroll-margin-top on #page-view (so scroll-into-view lands correctly)
 *   - window.__headerHeight / __totalOffset for use by page-loader scroll calls
 *
 * Timing: must run AFTER the nav is populated (nav:ready event) because
 * #main-header exists in HTML immediately but has no content/height until
 * nav-loader.js renders into it.
 */

(function () {
  'use strict';

  function measureAndApply() {
    var header = document.querySelector('.mobile-nav') || document.getElementById('main-header');
    if (!header) return;

    var headerHeight = Math.round(header.getBoundingClientRect().height);
    // If header has no height yet, bail — we'll be called again via nav:ready
    if (headerHeight === 0) return;

    // getBoundingClientRect().height already includes the nav's own
    // padding-top:env(safe-area-inset-top), so don't add it again.
    var totalOffset  = headerHeight;

    // Store for page-loader scroll calls
    window.__headerHeight = headerHeight;
    window.__safeAreaTop  = 0;
    window.__totalOffset  = totalOffset;

    // Push content below fixed header on mobile
    var main = document.querySelector('main#viewport');
    if (main) {
      if (window.innerWidth <= 768) {
        main.style.paddingTop = totalOffset + 'px';
      } else {
        main.style.paddingTop = '';
      }
    }

    // Ensure scrolled-to sections clear the header
    var pageView = document.getElementById('page-view');
    if (pageView) {
      pageView.style.scrollMarginTop = totalOffset + 'px';
    }
  }

  // Primary trigger: nav is fully rendered and header has real dimensions
  document.addEventListener('nav:ready', function () {
    // One rAF so layout has settled after nav render
    requestAnimationFrame(measureAndApply);
  });

  // Re-measure on resize / orientation change
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measureAndApply, 100);
  });

  // Fallback: if nav:ready never fires, measure after full page load
  window.addEventListener('load', measureAndApply);

  // Expose for external callers
  window.measureHeader = measureAndApply;

  // Scroll helper that respects header offset
  window.scrollToContent = function (element, extra) {
    if (!element) return;
    var offset = window.__totalOffset || 0;
    var top = element.getBoundingClientRect().top + window.scrollY - offset - (extra || 0);
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

})();
