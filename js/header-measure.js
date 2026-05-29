(function () {
  function apply() {
    var nav = document.querySelector('.mobile-nav') || document.getElementById('main-header');
    if (!nav) return;
    // .bottom = distance from viewport top to bottom edge of nav = exact padding needed
    var bottom = nav.getBoundingClientRect().bottom;
    if (!bottom) return;
    var main = document.querySelector('main#viewport');
    if (main) main.style.paddingTop = bottom + 'px';
    var pv = document.getElementById('page-view');
    if (pv) pv.style.scrollMarginTop = bottom + 'px';
    window.__totalOffset = bottom;
  }

  apply();
  document.addEventListener('nav:ready', function () { requestAnimationFrame(apply); });
  window.addEventListener('resize', apply);
  window.addEventListener('load', apply);
  window.measureHeader = apply;
})();
