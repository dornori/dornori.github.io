/* ============================================================
   DORNORI SHOP MANAGER — admin.js
   All modules: FS, App, Products, Translations, Currencies,
   Shipping, Config, FileManager
   ============================================================ */

'use strict';

/* ── STATE ─────────────────────────────────────────────── */
const State = {
  dir: null,          // FileSystemDirectoryHandle
  products: [],
  langUi: {},         // { en:{}, de:{}, nl:{}, no:{} }
  langProducts: {},   // { en:{}, de:{}, nl:{}, no:{} }
  currencies: [],     // array of row objects
  shipping: { settings: {}, countries: [] },
  config: null,       // parsed config object
  configRaw: '',      // original config.js text
  dirty: new Set(),   // which files have unsaved changes
  editingProduct: null,
  undoStack: [],
};

const LANGS = ['en', 'de', 'nl', 'no'];

/* ── FILE SYSTEM ───────────────────────────────────────── */
const FS = {
  async pick() {
    try {
      State.dir = await window.showDirectoryPicker({ mode: 'readwrite' });
      localStorage.setItem('ws-manager-dir', 'granted');
      document.getElementById('fs-setup').style.display = 'none';
      await App.loadAll();
    } catch (e) {
      if (e.name !== 'AbortError') toast('Could not access folder: ' + e.message, 'error');
    }
  },

  async read(path) {
    const parts = path.split('/').filter(Boolean);
    let handle = State.dir;
    for (const p of parts.slice(0, -1)) {
      handle = await handle.getDirectoryHandle(p, { create: false });
    }
    const file = await handle.getFileHandle(parts.at(-1));
    return await (await file.getFile()).text();
  },

  async write(path, text) {
    const parts = path.split('/').filter(Boolean);
    let handle = State.dir;
    for (const p of parts.slice(0, -1)) {
      handle = await handle.getDirectoryHandle(p, { create: true });
    }
    const file = await handle.getFileHandle(parts.at(-1), { create: true });
    const writable = await file.createWritable();
    await writable.write(text);
    await writable.close();
  },

  async listDir(path = '') {
    const parts = path.split('/').filter(Boolean);
    let handle = State.dir;
    for (const p of parts) handle = await handle.getDirectoryHandle(p);
    const entries = [];
    for await (const [name, h] of handle.entries()) {
      entries.push({ name, kind: h.kind });
    }
    return entries.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1));
  }
};

/* ── CSV HELPERS ───────────────────────────────────────── */
const CSV = {
  parseRows(text) {
    return text.split('\n').map(l => l.split(',').map(c => c.trim()));
  },
  // Parse shipping CSV with [settings] / [country_rates] sections
  parseShipping(text) {
    const lines = text.split('\n');
    let section = null;
    const settings = {};
    const headers = [];
    const countries = [];
    for (const raw of lines) {
      const l = raw.trim();
      if (!l || l.startsWith('#')) continue;
      if (l === '[settings]') { section = 'settings'; continue; }
      if (l === '[country_rates]') { section = 'countries'; continue; }
      const cells = l.split(',').map(c => c.trim());
      if (section === 'settings') {
        if (cells[0] === 'key') continue; // header
        settings[cells[0]] = { value: cells[1], unit: cells[2], notes: cells[3] || '' };
      } else if (section === 'countries') {
        if (cells[0] === 'country_code') { headers.push(...cells); continue; }
        if (!cells[0]) continue;
        const obj = {};
        headers.forEach((h, i) => obj[h] = cells[i] || '');
        countries.push(obj);
      }
    }
    return { settings, countries, headers: headers.length ? headers : ['country_code','country_name','zone','base_eur','per_kg_eur','free_threshold_override','estimated_days','notes'] };
  },
  serializeShipping(data) {
    const lines = [
      '# WEBSHOP Shipping Configuration',
      '# Section 1: General settings',
      '# Section 2: Country-specific rates',
      '',
      '[settings]',
      'key,value,unit,notes',
    ];
    for (const [k, v] of Object.entries(data.settings)) {
      lines.push(`${k},${v.value},${v.unit},${v.notes}`);
    }
    lines.push('', '[country_rates]');
    lines.push('# country_code: ISO 3166-1 alpha-2');
    lines.push('# zone: internal zone label');
    lines.push('# base_eur: flat base shipping EUR on top of global base_rate');
    lines.push('# per_kg_eur: per-kg surcharge EUR on top of global per_kg_rate');
    lines.push('');
    lines.push(data.headers.join(','));
    for (const c of data.countries) {
      lines.push(data.headers.map(h => c[h] || '').join(','));
    }
    return lines.join('\n');
  },
  parseCurrencies(text) {
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const [headerLine, ...rows] = lines;
    const headers = headerLine.split(',').map(h => h.trim());
    return rows.map(row => {
      const cells = row.split(',').map(c => c.trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = cells[i] || '');
      return obj;
    }).filter(r => r.code);
  },
  serializeCurrencies(rows) {
    const headers = ['code','symbol','name','rate_to_eur','buffer','decimals','locale'];
    return [headers.join(','), ...rows.map(r => headers.map(h => r[h] || '').join(','))].join('\n');
  }
};

/* ── CONFIG PARSER ─────────────────────────────────────── */
const ConfigParser = {
  // Extract the CONFIG object from config.js by eval-ing safely
  parse(raw) {
    try {
      // Strip the const CONFIG = ... wrapper, eval the object literal
      const inner = raw.replace(/^\s*const\s+CONFIG\s*=\s*/, '').replace(/;\s*$/, '').trim();
      return Function('"use strict"; return (' + inner + ')')();
    } catch(e) {
      toast('Config parse error: ' + e.message, 'error');
      return null;
    }
  },
  serialize(cfg, originalRaw) {
    // Update values in original raw text to preserve comments
    let raw = originalRaw;
    const set = (key, val) => {
      const escaped = String(val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Try quoted string
      raw = raw.replace(
        new RegExp(`(${key.replace('.','\\.')}\\s*:\\s*)("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')`),
        (_, pre) => pre + JSON.stringify(val)
      );
    };
    // For simple scalar updates we just re-serialize the whole block cleanly
    // by replacing the object literal section
    const inner = JSON.stringify(cfg, null, 2)
      .replace(/"([^"]+)":/g, (_, k) => `${k}:`) // unquote keys
    ;
    // Replace between CONFIG = { ... }; keeping leading comment block
    const commentBlock = raw.match(/^([\s\S]*?)\nconst CONFIG/)?.[1] || '';
    return commentBlock + '\nconst CONFIG = ' + inner + ';\n';
  }
};

/* ── TOAST ─────────────────────────────────────────────── */
function toast(msg, type = 'info', duration = 3000) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-dot"></span>${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), duration);
}

/* ── CONFIRM DIALOG ────────────────────────────────────── */
function confirm(title, msg) {
  return new Promise(resolve => {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = msg;
    const modal = document.getElementById('confirm-modal');
    modal.style.display = 'flex';
    const ok = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');
    const cleanup = (result) => { modal.style.display = 'none'; resolve(result); };
    ok.onclick = () => cleanup(true);
    cancel.onclick = () => cleanup(false);
  });
}

/* ── MARK DIRTY ────────────────────────────────────────── */
function markDirty(file) {
  State.dirty.add(file);
  const el = document.getElementById('tb-status');
  el.textContent = `${State.dirty.size} unsaved file(s)`;
  el.className = 'tb-status unsaved';
}
function markClean() {
  State.dirty.clear();
  const el = document.getElementById('tb-status');
  el.textContent = 'All saved';
  el.className = 'tb-status';
}

/* ── APP CORE ──────────────────────────────────────────── */
const App = {
  async loadAll() {
    try {
      // Products
      const pText = await FS.read('data/products.json');
      State.products = JSON.parse(pText);

      // Lang files
      for (const lang of LANGS) {
        try { State.langUi[lang] = JSON.parse(await FS.read(`data/lang/ui/${lang}.json`)); } catch {}
        try { State.langProducts[lang] = JSON.parse(await FS.read(`data/lang/products/${lang}.json`)); } catch {}
      }

      // Currencies
      State.currencies = CSV.parseCurrencies(await FS.read('data/currencies.csv'));

      // Shipping
      State.shipping = CSV.parseShipping(await FS.read('data/shipping.csv'));

      // Config
      State.configRaw = await FS.read('js/config.js');
      State.config = ConfigParser.parse(State.configRaw);

      Dashboard.render();
      Products.render();
      Translations.render();
      Currencies.render();
      Shipping.render();
      Config.render();
      FileManager.renderTree();

      toast('Shop data loaded', 'success');
    } catch(e) {
      toast('Load error: ' + e.message, 'error');
      console.error(e);
    }
  },

  async save() {
    if (!State.dir) return toast('No folder connected', 'error');
    try {
      await FS.write('data/products.json', JSON.stringify(State.products, null, 2));
      for (const lang of LANGS) {
        if (State.langUi[lang]) await FS.write(`data/lang/ui/${lang}.json`, JSON.stringify(State.langUi[lang], null, 2));
        if (State.langProducts[lang]) await FS.write(`data/lang/products/${lang}.json`, JSON.stringify(State.langProducts[lang], null, 2));
      }
      await FS.write('data/currencies.csv', CSV.serializeCurrencies(State.currencies));
      await FS.write('data/shipping.csv', CSV.serializeShipping(State.shipping));
      if (State.config) await FS.write('js/config.js', ConfigParser.serialize(State.config, State.configRaw));
      markClean();
      toast('All files saved ✓', 'success');
    } catch(e) {
      toast('Save error: ' + e.message, 'error');
    }
  },

  nav(el) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    const view = el.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
  },

  toggleTheme() {
    const html = document.documentElement;
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
  },

  openShop() {
    window.open('../index.html', '_blank');
  }
};

/* ── DASHBOARD ─────────────────────────────────────────── */
const Dashboard = {
  render() {
    const products = State.products;
    const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
    const stockValue = products.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0);
    const lowStock = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;
    const outOfStock = products.filter(p => (p.stock || 0) === 0).length;

    const stats = [
      { label: 'Total Products', value: products.length, sub: '' },
      { label: 'Total Stock Units', value: totalStock, sub: `€${stockValue.toLocaleString()} value` },
      { label: 'Low Stock', value: lowStock, sub: '≤ 5 units remaining' },
      { label: 'Out of Stock', value: outOfStock, sub: 'products unavailable' },
      { label: 'Languages', value: LANGS.length, sub: LANGS.join(', ') },
      { label: 'Currencies', value: State.currencies.length, sub: 'configured' },
    ];

    document.getElementById('dash-stats').innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
        ${s.sub ? `<div class="stat-sub">${s.sub}</div>` : ''}
      </div>`).join('');
  }
};

/* ── PRODUCTS ──────────────────────────────────────────── */
const Products = {
  render() {
    // Populate category filter
    const cats = [...new Set(State.products.map(p => p.category).filter(Boolean))];
    const catSel = document.getElementById('product-cat');
    catSel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    this.filter();
  },

  filter() {
    const q = document.getElementById('product-search').value.toLowerCase();
    const cat = document.getElementById('product-cat').value;
    const stockFilter = document.getElementById('product-stock').value;

    const filtered = State.products.filter(p => {
      const name = (State.langProducts.en?.[p.id]?.name || p.id).toLowerCase();
      if (q && !name.includes(q) && !p.id.includes(q)) return false;
      if (cat && p.category !== cat) return false;
      if (stockFilter === 'low' && !((p.stock || 0) > 0 && (p.stock || 0) <= 5)) return false;
      if (stockFilter === 'out' && (p.stock || 0) !== 0) return false;
      if (stockFilter === 'ok' && (p.stock || 0) <= 0) return false;
      return true;
    });

    document.getElementById('products-tbody').innerHTML = filtered.map(p => {
      const name = State.langProducts.en?.[p.id]?.name || p.id;
      const stock = p.stock ?? (p.variants ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : 0);
      const stockBadge = stock === 0
        ? `<span class="badge badge-red">Out</span>`
        : stock <= 5
        ? `<span class="badge badge-gold">${stock}</span>`
        : `<span class="badge badge-green">${stock}</span>`;
      return `<tr>
        <td><div class="product-img-cell">
          <img class="img-thumb" src="${p.image || ''}" onerror="this.style.display='none'" alt="">
          <div><div style="font-weight:500">${name}</div><div class="td-mono">${p.id}</div></div>
        </div></td>
        <td><span class="badge badge-gray">${p.category || '—'}</span></td>
        <td>€${(p.price || 0).toFixed(2)}</td>
        <td>${stockBadge}</td>
        <td>${p.featured ? '<span class="badge badge-gold">Featured</span>' : ''}</td>
        <td><div class="td-actions">
          <button class="btn-icon" onclick="Products.openEdit('${p.id}')" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon" onclick="Products.duplicate('${p.id}')" title="Duplicate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="btn-icon" onclick="Products.delete('${p.id}')" title="Delete" style="color:var(--red)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:40px">No products found</td></tr>';
  },

  _fillModal(p) {
    const get = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    get('p-id', p.id);
    get('p-category', p.category);
    get('p-price', p.price);
    get('p-weight', p.weight);
    get('p-stock', p.stock);
    get('p-url', p.url);
    get('p-image', p.image);
    get('p-images', (p.images || []).join('\n'));
    get('p-videos', (p.videos || []).join('\n'));
    get('p-bundled', (p.bundled || []).join(', '));
    get('p-related', (p.related || []).join(', '));
    get('p-addons', (p.addons || []).join(', '));
    get('p-dim-l', p.dimensions?.l);
    get('p-dim-w', p.dimensions?.w);
    get('p-dim-h', p.dimensions?.h);
    get('p-bundleDiscount', p.bundleDiscount);
    document.getElementById('p-featured').checked = !!p.featured;

    // Variants
    document.getElementById('variants-list').innerHTML = (p.variants || []).map((v, i) => this._variantRow(v, i)).join('');
    // Colors
    document.getElementById('colors-list').innerHTML = (p.colors || []).map((c, i) => this._colorRow(c, p.colors_soldout?.includes(c), i)).join('');
    // Specs
    document.getElementById('specs-list').innerHTML = (p.specs || []).map((s, i) => this._specRow(s, i)).join('');

    // Available IDs
    document.getElementById('available-ids').innerHTML = State.products
      .filter(pr => pr.id !== p.id)
      .map(pr => `<span style="margin-right:8px;cursor:pointer" onclick="navigator.clipboard.writeText('${pr.id}')">${pr.id}</span>`)
      .join('');
  },

  _variantRow(v = {}, i) {
    return `<div class="dyn-row" style="grid-template-columns:1fr 1fr 80px 80px 1fr auto" id="vrow-${i}">
      <input type="text" placeholder="id (kebab)" value="${v.id||''}" class="v-id" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')">
      <input type="text" placeholder="Label" value="${v.label||''}">
      <input type="number" placeholder="Price" value="${v.price||''}" min="0" step="0.01">
      <input type="number" placeholder="Stock" value="${v.stock||''}" min="0">
      <input type="url" placeholder="Image URL" value="${v.image||''}">
      <button class="btn-icon" style="color:var(--red)" onclick="this.closest('.dyn-row').remove()">✕</button>
    </div>`;
  },

  _colorRow(c = '', soldout = false, i) {
    return `<div class="dyn-row" style="grid-template-columns:1fr auto auto" id="crow-${i}">
      <input type="text" placeholder="Color name e.g. Smoke" value="${c}">
      <label class="form-check"><input type="checkbox" ${soldout ? 'checked' : ''}> Sold out</label>
      <button class="btn-icon" style="color:var(--red)" onclick="this.closest('.dyn-row').remove()">✕</button>
    </div>`;
  },

  _specRow(s = {}, i) {
    const rows = (s.rows || []).map(r => r.join(' | ')).join('\n');
    return `<div class="accordion open" id="srow-${i}">
      <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
        <input type="text" placeholder="Section title" value="${s.title||''}" style="background:none;border:none;color:var(--text);font-size:.84rem;flex:1" onclick="event.stopPropagation()">
        <button class="btn-icon" style="color:var(--red);margin-left:8px" onclick="event.stopPropagation();this.closest('.accordion').remove()">✕</button>
      </div>
      <div class="accordion-body">
        <div class="form-group">
          <label>Rows (Key | Value, one per line)</label>
          <textarea rows="4" placeholder="Light Source | LED&#10;Bulb Base | E27">${rows}</textarea>
        </div>
      </div>
    </div>`;
  },

  addVariant() { document.getElementById('variants-list').insertAdjacentHTML('beforeend', this._variantRow()); },
  addColor() { document.getElementById('colors-list').insertAdjacentHTML('beforeend', this._colorRow()); },
  addSpec() { document.getElementById('specs-list').insertAdjacentHTML('beforeend', this._specRow()); },

  tab(el, name) {
    document.querySelectorAll('#product-tabs .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    ['general','media','variants','colors','relations','specs'].forEach(t => {
      document.getElementById('product-tab-' + t).style.display = t === name ? '' : 'none';
    });
  },

  openNew() {
    State.editingProduct = null;
    document.getElementById('product-modal-title').textContent = 'New Product';
    this._fillModal({ url: 'product.html', stock: 0, price: 0, weight: 0 });
    this.tab(document.querySelector('#product-tabs .tab'), 'general');
    document.getElementById('product-modal').style.display = 'flex';
  },

  openEdit(id) {
    const p = State.products.find(x => x.id === id);
    if (!p) return;
    State.editingProduct = id;
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    this._fillModal(p);
    this.tab(document.querySelector('#product-tabs .tab'), 'general');
    document.getElementById('product-modal').style.display = 'flex';
  },

  closeModal() {
    document.getElementById('product-modal').style.display = 'none';
  },

  _readModal() {
    const g = id => document.getElementById(id)?.value?.trim();
    const splitList = s => s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];

    // Variants
    const variants = [...document.querySelectorAll('#variants-list .dyn-row')].map(row => {
      const [id, label, price, stock, image] = [...row.querySelectorAll('input[type=text],input[type=number],input[type=url]')].map(i => i.value.trim());
      return { id, label, price: +price, stock: +stock, image };
    }).filter(v => v.id);

    // Colors
    const colorsData = [...document.querySelectorAll('#colors-list .dyn-row')].map(row => ({
      name: row.querySelector('input[type=text]').value.trim(),
      soldout: row.querySelector('input[type=checkbox]').checked
    })).filter(c => c.name);

    // Specs
    const specs = [...document.querySelectorAll('#specs-list .accordion')].map(row => {
      const title = row.querySelector('.accordion-header input').value.trim();
      const rawRows = row.querySelector('textarea').value.trim();
      const rows = rawRows ? rawRows.split('\n').map(l => l.split('|').map(x => x.trim())).filter(r => r.length >= 2) : [];
      return { title, rows };
    }).filter(s => s.title);

    const p = {
      id: g('p-id'),
      price: +g('p-price') || 0,
      weight: +g('p-weight') || 0,
      stock: +g('p-stock') || 0,
      category: g('p-category'),
      featured: document.getElementById('p-featured').checked,
      image: g('p-image'),
      url: g('p-url'),
    };

    const images = g('p-images')?.split('\n').map(s => s.trim()).filter(Boolean);
    if (images?.length) p.images = images;
    const videos = g('p-videos')?.split('\n').map(s => s.trim()).filter(Boolean);
    if (videos?.length) p.videos = videos;
    if (variants.length) p.variants = variants;
    if (colorsData.length) {
      p.colors = colorsData.map(c => c.name);
      const soldout = colorsData.filter(c => c.soldout).map(c => c.name);
      if (soldout.length) p.colors_soldout = soldout;
    }
    const bundled = splitList(g('p-bundled'));
    if (bundled.length) p.bundled = bundled;
    const related = splitList(g('p-related'));
    if (related.length) p.related = related;
    const addons = splitList(g('p-addons'));
    if (addons.length) p.addons = addons;
    const bd = +g('p-bundleDiscount');
    if (bd) p.bundleDiscount = bd;
    if (specs.length) p.specs = specs;
    const dl = g('p-dim-l'), dw = g('p-dim-w'), dh = g('p-dim-h');
    if (dl || dw || dh) p.dimensions = { l: +dl || 0, w: +dw || 0, h: +dh || 0 };
    return p;
  },

  saveProduct() {
    const p = this._readModal();
    if (!p.id) return toast('Product ID is required', 'error');
    if (!/^[a-z0-9-]+$/.test(p.id)) return toast('ID must be kebab-case (lowercase, hyphens only)', 'error');

    if (State.editingProduct) {
      const idx = State.products.findIndex(x => x.id === State.editingProduct);
      if (idx >= 0) State.products[idx] = p;
    } else {
      if (State.products.find(x => x.id === p.id)) return toast('Product ID already exists', 'error');
      State.products.push(p);
    }
    markDirty('products.json');
    this.closeModal();
    this.render();
    Dashboard.render();
    toast('Product saved', 'success');
  },

  async delete(id) {
    if (!await confirm('Delete Product', `Delete "${id}"? This cannot be undone.`)) return;
    State.products = State.products.filter(p => p.id !== id);
    markDirty('products.json');
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
    markDirty('products.json');
    this.render();
    toast('Product duplicated as ' + copy.id, 'success');
  }
};

/* ── TRANSLATIONS ──────────────────────────────────────── */
const Translations = {
  render() {
    const type = document.getElementById('trans-type').value; // ui | products
    const lang = document.getElementById('trans-lang').value;
    const q = document.getElementById('trans-search').value.toLowerCase();
    const missingOnly = document.getElementById('trans-missing-only').checked;

    document.getElementById('trans-lang-label').textContent = lang.toUpperCase();

    const en = type === 'ui' ? State.langUi.en : State.langProducts.en;
    const target = type === 'ui' ? (State.langUi[lang] ||= {}) : (State.langProducts[lang] ||= {});

    // Flatten nested for product type
    const keys = this._flatKeys(en);

    const filtered = keys.filter(k => {
      if (q && !k.toLowerCase().includes(q)) return false;
      if (missingOnly && this._get(target, k)) return false;
      return true;
    });

    document.getElementById('trans-body').innerHTML = filtered.map(k => {
      const enVal = this._get(en, k) || '';
      const targetVal = this._get(target, k) || '';
      const missing = !targetVal;
      const isLong = enVal.length > 60;
      const inputEl = isLong
        ? `<textarea rows="2" style="width:100%" oninput="Translations.set('${lang}','${type}','${k.replace(/'/g, "\\'")}',this.value)">${targetVal}</textarea>`
        : `<input type="text" style="width:100%" value="${targetVal.replace(/"/g,'&quot;')}" oninput="Translations.set('${lang}','${type}','${k.replace(/'/g, "\\'")}',this.value)">`;
      return `<div class="trans-row ${missing ? 'trans-missing' : ''}">
        <div class="trans-key">${k}</div>
        <div style="font-size:.82rem;color:var(--text-2);padding-top:${isLong?'4':'9'}px">${enVal}</div>
        <div>${inputEl}</div>
      </div>`;
    }).join('') || '<div style="padding:24px;text-align:center;color:var(--text-3)">No keys match filter</div>';
  },

  _flatKeys(obj, prefix = '') {
    const keys = [];
    for (const k of Object.keys(obj || {})) {
      const full = prefix ? prefix + '.' + k : k;
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
        keys.push(...this._flatKeys(obj[k], full));
      } else {
        keys.push(full);
      }
    }
    return keys;
  },

  _get(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  },

  _set(obj, path, val) {
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts.slice(0, -1)) cur = cur[p] ||= {};
    cur[parts.at(-1)] = val;
  },

  set(lang, type, key, val) {
    const target = type === 'ui' ? State.langUi[lang] : State.langProducts[lang];
    this._set(target, key, val);
    markDirty(`lang/${type}/${lang}.json`);
  }
};

/* ── CURRENCIES ────────────────────────────────────────── */
const Currencies = {
  render() {
    this._renderTable();
  },

  _renderTable() {
    const headers = ['code','symbol','name','rate_to_eur','buffer','decimals','locale'];
    document.getElementById('currencies-tbody').innerHTML = State.currencies.map((row, i) => {
      // Live price preview
      const rate = parseFloat(row.rate_to_eur) || 1;
      const buf = parseFloat(row.buffer) || 0;
      const dec = parseInt(row.decimals) || 2;
      const preview = ((100 * (rate + buf))).toFixed(dec) + ' ' + row.symbol;
      return `<tr>
        ${headers.map(h => `<td><input class="cell-input" value="${row[h]||''}" oninput="Currencies.update(${i},'${h}',this.value)" style="width:${h==='name'?'130px':h==='locale'?'80px':'70px'}"></td>`).join('')}
        <td style="color:var(--text-3);font-size:.75rem;white-space:nowrap">${preview}</td>
        <td><button class="btn-icon" style="color:var(--red)" onclick="Currencies.remove(${i})">✕</button></td>
      </tr>`;
    }).join('');
  },

  update(i, key, val) {
    State.currencies[i][key] = val;
    markDirty('currencies.csv');
    // Re-render just preview cell
    const rows = document.querySelectorAll('#currencies-tbody tr');
    if (rows[i]) {
      const row = State.currencies[i];
      const rate = parseFloat(row.rate_to_eur) || 1;
      const buf = parseFloat(row.buffer) || 0;
      const dec = parseInt(row.decimals) || 2;
      rows[i].cells[7].textContent = ((100 * (rate + buf))).toFixed(dec) + ' ' + row.symbol;
    }
  },

  remove(i) {
    State.currencies.splice(i, 1);
    markDirty('currencies.csv');
    this._renderTable();
  },

  addRow() {
    State.currencies.push({ code:'NEW', symbol:'?', name:'New Currency', rate_to_eur:'1.0', buffer:'0', decimals:'2', locale:'en-US' });
    markDirty('currencies.csv');
    this._renderTable();
    // Scroll to bottom
    const wrap = document.getElementById('currencies-tbody').closest('.tbl-wrap');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  }
};

/* ── SHIPPING ──────────────────────────────────────────── */
const Shipping = {
  render() {
    // Settings
    document.getElementById('shipping-settings').innerHTML = Object.entries(State.shipping.settings).map(([k, v]) => `
      <div class="form-group">
        <label>${k.replace(/_/g,' ')} <span style="color:var(--text-3)">(${v.unit})</span></label>
        <input type="text" value="${v.value}" oninput="Shipping.updateSetting('${k}',this.value)">
        ${v.notes ? `<div class="form-hint">${v.notes}</div>` : ''}
      </div>`).join('');

    // Country table
    const headers = State.shipping.headers;
    document.getElementById('shipping-tbody').innerHTML = State.shipping.countries.map((c, i) => `
      <tr>
        ${headers.map(h => `<td><input class="cell-input" value="${c[h]||''}" oninput="Shipping.updateCountry(${i},'${h}',this.value)" style="width:${h==='country_name'?'120px':h==='notes'?'160px':'70px'}"></td>`).join('')}
        <td><button class="btn-icon" style="color:var(--red)" onclick="Shipping.removeCountry(${i})">✕</button></td>
      </tr>`).join('');
  },

  updateSetting(key, val) {
    State.shipping.settings[key].value = val;
    markDirty('shipping.csv');
  },

  updateCountry(i, key, val) {
    State.shipping.countries[i][key] = val;
    markDirty('shipping.csv');
  },

  removeCountry(i) {
    State.shipping.countries.splice(i, 1);
    markDirty('shipping.csv');
    this.render();
  },

  addCountry() {
    const empty = {};
    State.shipping.headers.forEach(h => empty[h] = '');
    State.shipping.countries.push(empty);
    markDirty('shipping.csv');
    this.render();
  }
};

/* ── CONFIG EDITOR ─────────────────────────────────────── */
const Config = {
  // Define editable fields: [path, label, type, hint]
  fields: [
    // Shop Identity
    { section: 'Shop Identity' },
    { path: 'shopName', label: 'Shop Name', type: 'text', hint: 'Shown in page title and email subjects' },
    { path: 'tagline', label: 'Tagline', type: 'text', hint: 'Subtitle shown on the shop homepage' },
    { path: 'baseCurrency', label: 'Base Currency', type: 'text', hint: 'Internal currency — all product prices are in this (e.g. EUR)' },
    { path: 'defaultLanguage', label: 'Default Language', type: 'text', hint: 'Fallback language code: en, de, nl, no' },
    // Tax
    { section: 'Tax & VAT' },
    { path: 'taxRate', label: 'Tax Rate', type: 'number', hint: 'Decimal rate e.g. 0.25 = 25%' },
    { path: 'taxLabel', label: 'Tax Label', type: 'text', hint: 'Shown in cart totals e.g. "VAT (25%)"' },
    { path: 'businessVatExempt', label: 'B2B VAT Exempt', type: 'checkbox', hint: 'Shows a B2B checkbox at checkout' },
    // Features
    { section: 'Feature Flags' },
    { path: 'features.showLanguageSwitcher', label: 'Show Language Switcher', type: 'checkbox', hint: 'Show EN/NO/NL/DE toggle in header' },
    { path: 'features.showCurrencySelector', label: 'Show Currency Selector', type: 'checkbox', hint: 'Show currency dropdown in header' },
    // Payment
    { section: 'Payment' },
    { path: 'payment.activeProcessor', label: 'Active Processor', type: 'text', hint: 'paypal | stripe | none' },
    { path: 'payment.paypal.clientId', label: 'PayPal Client ID', type: 'text', hint: 'Your PayPal REST API client ID' },
    { path: 'payment.stripe.publishableKey', label: 'Stripe Publishable Key', type: 'text', hint: 'pk_live_… or pk_test_…' },
    { path: 'payment.stripe.intentEndpoint', label: 'Stripe Intent Endpoint', type: 'text', hint: 'Your server endpoint returning { clientSecret }' },
    // Forms
    { section: 'Order Emails (Formspree)' },
    { path: 'formspree.id', label: 'Formspree Form ID', type: 'text', hint: 'The 8-char ID from your Formspree form URL' },
    { path: 'formspree.endpoint', label: 'Formspree Endpoint', type: 'text', hint: 'Full URL: https://formspree.io/f/xxxxxxxx' },
    // Turnstile
    { section: 'Bot Protection (Turnstile)' },
    { path: 'turnstile.sitekey', label: 'Cloudflare Turnstile Sitekey', type: 'text', hint: 'Get from dash.cloudflare.com → Turnstile. Leave empty to disable.' },
    // Images
    { section: 'Images' },
    { path: 'images.imageDir', label: 'Image Directory', type: 'text', hint: 'Path prefix for auto-generated variant image filenames' },
    { path: 'images.imageExt', label: 'Image Extension', type: 'text', hint: 'webp, jpg, png' },
    // Shipping defaults
    { section: 'Shipping Fallbacks' },
    { path: 'shipping.freeThreshold', label: 'Free Shipping Threshold (EUR)', type: 'number', hint: 'Fallback if shipping.csv cannot be fetched' },
    { path: 'shipping.base', label: 'Base Rate (EUR)', type: 'number', hint: 'Fallback base shipping rate' },
    { path: 'shipping.perKg', label: 'Per kg Rate (EUR)', type: 'number', hint: 'Fallback per-kg rate' },
  ],

  _getPath(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  },
  _setPath(obj, path, val) {
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts.slice(0, -1)) cur = cur[p] ||= {};
    cur[parts.at(-1)] = val;
  },

  render() {
    if (!State.config) { document.getElementById('config-body').innerHTML = '<div class="empty-state"><p>Config not loaded</p></div>'; return; }
    let html = '';
    let inSection = false;
    for (const f of this.fields) {
      if (f.section) {
        if (inSection) html += '</div>';
        html += `<div class="config-section"><div class="config-section-title">${f.section}</div>`;
        inSection = true;
        continue;
      }
      const val = this._getPath(State.config, f.path);
      const inputId = 'cfg-' + f.path.replace(/\./g, '-');
      if (f.type === 'checkbox') {
        html += `<div class="form-group" style="margin-bottom:12px">
          <label class="form-check"><input type="checkbox" id="${inputId}" ${val ? 'checked' : ''} onchange="Config.update('${f.path}',this.checked)"> ${f.label}</label>
          ${f.hint ? `<div class="form-hint">${f.hint}</div>` : ''}
        </div>`;
      } else {
        html += `<div class="form-group" style="margin-bottom:12px">
          <label>${f.label}</label>
          <input type="${f.type}" id="${inputId}" value="${val ?? ''}" ${f.type==='number'?'step="any"':''} oninput="Config.update('${f.path}',${f.type==='number'?'+this.value':'this.value'})">
          ${f.hint ? `<div class="form-hint">${f.hint}</div>` : ''}
        </div>`;
      }
    }
    if (inSection) html += '</div>';
    document.getElementById('config-body').innerHTML = `<div class="card">${html}</div>`;
  },

  update(path, val) {
    this._setPath(State.config, path, val);
    markDirty('js/config.js');
  }
};

/* ── FILE MANAGER ──────────────────────────────────────── */
const FileManager = {
  async renderTree(path = '', container = null) {
    if (!State.dir) return;
    try {
      const entries = await FS.listDir(path);
      const el = container || document.getElementById('file-tree');
      if (!container) el.innerHTML = '';
      const ul = document.createElement('ul');
      ul.style.cssText = 'list-style:none;padding-left:' + (path ? '14px' : '0');
      for (const entry of entries) {
        if (entry.name === 'admin') continue; // don't show ourselves
        const li = document.createElement('li');
        li.style.cssText = 'line-height:1.8;white-space:nowrap;';
        const fullPath = path ? path + '/' + entry.name : entry.name;
        if (entry.kind === 'directory') {
          li.innerHTML = `<span style="color:var(--gold);cursor:pointer" onclick="FileManager.toggleDir(this,'${fullPath}')" data-path="${fullPath}" data-open="false">▶ ${entry.name}/</span>`;
        } else {
          const ext = entry.name.split('.').pop();
          const editable = ['json','csv','js','html','css','txt','md'].includes(ext);
          li.innerHTML = `<span style="color:${editable?'var(--blue)':'var(--text-3)'};cursor:${editable?'pointer':'default'};margin-left:14px" 
            onclick="${editable ? `FileManager.openFile('${fullPath}')` : ''}">${entry.name}</span>`;
        }
        ul.appendChild(li);
      }
      el.appendChild(ul);
    } catch(e) { console.error('Tree error', e); }
  },

  async toggleDir(el, path) {
    if (el.dataset.open === 'true') {
      el.dataset.open = 'false';
      el.textContent = '▶ ' + path.split('/').pop() + '/';
      const next = el.nextSibling;
      if (next?.tagName === 'UL') next.remove();
    } else {
      el.dataset.open = 'true';
      el.textContent = '▼ ' + path.split('/').pop() + '/';
      const sub = document.createElement('div');
      el.after(sub);
      await this.renderTree(path, sub);
    }
  },

  currentPath: null,

  async openFile(path) {
    try {
      const text = await FS.read(path);
      document.getElementById('file-editor-path').textContent = path;
      document.getElementById('file-editor').value = text;
      document.getElementById('file-save-btn').style.display = '';
      this.currentPath = path;
    } catch(e) { toast('Cannot read file: ' + e.message, 'error'); }
  },

  async saveFile() {
    if (!this.currentPath) return;
    try {
      await FS.write(this.currentPath, document.getElementById('file-editor').value);
      toast('File saved: ' + this.currentPath, 'success');
      // Reload affected state
      if (this.currentPath === 'data/products.json') {
        State.products = JSON.parse(document.getElementById('file-editor').value);
        Products.render();
        Dashboard.render();
      }
    } catch(e) { toast('Save failed: ' + e.message, 'error'); }
  }
};

/* ── KEYBOARD SHORTCUTS ────────────────────────────────── */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); App.save(); }
  if (e.key === 'Escape') {
    document.getElementById('product-modal').style.display = 'none';
    document.getElementById('confirm-modal').style.display = 'none';
  }
});

/* ── INIT ──────────────────────────────────────────────── */
(async function init() {
  // Check if File System Access API is available
  if (!window.showDirectoryPicker) {
    document.getElementById('fs-setup').style.display = 'flex';
    document.getElementById('fs-setup').querySelector('p:last-child').textContent =
      '⚠ File System Access API not available. Use Chrome, Edge, or Brave.';
    return;
  }

  // Try to auto-reconnect (user must re-grant on page load per spec)
  document.getElementById('fs-setup').style.display = 'flex';
})();
