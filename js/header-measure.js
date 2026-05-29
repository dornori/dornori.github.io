(function () {
  function apply() {
    var nav = document.querySelector('.mobile-nav') || document.getElementById('main-header');
    if (!nav) return false;
    var rect = nav.getBoundingClientRect();
    var h = rect.height;
    console.log('[header-measure] top:', rect.top, 'height:', rect.height, 'bottom:', rect.bottom, '=> padding:', rect.top + rect.height);
    if (!h || nav.children.length === 0) return false;
    // top = offset pushed down by topBar; height = nav's own size; together = where nav bottom actually is
    var padding = rect.top + rect.height;
    var main = document.querySelector('main#viewport');
    if (main) main.style.paddingTop = padding + 'px';
    window.__totalOffset = padding;
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
