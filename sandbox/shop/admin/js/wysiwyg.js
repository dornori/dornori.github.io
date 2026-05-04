'use strict';

const WY = {
  currentPath: null,
  mode: 'visual',       // 'visual' | 'source'
  _dirty: false,

  // ── INIT: scan shop for HTML files and populate the list ──────────────────
  async init() {
    if (!State.dir) return;
    const list = document.getElementById('wysiwyg-file-list');
    list.innerHTML = '';
    const files = await this._findHtml('');
    if (!files.length) {
      list.innerHTML = '<div style="color:var(--text-3);font-size:.78rem;padding:8px">No HTML files found</div>';
      return;
    }
    files.forEach(path => {
      const el = document.createElement('div');
      el.className = 'wy-file-item';
      el.title = path;
      el.textContent = path;
      el.onclick = () => this.open(path);
      list.appendChild(el);
    });
  },

  async _findHtml(dir, results = []) {
    try {
      const entries = await FS.listDir(dir);
      for (const e of entries) {
        if (e.name === 'admin') continue; // skip ourselves
        const full = dir ? `${dir}/${e.name}` : e.name;
        if (e.kind === 'directory') {
          await this._findHtml(full, results);
        } else if (e.name.endsWith('.html')) {
          results.push(full);
        }
      }
    } catch {}
    return results;
  },

  // ── OPEN FILE ─────────────────────────────────────────────────────────────
  async open(path) {
    if (this._dirty && this.currentPath) {
      const ok = await showConfirm('Unsaved changes', 'You have unsaved changes. Discard and open new file?', 'Discard');
      if (!ok) return;
    }

    try {
      const raw = await FS.read(path);
      this.currentPath = path;
      this._dirty = false;

      // Extract <body> content if full HTML document, else use raw
      const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const content = bodyMatch ? bodyMatch[1].trim() : raw;

      document.getElementById('wysiwyg-canvas').innerHTML = content;
      document.getElementById('wysiwyg-source').value = content;
      document.getElementById('wysiwyg-filename').textContent = path;

      // Highlight active file
      document.querySelectorAll('.wy-file-item').forEach(el => {
        el.classList.toggle('active', el.textContent === path);
      });

      // Stay in current mode
      this.setMode(this.mode);
    } catch (e) { toast('Cannot open: ' + e.message, 'error'); }
  },

  // ── SAVE ──────────────────────────────────────────────────────────────────
  async save() {
    if (!this.currentPath) return toast('No file open', 'error');

    // Sync source→canvas or canvas→source depending on mode
    if (this.mode === 'source') {
      document.getElementById('wysiwyg-canvas').innerHTML =
        document.getElementById('wysiwyg-source').value;
    }

    const editedBody = document.getElementById('wysiwyg-canvas').innerHTML;

    try {
      // Read original file to preserve <head>, doctype, etc.
      const original = await FS.read(this.currentPath);
      let output;

      if (/<body/i.test(original)) {
        // Replace only the body content
        output = original.replace(
          /(<body[^>]*>)([\s\S]*?)(<\/body>)/i,
          (_, open, _body, close) => open + '\n' + editedBody + '\n' + close
        );
      } else {
        // No <body> tag — file is a fragment, overwrite directly
        output = editedBody;
      }

      await FS.write(this.currentPath, output);
      this._dirty = false;
      toast('Saved: ' + this.currentPath, 'success');
    } catch (e) { toast('Save failed: ' + e.message, 'error'); }
  },

  // ── MODE TOGGLE: visual ↔ source ─────────────────────────────────────────
  setMode(m) {
    const canvas = document.getElementById('wysiwyg-canvas');
    const source = document.getElementById('wysiwyg-source');
    const toolbar = document.getElementById('wysiwyg-toolbar');

    if (m === 'source') {
      // Sync canvas → source
      source.value = canvas.innerHTML;
      canvas.style.display = 'none';
      source.style.display = '';
      // Dim formatting buttons
      toolbar.querySelectorAll('.wy-btn:not(#wy-mode-visual):not(#wy-mode-source)').forEach(b => b.style.opacity = '.3');
    } else {
      // Sync source → canvas
      if (this.mode === 'source') canvas.innerHTML = source.value;
      source.style.display = 'none';
      canvas.style.display = '';
      toolbar.querySelectorAll('.wy-btn').forEach(b => b.style.opacity = '');
    }

    this.mode = m;
    document.getElementById('wy-mode-visual').classList.toggle('active', m === 'visual');
    document.getElementById('wy-mode-source').classList.toggle('active', m === 'source');
  },

  // ── EXEC COMMAND ─────────────────────────────────────────────────────────
  exec(cmd, val = null) {
    if (this.mode !== 'visual') return;
    document.getElementById('wysiwyg-canvas').focus();
    document.execCommand(cmd, false, val);
    this.onEdit();
  },

  // ── INSERT LINK ───────────────────────────────────────────────────────────
  async insertLink() {
    const sel = window.getSelection();
    const selectedText = sel?.toString() || '';
    const url = await showInput('Insert Link', 'https://…', 'https://');
    if (!url) return;
    const text = selectedText || url;
    if (selectedText) {
      this.exec('createLink', url);
    } else {
      this._insertHtml(`<a href="${escHtml(url)}">${escHtml(text)}</a>`);
    }
  },

  // ── INSERT IMAGE ──────────────────────────────────────────────────────────
  async insertImage() {
    const url = await showInput('Insert Image URL', 'https://… or relative path');
    if (!url) return;
    this._insertHtml(`<img src="${escHtml(url)}" alt="" style="max-width:100%">`);
  },

  _insertHtml(html) {
    document.getElementById('wysiwyg-canvas').focus();
    document.execCommand('insertHTML', false, html);
    this.onEdit();
  },

  // ── UNDO / REDO ───────────────────────────────────────────────────────────
  undo() { document.execCommand('undo'); },
  redo() { document.execCommand('redo'); },

  // ── DIRTY TRACKING ───────────────────────────────────────────────────────
  onEdit() {
    this._dirty = true;
    markDirty(this.currentPath || 'wysiwyg');
  },

  onSourceEdit() {
    this._dirty = true;
  }
};

// Auto-init when the WYSIWYG nav item is clicked
document.querySelector('[data-view="wysiwyg"]')?.addEventListener('click', () => {
  setTimeout(() => WY.init(), 50);
});
