(function () {
  function apply() {
    var nav = document.querySelector('.mobile-nav') || document.getElementById('main-header');
    if (!nav) return false;
    var rect = nav.getBoundingClientRect();
    var h = rect.bottom - rect.top - rect.y + rect.top;
    // bottom minus where it actually starts from viewport top
    h = rect.bottom - Math.max(0, rect.y);
    console.log('[header-measure] rect.y:', rect.y, 'rect.bottom:', rect.bottom, 'rect.height:', rect.height, '=> using:', h);
    if (!h) return false;
    var main = document.querySelector('main#viewport');
    if (main) main.style.paddingTop = h + 'px';
    window.__totalOffset = h;
    return true;
  }

  function tryUntilApplied() {
    if (!apply()) requestAnimationFrame(tryUntilApplied);
  }

  tryUntilApplied();
  document.addEventListener('nav:ready', function () { requestAnimationFrame(apply); });
  document.addEventListener('home:ready', function () { requestAnimationFrame(apply); });
  document.addEventListener('page:ready', function () { requestAnimationFrame(apply); });
  window.addEventListener('resize', apply);
  window.measureHeader = apply;
})();
