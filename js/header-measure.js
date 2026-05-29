(function () {
  var applied = false;

  function apply() {
    var nav = document.querySelector('.mobile-nav') || document.getElementById('main-header');
    if (!nav) return false;
    var bottom = nav.getBoundingClientRect().bottom;
    if (!bottom) return false;
    var main = document.querySelector('main#viewport');
    if (main) main.style.paddingTop = bottom + 'px';
    var pv = document.getElementById('page-view');
    if (pv) pv.style.scrollMarginTop = bottom + 'px';
    window.__totalOffset = bottom;
    applied = true;
    return true;
  }

  // Keep retrying until we get a real measurement
  function tryUntilApplied() {
    if (!apply()) requestAnimationFrame(tryUntilApplied);
  }

  tryUntilApplied();
  document.addEventListener('nav:ready', function () { requestAnimationFrame(apply); });
  window.addEventListener('resize', apply);
  window.measureHeader = apply;
})();
