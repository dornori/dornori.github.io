'use strict';

const FileManager = {
  currentPath: null,
  EDITABLE: new Set(['json','csv','js','html','css','txt','md','svg']),
  SKIP_DIRS: new Set(['admin']),

  async renderTree(path = '', container = null) {
    if (!State.dir) return;
    try {
      const entries = await FS.listDir(path);
      const root = container || document.getElementById('file-tree');
      if (!container) root.innerHTML = '';

      const ul = document.createElement('ul');
      ul.style.cssText = `list-style:none;padding-left:${path ? '14' : '0'}px`;

      for (const entry of entries) {
        if (this.SKIP_DIRS.has(entry.name) && !path) continue;
        const fullPath = path ? `${path}/${entry.name}` : entry.name;
        const li = document.createElement('li');

        if (entry.kind === 'directory') {
          li.innerHTML = `<span class="tree-dir" data-path="${fullPath}" data-open="false" onclick="FileManager.toggleDir(this,'${fullPath}')">▶ ${escHtml(entry.name)}/</span>`;
        } else {
          const ext = entry.name.split('.').pop().toLowerCase();
          const editable = this.EDITABLE.has(ext);
          const color = editable ? 'var(--blue)' : 'var(--text-3)';
          li.innerHTML = `<div class="tree-file" style="padding-left:14px">
            <span class="tree-file-name" style="color:${color}" onclick="${editable ? `FileManager.openFile('${fullPath}')` : ''}">${escHtml(entry.name)}</span>
            <span class="tree-file-actions">
              <button class="tree-file-btn" onclick="FileManager.promptRenameAt('${fullPath}')" title="Rename">✎</button>
              <button class="tree-file-btn danger" onclick="FileManager.deleteAt('${fullPath}')" title="Delete">✕</button>
            </span>
          </div>`;
        }
        ul.appendChild(li);
      }
      root.appendChild(ul);
    } catch (e) { console.warn('Tree:', e); }
  },

  async toggleDir(el, path) {
    if (el.dataset.open === 'true') {
      el.dataset.open = 'false';
      el.textContent = '▶ ' + path.split('/').pop() + '/';
      el.nextElementSibling?.remove();
    } else {
      el.dataset.open = 'true';
      el.textContent = '▼ ' + path.split('/').pop() + '/';
      const sub = document.createElement('div');
      el.after(sub);
      await this.renderTree(path, sub);
    }
  },

  async openFile(path) {
    try {
      const text = await FS.read(path);
      this.currentPath = path;
      document.getElementById('file-editor-path').textContent = path;
      document.getElementById('file-editor').value = text;
      document.getElementById('file-save-btn').style.display = '';
      document.getElementById('fm-rename-btn').style.display = '';
      document.getElementById('fm-delete-btn').style.display = '';
    } catch (e) { toast('Cannot read: ' + e.message, 'error'); }
  },

  async saveFile() {
    if (!this.currentPath) return;
    try {
      await FS.write(this.currentPath, document.getElementById('file-editor').value);
      toast('Saved: ' + this.currentPath, 'success');
      // Reload relevant state after direct edits
      if (this.currentPath === 'data/products.json') {
        try { State.products = JSON.parse(document.getElementById('file-editor').value); Products.render(); Dashboard.render(); } catch {}
      }
    } catch (e) { toast('Save failed: ' + e.message, 'error'); }
  },

  async promptCreate() {
    const name = await showInput('New File', 'e.g. data/my-file.json');
    if (!name) return;
    try {
      await FS.write(name, '');
      toast('Created: ' + name, 'success');
      this.renderTree();
      this.openFile(name);
    } catch (e) { toast('Create failed: ' + e.message, 'error'); }
  },

  async promptRename() {
    if (!this.currentPath) return;
    await this.promptRenameAt(this.currentPath);
  },

  async promptRenameAt(path) {
    const oldName = path.split('/').pop();
    const newName = await showInput('Rename File', 'New filename', oldName);
    if (!newName || newName === oldName) return;
    try {
      const newPath = await FS.rename(path, newName);
      toast(`Renamed to ${newName}`, 'success');
      if (this.currentPath === path) {
        this.currentPath = newPath;
        document.getElementById('file-editor-path').textContent = newPath;
      }
      this.renderTree();
    } catch (e) { toast('Rename failed: ' + e.message, 'error'); }
  },

  async deleteFile() {
    if (!this.currentPath) return;
    await this.deleteAt(this.currentPath);
  },

  async deleteAt(path) {
    if (!await showConfirm('Delete File', `Delete "${path}"? This cannot be undone.`, 'Delete')) return;
    try {
      await FS.remove(path);
      toast('Deleted: ' + path, 'info');
      if (this.currentPath === path) {
        this.currentPath = null;
        document.getElementById('file-editor-path').textContent = 'Select a file…';
        document.getElementById('file-editor').value = '';
        document.getElementById('file-save-btn').style.display = 'none';
        document.getElementById('fm-rename-btn').style.display = 'none';
        document.getElementById('fm-delete-btn').style.display = 'none';
      }
      this.renderTree();
    } catch (e) { toast('Delete failed: ' + e.message, 'error'); }
  },

  promptUpload() {
    document.getElementById('fm-upload-input').click();
  },

  async handleUpload(input) {
    const files = [...input.files];
    if (!files.length) return;
    // Upload into current directory context (root if no file selected)
    const dir = this.currentPath ? this.currentPath.split('/').slice(0, -1).join('/') : '';
    let done = 0;
    for (const file of files) {
      const path = dir ? `${dir}/${file.name}` : file.name;
      try {
        await FS.writeBlob(path, file);
        done++;
      } catch (e) { toast(`Failed: ${file.name}`, 'error'); }
    }
    toast(`Uploaded ${done} file(s)`, 'success');
    this.renderTree();
    input.value = ''; // reset so same files can be re-uploaded
  }
};
