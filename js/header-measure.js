(function () {
  function apply() {
    var nav = document.querySelector('.mobile-nav') || document.getElementById('main-header');
    if (!nav) return false;
    var rect = nav.getBoundingClientRect();
    console.log('[header-measure] nav rect:', JSON.stringify(rect.toJSON()), 'bottom:', rect.bottom, 'height:', rect.height);
    var bottom = rect.bottom;
    if (!bottom) return false;
    var main = document.querySelector('main#viewport');
    if (main) {
      console.log('[header-measure] setting paddingTop to', bottom + 'px', '(was:', main.style.paddingTop, ')');
      main.style.paddingTop = bottom + 'px';
    }
    window.__totalOffset = bottom;
    return true;
  }

  function tryUntilApplied() {
    if (!apply()) requestAnimationFrame(tryUntilApplied);
  }

  tryUntilApplied();
  document.addEventListener('nav:ready', function () { requestAnimationFrame(apply); });
  window.addEventListener('resize', apply);
  window.measureHeader = apply;
})();
