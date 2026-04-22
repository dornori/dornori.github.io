'use strict';

// ── KEYBOARD SHORTCUTS ─────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    App.save();
  }
  if (e.key === 'Escape') {
    document.getElementById('product-modal').classList.remove('open');
    document.getElementById('confirm-modal').classList.remove('open');
    document.getElementById('input-modal').classList.remove('open');
  }
});

// ── BOOT ───────────────────────────────────────────────────────────────────
(function init() {
  if (!window.showDirectoryPicker) {
    document.getElementById('fs-hint').textContent =
      '⚠ File System Access API not available in this browser. Use Chrome, Edge, or Brave.';
    document.getElementById('fs-setup').querySelector('button').disabled = true;
    return;
  }
  // Always show FS setup on load — user must re-grant each session (browser security requirement)
  document.getElementById('fs-setup').style.display = 'flex';
})();
