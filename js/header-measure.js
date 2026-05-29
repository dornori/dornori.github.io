(function () {
  function apply() {
    var nav = document.querySelector('.mobile-nav') || document.getElementById('main-header');
    if (!nav) return;
    var h = nav.getBoundingClientRect().height;
    if (!h) return;
    var main = document.querySelector('main#viewport');
    if (main) main.style.paddingTop = h + 'px';
    var pv = document.getElementById('page-view');
    if (pv) pv.style.scrollMarginTop = h + 'px';
    window.__totalOffset = h;
  }

  // Try immediately in case nav:ready already fired before this script loaded
  apply();

  // Also listen for nav:ready in case we loaded first
  document.addEventListener('nav:ready', function () {
    requestAnimationFrame(apply);
  });

  window.addEventListener('resize', apply);
  window.addEventListener('load', apply);
  window.measureHeader = apply;
})();
