'use strict';

function toast(msg, type = 'info', duration = 3200) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-dot"></span>${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function showConfirm(title, msg, okLabel = 'Confirm') {
  return new Promise(resolve => {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = msg;
    document.getElementById('confirm-ok').textContent = okLabel;
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('open');
    const ok = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');
    const done = r => { modal.classList.remove('open'); resolve(r); };
    ok.onclick = () => done(true);
    cancel.onclick = () => done(false);
  });
}

function showInput(title, placeholder = '', defaultVal = '') {
  return new Promise(resolve => {
    document.getElementById('input-modal-title').textContent = title;
    const inp = document.getElementById('input-modal-value');
    inp.placeholder = placeholder;
    inp.value = defaultVal;
    const modal = document.getElementById('input-modal');
    modal.classList.add('open');
    setTimeout(() => inp.focus(), 50);
    const done = r => { modal.classList.remove('open'); resolve(r); };
    document.getElementById('input-ok').onclick = () => done(inp.value.trim());
    document.getElementById('input-cancel').onclick = () => done(null);
    inp.onkeydown = e => { if (e.key === 'Enter') done(inp.value.trim()); if (e.key === 'Escape') done(null); };
  });
}

function markDirty(file) {
  State.dirty.add(file);
  const el = document.getElementById('tb-status');
  el.textContent = `${State.dirty.size} unsaved`;
  el.className = 'tb-status unsaved';
}

function markClean() {
  State.dirty.clear();
  const el = document.getElementById('tb-status');
  el.textContent = 'All saved';
  el.className = 'tb-status';
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
