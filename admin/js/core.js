/* ═══════════════════════════════════════════════════════════════════
   CORE.JS — State, FS, App shell, Dashboard
   ═══════════════════════════════════════════════════════════════════ */

/* ── STATE ─────────────────────────────────────────────────────────── */
var State = {
  dir: null,
  // Shop data
  products: [],
  langUi: {},
  langProducts: {},
  currencies: [],
  shipping: { settings: {}, countries: [] },
  shopConfig: null,
  shopConfigRaw: '',
  // Site data
  siteConfig: null,
  siteConfigRaw: '',
  sitePages: {},        // { en: { 'home': '<html...>' }, de: {...} }
  siteLang: {},         // { en: {...}, de: {...} }
  // UI state
  dirty: new Set(),
  currentView: 'dashboard',
  undoStack: [],
  activity: [],
};

// Dynamic — populated from languages.json (data/) via LangManager.loadRegistry()
var LANGS      = ['en', 'de', 'nl', 'fr', 'no', 'cs', 'es', 'it', 'pt'];
var LANG_NAMES = { en:'English', de:'Deutsch', nl:'Nederlands', fr:'Français', no:'Norsk', cs:'Čeština', es:'Español', it:'Italiano', pt:'Português' };
var LANG_FLAGS = { en:'EN', de:'DE', nl:'NL', fr:'FR', no:'NO', cs:'CS', es:'ES', it:'IT', pt:'PT' };
var LANG_LOCALES = { en:'en-GB', de:'de-DE', nl:'nl-NL', fr:'fr-FR', no:'nb-NO', cs:'cs-CZ', es:'es-ES', it:'it-IT', pt:'pt-PT' };
var LANG_TL = { en:'en', de:'de', nl:'nl', fr:'fr', no:'nb', sv:'sv', it:'it', es:'es', da:'da', fi:'fi', pl:'pl', pt:'pt', cs:'cs', ro:'ro', tr:'tr', hu:'hu', el:'el', ar:'ar', ja:'ja', ko:'ko', zh:'zh' };

/* ── FILE SYSTEM ────────────────────────────────────────────────────── */
var FS = {
  async pick() {
    try {
      State.dir = await window.showDirectoryPicker({ mode: 'readwrite' });
      localStorage.setItem('dornori-admin-dir', 'granted');
      document.getElementById('fs-setup').style.display = 'none';
      await App.loadAll();
    } catch(e) {
      if (e.name !== 'AbortError') toast('Could not access folder: ' + e.message, 'error');
    }
  },

  async read(path) {
    const parts = path.split('/').filter(Boolean);
    let h = State.dir;
    for (const p of parts.slice(0, -1)) {
      try { h = await h.getDirectoryHandle(p, { create: false }); }
      catch { return null; }
    }
    try {
      const fh = await h.getFileHandle(parts.at(-1));
      return await (await fh.getFile()).text();
    } catch { return null; }
  },

  async write(path, text) {
    const parts = path.split('/').filter(Boolean);
    let h = State.dir;
    for (const p of parts.slice(0, -1)) {
      h = await h.getDirectoryHandle(p, { create: true });
    }
    const fh = await h.getFileHandle(parts.at(-1), { create: true });
    const w = await fh.createWritable();
    await w.write(text);
    await w.close();
  },

  async exists(path) {
    const parts = path.split('/').filter(Boolean);
    let h = State.dir;
    for (const p of parts.slice(0, -1)) {
      try { h = await h.getDirectoryHandle(p); }
      catch { return false; }
    }
    try { await h.getFileHandle(parts.at(-1)); return true; }
    catch { return false; }
  },

  async listDir(path) {
    let h = State.dir;
    if (path) {
      for (const p of path.split('/').filter(Boolean)) {
        try { h = await h.getDirectoryHandle(p); }
        catch { return []; }
      }
    }
    const entries = [];
    for await (const e of h.values()) entries.push({ name: e.name, kind: e.kind });
    return entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  },

  async findHtml(dir = '', results = []) {
    const entries = await this.listDir(dir);
    for (const e of entries) {
      if (['admin', 'node_modules', '.git'].includes(e.name)) continue;
      const full = dir ? `${dir}/${e.name}` : e.name;
      if (e.kind === 'directory') await this.findHtml(full, results);
      else if (e.name.endsWith('.html')) results.push(full);
    }
    return results;
  },

  async delete(path) {
    const parts = path.split('/').filter(Boolean);
    let h = State.dir;
    for (const p of parts.slice(0, -1)) {
      try { h = await h.getDirectoryHandle(p); }
      catch { return false; }
    }
    try { await h.removeEntry(parts.at(-1)); return true; }
    catch { return false; }
  }
};

/* ── UTILITIES ──────────────────────────────────────────────────────── */
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg, type = 'info', duration = 3200) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success:'✓', error:'✕', info:'ℹ', warn:'⚠' };
  t.innerHTML = `<span style="font-weight:700;font-size:.85rem">${icons[type]||'•'}</span><span>${escHtml(msg)}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'slideOut .2s ease forwards'; setTimeout(() => t.remove(), 200); }, duration);
}

function markDirty(file) {
  State.dirty.add(file);
  const s = document.getElementById('tb-status');
  s.textContent = `${State.dirty.size} unsaved change${State.dirty.size !== 1 ? 's' : ''}`;
  s.className = 'unsaved';
}

function markClean(file) {
  if (file) State.dirty.delete(file);
  else State.dirty.clear();
  if (State.dirty.size === 0) {
    const s = document.getElementById('tb-status');
    s.textContent = 'All saved';
    s.className = '';
  }
}

function confirm(title, msg, onConfirm, danger = true) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-icon').textContent = danger ? '⚠️' : '❓';
  const btn = document.getElementById('confirm-ok');
  btn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
  btn.textContent = danger ? 'Delete' : 'Confirm';
  btn.onclick = () => { closeConfirm(); onConfirm(); };
  document.getElementById('confirm-overlay').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open');
}

function logActivity(action, detail, color = 'blue') {
  State.activity.unshift({ action, detail, color, time: new Date() });
  if (State.activity.length > 50) State.activity.pop();
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return date.toLocaleDateString();
}

/* ── CSV HELPERS ─────────────────────────────────────────────────────── */
var CSV = {
  parse(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] ?? '');
      return obj;
    });
  },
  stringify(rows) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    return [headers.join(','), ...rows.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n');
  }
};

/* ── APP SHELL ──────────────────────────────────────────────────────── */
var App = {
  async init() {
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); this.save(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (typeof BulkTools !== 'undefined' && State.undoStack && State.undoStack.length > 0) {
          e.preventDefault();
          BulkTools.undoFindReplace();
        }
      }
    });
    window.addEventListener('beforeunload', function(e) {
      if (State.dirty.size > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Leave anyway?';
        return e.returnValue;
      }
    });
    // Try auto-reconnect
    if (localStorage.getItem('dornori-admin-dir') === 'granted') {
      try {
        document.getElementById('fs-reconnect-hint').style.display = 'block';
      } catch {}
    }
    // Auto-save draft state to localStorage every 30s
    setInterval(function() {
      if (State.dirty.size > 0) {
        try {
          localStorage.setItem('dornori-draft', JSON.stringify({
            ts: Date.now(),
            dirty: Array.from(State.dirty),
            products: State.products,
            currencies: State.currencies,
          }));
        } catch(e) {}
      }
    }, 30000);
  },

  nav(el, viewName) {
    const name = viewName || el.dataset.view;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('[data-view]').forEach(n => {
      if (n.dataset.view === name) n.classList.add('active');
    });
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + name);
    if (target) target.classList.add('active');
    State.currentView = name;
    // Update breadcrumb
    const labels = {
      dashboard:'Dashboard', pages:'Pages', products:'Products',
      translations:'Translations', currencies:'Countries', shipping:'Shipping',
      config:'Configuration', files:'File Manager', wysiwyg:'HTML Editor',
      seo:'SEO', media:'Media', orders:'Orders', customers:'Customers',
      analytics:'Analytics', sitesettings:'Site Settings', redirects:'Redirects', customers:'Customers',
      tools:'Bulk Tools', languages:'Languages', search:'Search'
    };
    document.getElementById('tb-crumb-view').textContent = labels[name] || name;
    // Init views on demand
    const inits = {
      dashboard: () => Dashboard.render(),
      products: () => Products.render(),
      translations: () => Translations.render(),
      currencies: () => { if(typeof Countries!=='undefined') Countries.render(); else if(typeof Currencies!=='undefined') Currencies.render(); },
      shipping: () => Shipping.render(),
      config: () => Config.render(),
      files: () => FileManager.render(),
      wysiwyg: () => WYSIWYG.init(),
      pages: () => Pages.render(),
      seo: () => SEO.render(),
      media: () => Media.render(),
      sitesettings: () => SiteSettings.render(),
      redirects: () => Redirects.load(),
      languages: () => typeof LangManager !== 'undefined' && LangManager.render(),
      search: () => GlobalSearch.render(),
    };
    if (inits[name]) inits[name]();
  },

  async loadAll() {
    const s = document.getElementById('tb-status');
    s.textContent = 'Loading…'; s.className = 'saving';

    try {
      // ── Load languages.json first so LANGS is correct
      if (typeof LangManager !== 'undefined') {
        await LangManager.loadRegistry();
      }

      // Products (now in data/products.json)
      const prodRaw = await FS.read('data/products.json');
      try { if (prodRaw) State.products = JSON.parse(prodRaw); } catch(e) { toast('products.json error: ' + e.message, 'error'); }

      // Shipping (now data/shipping.json — JSON with settings[] + country_rates[])
      const shipRaw = await FS.read('data/shipping.json');
      if (shipRaw) {
        try {
          const shipData = JSON.parse(shipRaw);
          State.shipping.settings  = shipData.settings  || [];
          State.shipping.countries = shipData.country_rates || [];
          State.shippingRaw = shipRaw;
        } catch(e) { toast('shipping.json error: ' + e.message, 'error'); }
      }

      // Countries (new — replaces currencies CSV)
      const countriesRaw = await FS.read('data/countries.json');
      try { if (countriesRaw) State.countries = JSON.parse(countriesRaw); } catch(e) {}

      // Shop config (js/shop-config.js)
      const shopCfgRaw = await FS.read('js/shop-config.js');
      if (shopCfgRaw) { State.shopConfigRaw = shopCfgRaw; try { State.shopConfig = Config.parseConfigJs(shopCfgRaw); } catch(e) {} }

      // Site config (js/config.js)
      const siteCfgRaw = await FS.read('js/config.js');
      if (siteCfgRaw) { State.siteConfigRaw = siteCfgRaw; }

      // Lang files — new structure: lang/<code>/common.json + lang/<code>/products.json
      for (const lang of LANGS) {
        const [commonRaw, productsRaw] = await Promise.all([
          FS.read('lang/' + lang + '/common.json'),
          FS.read('lang/' + lang + '/products.json'),
        ]);
        if (commonRaw)   { try { State.langUi[lang]       = JSON.parse(commonRaw);   } catch(e) {} }
        if (productsRaw) { try { State.langProducts[lang]  = JSON.parse(productsRaw); } catch(e) {} }
      }

      // Redirects
      const redRaw = await FS.read('data/redirects.json');
      if (redRaw) { try { if (typeof Redirects !== 'undefined') Redirects.list = JSON.parse(redRaw); } catch(e) {} }

      // Load all content pages for all languages present on disk
      const contentLangs = await FS.listDir('content');
      for (const langDir of contentLangs) {
        if (langDir.kind !== 'directory') continue;
        const lang = langDir.name;
        const pages = await FS.listDir('content/' + lang);
        State.sitePages[lang] = State.sitePages[lang] || {};
        for (const f of pages) {
          if (f.kind === 'file' && f.name.endsWith('.html')) {
            const content = await FS.read('content/' + lang + '/' + f.name);
            if (content !== null) State.sitePages[lang][f.name] = content;
          }
        }
      }

      markClean();
      toast('Site loaded successfully', 'success');
      logActivity('Loaded', 'Site data loaded from disk', 'green');
    } catch(e) {
      toast('Load error: ' + e.message, 'error');
      console.error(e);
    }

    Dashboard.render();
    this.nav(null, 'dashboard');
  },

  async save() {
    if (!State.dir || !State.dirty.size) return;
    const s = document.getElementById('tb-status');
    s.textContent = 'Saving…'; s.className = 'saving';

    try {
      const writes = [];

      if (State.dirty.has('data/products.json'))
        writes.push(FS.write('data/products.json', JSON.stringify(State.products, null, 2)));

      if (State.dirty.has('data/shipping.json'))
        writes.push(FS.write('data/shipping.json', State.shippingRaw || JSON.stringify({ settings: State.shipping.settings, country_rates: State.shipping.countries }, null, 2)));

      if (State.dirty.has('data/countries.json') && State.countries)
        writes.push(FS.write('data/countries.json', JSON.stringify(State.countries, null, 2)));

      if (State.dirty.has('js/shop-config.js'))
        writes.push(FS.write('js/shop-config.js', State.shopConfigRaw));

      if (State.dirty.has('js/config.js'))
        writes.push(FS.write('js/config.js', State.siteConfigRaw));

      for (const lang of LANGS) {
        if (State.dirty.has('lang/' + lang + '/common.json') && State.langUi[lang])
          writes.push(FS.write('lang/' + lang + '/common.json', JSON.stringify(State.langUi[lang], null, 2)));
        if (State.dirty.has('lang/' + lang + '/products.json') && State.langProducts[lang])
          writes.push(FS.write('lang/' + lang + '/products.json', JSON.stringify(State.langProducts[lang], null, 2)));
      }

      if (State.dirty.has('data/redirects.json'))
        writes.push(FS.write('data/redirects.json', JSON.stringify(Redirects.list, null, 2)));

      // Page writes
      for (const key of State.dirty) {
        if (key.startsWith('content/')) {
          const parts = key.split('/'); // content/lang/file
          const lang = parts[1], file = parts[2];
          if (State.sitePages[lang]?.[file] !== undefined)
            writes.push(FS.write(key, State.sitePages[lang][file]));
        }
      }

      let saved = 0, failed = 0;
      for (const w of writes) {
        try { await w; saved++; } catch(e) { failed++; console.error('Write failed:', e); }
      }
      markClean();
      logActivity('Saved', saved + ' file(s) written' + (failed ? ', ' + failed + ' failed' : ''), 'green');
      if (failed) toast(saved + ' saved, ' + failed + ' failed — check console', 'warn');
      else toast('Saved ' + saved + ' file(s)', 'success');
    } catch(e) {
      toast('Save failed: ' + e.message, 'error');
      s.textContent = 'Save failed'; s.className = 'unsaved';
    }
  },

  toggleTheme() {
    const html = document.documentElement;
    const next = html.dataset.theme === 'light' ? 'dark' : 'light';
    html.dataset.theme = next;
    localStorage.setItem('dornori-admin-theme', next);
  },

  openSite() { window.open('../index.html', '_blank'); },
  showSearch() { this.nav(null, 'search'); setTimeout(function() { var el = document.getElementById('global-search-input'); if (el) el.focus(); }, 100); },
  openShop() { window.open('../shop/index.html', '_blank'); }
};

/* ── DASHBOARD ───────────────────────────────────────────────────────── */
var Dashboard = {
  render() {
    const products = State.products.length;
    const langs = Object.keys(State.langUi).filter(l => State.langUi[l]);
    const totalStock = State.products.reduce((s, p) => {
      if (p.variants?.length) return s + p.variants.reduce((vs, v) => vs + (v.stock || 0), 0);
      return s + (p.stock || 0);
    }, 0);
    const outOfStock = State.products.filter(p => {
      const s = p.variants?.length
        ? p.variants.reduce((vs, v) => vs + (v.stock || 0), 0)
        : (p.stock || 0);
      return s === 0;
    }).length;

    const pageCount = Object.keys(State.sitePages.en || {}).length;
    const currCount = State.currencies.length;

    // Translation coverage
    let totalKeys = 0, translatedKeys = 0;
    const enUi = State.langUi.en || {};
    const flatKeys = k => {
      const keys = [];
      const walk = (obj, prefix) => {
        for (const [key, val] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof val === 'object' && val !== null) walk(val, fullKey);
          else keys.push(fullKey);
        }
      };
      walk(k, '');
      return keys;
    };
    const enKeys = flatKeys(enUi);
    totalKeys = enKeys.length;
    for (const lang of langs.filter(l => l !== 'en')) {
      const target = State.langUi[lang] || {};
      const getDeep = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
      enKeys.forEach(k => { if (getDeep(target, k)) translatedKeys++; });
    }
    const transCoverage = totalKeys ? Math.round((translatedKeys / (totalKeys * Math.max(1, langs.length - 1))) * 100) : 0;

    document.getElementById('dash-stat-products').textContent = products;
    document.getElementById('dash-stat-stock').textContent = totalStock;
    document.getElementById('dash-stat-langs').textContent = langs.length;
    document.getElementById('dash-stat-pages').textContent = pageCount;
    document.getElementById('dash-stat-currencies').textContent = currCount;
    document.getElementById('dash-stat-oos').textContent = outOfStock;
    document.getElementById('dash-trans-pct').textContent = transCoverage + '%';
    document.getElementById('dash-trans-bar').style.width = transCoverage + '%';
    document.getElementById('dash-trans-bar').className =
      `progress-fill ${transCoverage >= 80 ? 'green' : transCoverage >= 40 ? '' : 'red'}`;

    // Out-of-stock warnings
    const oosEl = document.getElementById('dash-oos-list');
    const oosList = State.products.filter(p => {
      const s = p.variants?.length
        ? p.variants.reduce((vs, v) => vs + (v.stock||0), 0)
        : (p.stock||0);
      return s === 0;
    }).slice(0, 5);
    oosEl.innerHTML = oosList.length
      ? oosList.map(p => `
        <div class="activity-item">
          <div class="activity-icon red">⚠</div>
          <div class="activity-text">
            <strong>${escHtml(State.langProducts.en?.[p.id]?.name || p.id)}</strong>
            <div style="color:var(--red);font-size:.74rem">Out of stock</div>
          </div>
          <button class="btn btn-xs btn-secondary" onclick="App.nav(null,'products')">Edit</button>
        </div>`).join('')
      : '<div style="padding:12px;color:var(--green);font-size:.8rem">✓ All products in stock</div>';

    // Activity feed
    const actEl = document.getElementById('dash-activity');
    actEl.innerHTML = State.activity.length
      ? State.activity.slice(0, 8).map(a => `
        <div class="activity-item">
          <div class="activity-icon ${a.color}">${a.color === 'green' ? '✓' : a.color === 'red' ? '✕' : '•'}</div>
          <div class="activity-text"><strong>${escHtml(a.action)}</strong> — ${escHtml(a.detail)}</div>
          <div class="activity-time">${timeAgo(a.time)}</div>
        </div>`).join('')
      : '<div style="padding:12px;color:var(--text-3);font-size:.8rem">No recent activity</div>';

    // Quick access pages
    const pagesEl = document.getElementById('dash-pages-list');
    const pages = Object.keys(State.sitePages.en || {}).slice(0, 6);
    pagesEl.innerHTML = pages.map(p => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(46,43,36,.5)">
        <span style="font-size:.8rem;color:var(--text-2)">${escHtml(p)}</span>
        <div style="display:flex;gap:5px">
          <button class="btn btn-xs btn-secondary" onclick="Pages.quickEdit('${escHtml(p)}')">Edit</button>
        </div>
      </div>`).join('') || '<div style="color:var(--text-3);font-size:.8rem;padding:8px 0">No pages loaded</div>';
  }
};

// Apply saved theme on load
(function() {
  const t = localStorage.getItem('dornori-admin-theme');
  if (t) document.documentElement.dataset.theme = t;
})();
