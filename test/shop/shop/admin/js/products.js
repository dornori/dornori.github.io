'use strict';

const Products = {
  render() {
    const cats = [...new Set(State.products.map(p => p.category).filter(Boolean))];
    document.getElementById('product-cat').innerHTML =
      '<option value="">All Categories</option>' + cats.map(c => `<option>${escHtml(c)}</option>`).join('');
    this.filter();
  },

  filter() {
    const q = document.getElementById('product-search').value.toLowerCase();
    const cat = document.getElementById('product-cat').value;
    const sf = document.getElementById('product-stock').value;

    const list = State.products.filter(p => {
      const name = (State.langProducts.en?.[p.id]?.name || p.id).toLowerCase();
      if (q && !name.includes(q) && !p.id.includes(q)) return false;
      if (cat && p.category !== cat) return false;
      const stk = this._stock(p);
      if (sf === 'low' && !(stk > 0 && stk <= 5)) return false;
      if (sf === 'out' && stk !== 0) return false;
      if (sf === 'ok' && stk <= 0) return false;
      return true;
    });

    document.getElementById('products-tbody').innerHTML = list.map(p => {
      const name = escHtml(State.langProducts.en?.[p.id]?.name || p.id);
      const stk = this._stock(p);
      const badge = stk === 0
        ? `<span class="badge badge-red">Out</span>`
        : stk <= 5 ? `<span class="badge badge-gold">${stk}</span>`
        : `<span class="badge badge-green">${stk}</span>`;
      return `<tr style="cursor:pointer" onclick="Products.openEdit('${p.id}')">
        <td><div class="product-img-cell">
          <img class="img-thumb" src="${escHtml(p.image||'')}" onerror="this.style.display='none'" loading="lazy">
          <div><div style="font-weight:500">${name}</div><div class="td-mono">${escHtml(p.id)}</div></div>
        </div></td>
        <td><span class="badge badge-gray">${escHtml(p.category||'—')}</span></td>
        <td>€${(p.price||0).toFixed(2)}</td>
        <td>${badge}</td>
        <td>${p.featured ? '<span class="badge badge-gold">Featured</span>' : ''}</td>
        <td onclick="event.stopPropagation()"><div class="td-actions">
          <button class="btn-icon" onclick="Products.openEdit('${p.id}')" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon" onclick="Products.duplicate('${p.id}')" title="Duplicate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="btn-icon" onclick="Products.delete('${p.id}')" title="Delete" style="color:var(--red)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div></td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:40px">No products found</td></tr>`;
  },

  _stock(p) {
    if (p.variants?.length) return p.variants.reduce((s, v) => s + (v.stock || 0), 0);
    return p.stock ?? 0;
  },

  openNew() {
    State.editingProduct = null;
    document.getElementById('product-modal-title').textContent = 'New Product';
    this._fill({ url: 'product.html', stock: 0, price: 0, weight: 0 });
    this.tab(document.querySelector('#product-tabs .tab'), 'general');
    document.getElementById('product-modal').classList.add('open');
  },

  openEdit(id) {
    const p = State.products.find(x => x.id === id);
    if (!p) return;
    State.editingProduct = id;
    document.getElementById('product-modal-title').textContent = 'Edit: ' + (State.langProducts.en?.[id]?.name || id);
    this._fill(p);
    this.tab(document.querySelector('#product-tabs .tab'), 'general');
    document.getElementById('product-modal').classList.add('open');
  },

  closeModal() {
    document.getElementById('product-modal').classList.remove('open');
  },

  tab(el, name) {
    document.querySelectorAll('#product-tabs .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    ['general','media','variants','colors','relations','specs'].forEach(t => {
      document.getElementById('product-tab-' + t).style.display = t === name ? '' : 'none';
    });
  },

  _fill(p) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
    set('p-id', p.id); set('p-category', p.category); set('p-price', p.price);
    set('p-weight', p.weight); set('p-stock', p.stock); set('p-url', p.url);
    set('p-image', p.image); set('p-bundleDiscount', p.bundleDiscount);
    set('p-images', (p.images||[]).join('\n'));
    set('p-videos', (p.videos||[]).join('\n'));
    set('p-bundled', (p.bundled||[]).join(', '));
    set('p-related', (p.related||[]).join(', '));
    set('p-addons', (p.addons||[]).join(', '));
    set('p-dim-l', p.dimensions?.l); set('p-dim-w', p.dimensions?.w); set('p-dim-h', p.dimensions?.h);
    document.getElementById('p-featured').checked = !!p.featured;

    // Image preview
    this.previewImage(p.image);

    // Variants
    document.getElementById('variants-list').innerHTML =
      (p.variants||[]).map((v,i) => this._variantRow(v,i)).join('');

    // Colors
    document.getElementById('colors-list').innerHTML =
      (p.colors||[]).map((c,i) => this._colorRow(c, p.colors_soldout?.includes(c), i)).join('');

    // Specs
    document.getElementById('specs-list').innerHTML =
      (p.specs||[]).map((s,i) => this._specRow(s,i)).join('');

    // Available IDs
    document.getElementById('available-ids').innerHTML = State.products
      .filter(x => x.id !== p.id)
      .map(x => `<span onclick="navigator.clipboard.writeText('${x.id}');toast('Copied','info',1200)" title="Click to copy">${escHtml(x.id)}</span>`)
      .join('');
  },

  previewImage(url) {
    const box = document.getElementById('p-image-preview');
    if (!box) return;
    box.innerHTML = url ? `<img src="${escHtml(url)}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">` : '';
  },

  _variantRow(v={}, i) {
    return `<div class="dyn-row" style="grid-template-columns:1fr 1fr 80px 80px 1fr 32px">
      <input type="text" placeholder="id" value="${escHtml(v.id||'')}" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')">
      <input type="text" placeholder="Label" value="${escHtml(v.label||'')}">
      <input type="number" placeholder="Price" value="${v.price||''}" min="0" step="0.01">
      <input type="number" placeholder="Stock" value="${v.stock||''}" min="0">
      <input type="url" placeholder="Image URL" value="${escHtml(v.image||'')}">
      <button class="btn-icon" style="color:var(--red)" onclick="this.closest('.dyn-row').remove()">✕</button>
    </div>`;
  },

  _colorRow(c='', soldout=false, i) {
    return `<div class="dyn-row" style="grid-template-columns:1fr auto auto">
      <input type="text" placeholder="e.g. Smoke" value="${escHtml(c)}">
      <label class="form-check"><input type="checkbox" ${soldout?'checked':''}> Sold out</label>
      <button class="btn-icon" style="color:var(--red)" onclick="this.closest('.dyn-row').remove()">✕</button>
    </div>`;
  },

  _specRow(s={}, i) {
    const rows = (s.rows||[]).map(r => r.join(' | ')).join('\n');
    return `<div class="accordion open">
      <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
        <input type="text" placeholder="Section title" value="${escHtml(s.title||'')}" style="background:none;border:none;color:var(--text);font-size:.84rem;flex:1;outline:none" onclick="event.stopPropagation()">
        <button class="btn-icon" style="color:var(--red);margin-left:8px" onclick="event.stopPropagation();this.closest('.accordion').remove()">✕</button>
      </div>
      <div class="accordion-body">
        <label>Rows (Key | Value per line)</label>
        <textarea rows="4" placeholder="Light Source | LED&#10;Bulb Base | E27" style="margin-top:6px">${escHtml(rows)}</textarea>
      </div>
    </div>`;
  },

  addVariant() { document.getElementById('variants-list').insertAdjacentHTML('beforeend', this._variantRow()); },
  addColor()   { document.getElementById('colors-list').insertAdjacentHTML('beforeend', this._colorRow()); },
  addSpec()    { document.getElementById('specs-list').insertAdjacentHTML('beforeend', this._specRow()); },

  _read() {
    const g = id => document.getElementById(id)?.value?.trim() || '';
    const list = s => s ? s.split(',').map(x=>x.trim()).filter(Boolean) : [];

    const variants = [...document.querySelectorAll('#variants-list .dyn-row')].map(row => {
      const [id, label, price, stock, image] = [...row.querySelectorAll('input')].map(i => i.value.trim());
      return { id, label, price: +price, stock: +stock, image };
    }).filter(v => v.id);

    const colorsData = [...document.querySelectorAll('#colors-list .dyn-row')].map(row => ({
      name: row.querySelector('input[type=text]').value.trim(),
      soldout: row.querySelector('input[type=checkbox]').checked
    })).filter(c => c.name);

    const specs = [...document.querySelectorAll('#specs-list .accordion')].map(row => ({
      title: row.querySelector('.accordion-header input').value.trim(),
      rows: (row.querySelector('textarea').value.trim() || '').split('\n')
        .map(l => l.split('|').map(x=>x.trim())).filter(r => r.length >= 2)
    })).filter(s => s.title);

    const p = {
      id: g('p-id'), price: +g('p-price')||0, weight: +g('p-weight')||0,
      stock: +g('p-stock')||0, category: g('p-category'),
      featured: document.getElementById('p-featured').checked,
      image: g('p-image'), url: g('p-url'),
    };

    const images = g('p-images').split('\n').map(s=>s.trim()).filter(Boolean);
    if (images.length) p.images = images;
    const videos = g('p-videos').split('\n').map(s=>s.trim()).filter(Boolean);
    if (videos.length) p.videos = videos;
    if (variants.length) p.variants = variants;
    if (colorsData.length) {
      p.colors = colorsData.map(c=>c.name);
      const so = colorsData.filter(c=>c.soldout).map(c=>c.name);
      if (so.length) p.colors_soldout = so;
    }
    const bundled = list(g('p-bundled')); if (bundled.length) p.bundled = bundled;
    const related = list(g('p-related')); if (related.length) p.related = related;
    const addons  = list(g('p-addons'));  if (addons.length)  p.addons  = addons;
    const bd = +g('p-bundleDiscount');    if (bd) p.bundleDiscount = bd;
    if (specs.length) p.specs = specs;
    const dl=g('p-dim-l'), dw=g('p-dim-w'), dh=g('p-dim-h');
    if (dl||dw||dh) p.dimensions = { l:+dl||0, w:+dw||0, h:+dh||0 };
    return p;
  },

  saveProduct() {
    const p = this._read();
    if (!p.id) return toast('Product ID is required', 'error');
    if (!/^[a-z0-9-]+$/.test(p.id)) return toast('ID must be kebab-case', 'error');

    if (State.editingProduct) {
      const idx = State.products.findIndex(x => x.id === State.editingProduct);
      if (idx >= 0) State.products[idx] = p;
    } else {
      if (State.products.find(x => x.id === p.id)) return toast('Product ID already exists', 'error');
      State.products.push(p);
    }
    markDirty('data/products.json');
    this.closeModal();
    this.render();
    Dashboard.render();
    toast('Product saved', 'success');
  },

  async delete(id) {
    if (!await showConfirm('Delete Product', `Delete "${id}"? This cannot be undone.`, 'Delete')) return;
    State.products = State.products.filter(p => p.id !== id);
    markDirty('data/products.json');
    this.render();
    Dashboard.render();
    toast('Product deleted', 'info');
  },

  duplicate(id) {
    const p = State.products.find(x => x.id === id);
    if (!p) return;
    const copy = JSON.parse(JSON.stringify(p));
    copy.id = id + '-copy';
    State.products.push(copy);
    markDirty('data/products.json');
    this.render();
    toast('Duplicated as ' + copy.id, 'success');
  }
};
