'use strict';

const FS = {
  async pick() {
    try {
      State.dir = await window.showDirectoryPicker({ mode: 'readwrite' });
      document.getElementById('fs-setup').style.display = 'none';
      await App.loadAll();
    } catch (e) {
      if (e.name !== 'AbortError') toast('Folder access failed: ' + e.message, 'error');
    }
  },

  // Resolve a handle by path string like "data/products.json"
  async _resolve(path, create = false) {
    const parts = path.split('/').filter(Boolean);
    let handle = State.dir;
    for (const p of parts.slice(0, -1)) {
      handle = await handle.getDirectoryHandle(p, { create });
    }
    return { parent: handle, name: parts.at(-1) };
  },

  async read(path) {
    const { parent, name } = await this._resolve(path);
    const fh = await parent.getFileHandle(name);
    return (await fh.getFile()).text();
  },

  async write(path, text) {
    const { parent, name } = await this._resolve(path, true);
    const fh = await parent.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(text);
    await w.close();
  },

  async writeBlob(path, blob) {
    const { parent, name } = await this._resolve(path, true);
    const fh = await parent.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(blob);
    await w.close();
  },

  async remove(path) {
    const { parent, name } = await this._resolve(path);
    await parent.removeEntry(name, { recursive: true });
  },

  async rename(oldPath, newName) {
    // FSAPI doesn't support rename directly — read+write+delete
    const text = await this.read(oldPath);
    const dir = oldPath.split('/').slice(0, -1).join('/');
    const newPath = dir ? dir + '/' + newName : newName;
    await this.write(newPath, text);
    await this.remove(oldPath);
    return newPath;
  },

  async listDir(path = '') {
    let handle = State.dir;
    if (path) {
      for (const p of path.split('/').filter(Boolean)) {
        handle = await handle.getDirectoryHandle(p);
      }
    }
    const entries = [];
    for await (const [name, h] of handle.entries()) {
      entries.push({ name, kind: h.kind });
    }
    return entries.sort((a, b) =>
      a.kind !== b.kind ? (a.kind === 'directory' ? -1 : 1) : a.name.localeCompare(b.name)
    );
  }
};
