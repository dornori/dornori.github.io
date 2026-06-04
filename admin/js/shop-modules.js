/* ═══════════════════════════════════════════════════════════════════
   TRANSLATIONS.JS
   ═══════════════════════════════════════════════════════════════════ */

var Translations = {
  render() {
    const type = document.getElementById('trans-type')?.value || 'ui';
    const sel  = document.getElementById('trans-lang');
    if (!sel) return;

    // Rebuild dropdown from current LANGS (dynamic), preserve selection
    const currentVal = sel.value;
    const nonEn = LANGS.filter(l => l !== 'en');
    const newOptions = nonEn.map(l =>
      '<option value="' + l + '" ' + (l === currentVal ? 'selected' : '') + '>' + (LANG_NAMES[l] || l) + '</option>'
    ).join('');
    if (sel.innerHTML !== newOptions) sel.innerHTML = newOptions;

    const lang = sel.value || nonEn[0] || 'de';
    const q    = (document.getElementById('trans-search')?.value || '').toLowerCase();
    const miss = document.getElementById('trans-missing-only')?.checked;

    document.getElementById('trans-lang-label').textContent = LANG_NAMES[lang] || lang;

    const source = type === 'ui' ? State.langUi : State.langProducts;
    const en = source.en;
    if (!en) {
      document.getElementById('trans-body').innerHTML = '<div style="padding:24px;color:var(--text-3)">English source not loaded.</div>';
      return;
    }

    const target = source[lang] || (source[lang] = {});
    const keys = this._flatKeys(en);

    const filtered = keys.filter(k => {
      if (q && !k.toLowerCase().includes(q)) return false;
      if (miss && this._get(target, k)) return false;
      return true;
    });

    const total = keys.length;
    const done = keys.filter(k => this._get(target, k)).length;
    const pct = total ? Math.round(done / total * 100) : 0;

    document.getElementById('trans-progress-bar').style.width = pct + '%';
    document.getElementById('trans-progress-bar').className = `progress-fill ${pct >= 80 ? 'green' : ''}`;
    document.getElementById('trans-progress-pct').textContent = `${done}/${total} (${pct}%)`;

    document.getElementById('trans-body').innerHTML = filtered.map(k => {
      const enVal  = escHtml(this._get(en, k) || '');
      const tgtVal = this._get(target, k) || '';
      const missing = !tgtVal;
      const long = (this._get(en, k) || '').length > 60;
      const ek = k.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      const inputEl = long
        ? `<textarea rows="2" style="width:100%" oninput="Translations.set('${lang}','${type}','${ek}',this.value)">${escHtml(tgtVal)}</textarea>`
        : `<input type="text" style="width:100%" value="${escHtml(tgtVal)}" oninput="Translations.set('${lang}','${type}','${ek}',this.value)">`;
      return `<div style="display:grid;grid-template-columns:200px 1fr 1fr;gap:10px;padding:9px 12px;border-bottom:1px solid rgba(46,43,36,.5);${missing ? 'background:rgba(224,92,92,.04)' : ''}">
        <div style="font-family:var(--mono);font-size:.72rem;color:var(--text-3);padding-top:8px;word-break:break-all">${escHtml(k)}</div>
        <div style="font-size:.82rem;color:var(--text-2);padding-top:8px">${enVal}</div>
        <div>${inputEl}${missing ? '<div style="font-size:.68rem;color:var(--red);margin-top:3px">Missing translation</div>' : ''}</div>
      </div>`;
    }).join('') || `<div style="padding:24px;text-align:center;color:var(--text-3)">No matching keys</div>`;
  },

  set(lang, type, key, val) {
    const source = type === 'ui' ? State.langUi : State.langProducts;
    const target = source[lang] || (source[lang] = {});
    this._setDeep(target, key, val);
    markDirty(`shop/data/lang/${type}/${lang}.json`);
  },

  async translateAll() {
    const type = document.getElementById('trans-type')?.value || 'ui';
    const lang = document.getElementById('trans-lang')?.value || LANGS.filter(l => l !== 'en')[0] || 'de';
    const tl   = LANG_TL[lang] || lang;

    const source = type === 'ui' ? State.langUi : State.langProducts;
    const en     = source.en;
    const target = source[lang] || (source[lang] = {});
    const keys   = this._flatKeys(en).filter(k => !this._get(target, k));

    if (!keys.length) return toast('All translations present for ' + (LANG_NAMES[lang] || lang), 'info');

    /* Reset quota state and show status bar */
    lmResetQuota();
    LM_PROGRESS.lang  = LANG_NAMES[lang] || lang;
    LM_PROGRESS.total = keys.length;
    lmShowBar('Translating ' + keys.length + ' keys to ' + (LANG_NAMES[lang] || lang) + '...', 0, false);
    toast('Translating ' + keys.length + ' keys to ' + (LANG_NAMES[lang] || lang) + '...', 'info');

    let done = 0;
    for (let i = 0; i < keys.length; i++) {
      if (LM_QUOTA_HIT) {
        markDirty('lang/' + lang + '/' + (type === 'ui' ? 'common' : 'products') + '.json');
        lmShowBar('Quota reached — ' + done + '/' + keys.length + ' keys done. Click Resume to continue.', Math.round(done/keys.length*100), true);
        LM_RESUME_CB = () => this.translateAll();
        toast('Quota reached — ' + done + ' of ' + keys.length + ' keys translated', 'warn', 8000);
        this.render();
        return;
      }
      const k   = keys[i];
      const val = this._get(en, k) || '';
      const translated = await lmTranslateText(val, tl);
      if (translated && translated !== val) {
        this._setDeep(target, k, translated);
        done++;
      }
    }

    markDirty('lang/' + lang + '/' + (type === 'ui' ? 'common' : 'products') + '.json');
    lmShowBar('Done — ' + done + ' keys translated to ' + (LANG_NAMES[lang] || lang), 100, false);
    setTimeout(lmHideBar, 3000);
    logActivity('Translated', done + ' keys to ' + (LANG_NAMES[lang] || lang), 'blue');
    toast('Translated ' + done + ' keys to ' + (LANG_NAMES[lang] || lang), 'success');
    this.render();
  },

  _flatKeys(obj, prefix = '', result = []) {
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) this._flatKeys(v, full, result);
      else result.push(full);
    }
    return result;
  },

  _get(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  },

  _setDeep(obj, path, val) {
    const keys = path.split('.');
    let cur = obj;
    for (const k of keys.slice(0, -1)) {
      if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
      cur = cur[k];
    }
    cur[keys[keys.length - 1]] = val;
  }
};

/* ═══════════════════════════════════════════════════════════════════
   CURRENCIES.JS
   ═══════════════════════════════════════════════════════════════════ */

var Currencies = {
  render() {
    const el = document.getElementById('currencies-tbody');
    if (!el) return;
    el.innerHTML = State.currencies.map((c, i) => `
      <tr>
        <td><input class="cell-input" value="${escHtml(c.code||'')}" oninput="Currencies.set(${i},'code',this.value)" style="width:70px;font-family:var(--mono);font-weight:700"></td>
        <td><input class="cell-input" value="${escHtml(c.symbol||'')}" oninput="Currencies.set(${i},'symbol',this.value)" style="width:50px"></td>
        <td><input class="cell-input" value="${escHtml(c.name||'')}" oninput="Currencies.set(${i},'name',this.value)"></td>
        <td><input class="cell-input" type="number" step="0.0001" value="${c.rate||1}" oninput="Currencies.set(${i},'rate',this.value)" style="width:90px;font-family:var(--mono)"></td>
        <td><input class="cell-input" value="${escHtml(c.locale||'')}" oninput="Currencies.set(${i},'locale',this.value)" style="width:90px;font-family:var(--mono)"></td>
        <td><div class="td-actions">
          <button class="btn-icon danger" onclick="Currencies.remove(${i})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div></td>
      </tr>`).join('') || `<tr><td colspan="6" class="tbl-empty">No currencies loaded</td></tr>`;
  },

  set(i, key, val) {
    State.currencies[i][key] = val;
    markDirty('data/countries.json');
  },

  add() {
    State.currencies.push({ code:'', symbol:'', name:'', rate:1, locale:'' });
    markDirty('data/countries.json');
    this.render();
  },

  remove(i) {
    State.currencies.splice(i, 1);
    markDirty('data/countries.json');
    this.render();
  }
};

/* ═══════════════════════════════════════════════════════════════════
   SHIPPING.JS
   ═══════════════════════════════════════════════════════════════════ */

var Shipping = {
  _getSetting(key) {
    // New structure: settings is an array [{key, value, unit, notes}]
    if (Array.isArray(State.shipping.settings)) {
      const s = State.shipping.settings.find(function(x) { return x.key === key; });
      return s ? s.value : '';
    }
    // Fallback old flat object
    return State.shipping.settings[key] || '';
  },

  _setSetting(key, val) {
    if (Array.isArray(State.shipping.settings)) {
      const s = State.shipping.settings.find(function(x) { return x.key === key; });
      if (s) s.value = val;
      else State.shipping.settings.push({ key, value: val, unit: '', notes: '' });
    } else {
      State.shipping.settings[key] = val;
    }
    // Rebuild raw JSON
    State.shippingRaw = JSON.stringify({ settings: State.shipping.settings, country_rates: State.shipping.countries }, null, 2);
    markDirty('data/shipping.json');
  },

  render() {
    const f = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    f('ship-free-threshold', this._getSetting('free_threshold'));
    f('ship-base',           this._getSetting('base_rate'));
    f('ship-per-kg',         this._getSetting('per_kg_rate'));
    f('ship-est-days',       this._getSetting('estimated_days_default'));
    this.renderCountries();
  },

  renderCountries() {
    const el = document.getElementById('shipping-tbody');
    if (!el) return;
    const q = (document.getElementById('ship-search')?.value || '').toLowerCase();
    const rows = State.shipping.countries.filter(c => !q || (c.country||'').toLowerCase().includes(q) || (c.name||'').toLowerCase().includes(q));

    el.innerHTML = rows.map((c, i) => {
      const actual = State.shipping.countries.indexOf(c);
      return `<tr>
        <td><input class="cell-input" value="${escHtml(c.country_code||c.country||'')}" oninput="Shipping.setCountry(${actual},'country_code',this.value)" style="width:55px;font-family:var(--mono);font-weight:600;text-transform:uppercase"></td>
        <td><input class="cell-input" value="${escHtml(c.country_name||c.name||'')}" oninput="Shipping.setCountry(${actual},'country_name',this.value)"></td>
        <td><input class="cell-input" value="${escHtml(c.zone||'')}" oninput="Shipping.setCountry(${actual},'zone',this.value)" style="width:40px;font-family:var(--mono)"></td>
        <td><input class="cell-input" type="number" step="0.01" value="${c.base_eur??c.rate??''}" oninput="Shipping.setCountry(${actual},'base_eur',this.value)" style="width:70px"></td>
        <td><input class="cell-input" type="number" step="0.01" value="${c.free_threshold_override??''}" oninput="Shipping.setCountry(${actual},'free_threshold_override',this.value)" style="width:80px"></td>
        <td><input class="cell-input" value="${escHtml(c.estimated_days||c.days||'')}" oninput="Shipping.setCountry(${actual},'estimated_days',this.value)" style="width:70px"></td>
        <td><div class="td-actions">
          <button class="btn-icon danger" onclick="Shipping.removeCountry(${actual})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div></td>
      </tr>`;
    }).join('') || `<tr><td colspan="7" class="tbl-empty">No countries configured</td></tr>`;
  },

  setDefault(key, val) {
    this._setSetting(key, val);
  },

  setCountry(i, key, val) {
    State.shipping.countries[i][key] = val;
    markDirty('data/shipping.json');
  },

  addCountry() {
    State.shipping.countries.push({ country_code:'', country_name:'', zone:'', base_eur:0, per_kg_eur:0, free_threshold_override:null, estimated_days:'3-5' });
    markDirty('data/shipping.json');
    this.renderCountries();
  },

  removeCountry(i) {
    State.shipping.countries.splice(i, 1);
    markDirty('data/shipping.json');
    this.renderCountries();
  }
};

/* ═══════════════════════════════════════════════════════════════════
   CONFIG.JS — Config.js editor
   ═══════════════════════════════════════════════════════════════════ */

var Config = {
  render() {
    const ta = document.getElementById('config-editor');
    if (ta) ta.value = State.shopConfigRaw || '';
  },

  save() {
    const ta = document.getElementById('config-editor');
    if (!ta) return;
    State.shopConfigRaw = ta.value;
    markDirty('js/shop-config.js');
    toast('Config staged — Ctrl+S to write to disk', 'success');
  },

  parseConfigJs(raw) {
    try {
      const match = raw.match(/const\s+CONFIG\s*=\s*(\{[\s\S]*?\});/);
      if (!match) return null;
      return Function('"use strict"; return ' + match[1])();
    } catch { return null; }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   FILEMANAGER.JS
   ═══════════════════════════════════════════════════════════════════ */

var FileManager = {
  path: '',
  selected: null,
  editorContent: '',

  async render() {
    await this.browse(this.path);
  },

  async browse(path) {
    this.path = path;
    const breadEl = document.getElementById('fm-breadcrumb');
    const treeEl  = document.getElementById('fm-tree');
    const detEl   = document.getElementById('fm-detail');

    if (!breadEl || !treeEl) return;

    // Breadcrumb
    const parts = path.split('/').filter(Boolean);
    breadEl.innerHTML = `<span style="cursor:pointer;color:var(--gold)" onclick="FileManager.browse('')">root</span>` +
      parts.map((p, i) => {
        const sub = parts.slice(0, i+1).join('/');
        return ` <span style="color:var(--text-4)">›</span> <span style="cursor:pointer" onclick="FileManager.browse('${escHtml(sub)}')">${escHtml(p)}</span>`;
      }).join('');

    try {
      const entries = await FS.listDir(path);
      treeEl.innerHTML = entries.map(e => {
        const full = path ? `${path}/${e.name}` : e.name;
        const icon = e.kind === 'directory'
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`;
        const cls = e.kind === 'directory' ? 'dir' : '';
        const action = e.kind === 'directory'
          ? `onclick="FileManager.browse('${escHtml(full)}')" `
          : `onclick="FileManager.openFile('${escHtml(full)}','${escHtml(e.name)}')"`;
        return `<div class="file-node ${cls}" ${action}>${icon}${escHtml(e.name)}</div>`;
      }).join('') || '<div style="color:var(--text-3);font-size:.8rem;padding:8px">Empty folder</div>';

      // Detail area
      if (!this.selected) {
        detEl.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
          <p>Select a file to view or edit</p>
        </div>`;
      }
    } catch(e) {
      treeEl.innerHTML = `<div style="color:var(--red);font-size:.8rem;padding:8px">Error: ${e.message}</div>`;
    }
  },

  async openFile(path, name) {
    this.selected = path;
    const ext = name.split('.').pop().toLowerCase();
    const textExts = ['html','css','js','json','csv','txt','md','xml','svg'];
    const detEl = document.getElementById('fm-detail');

    if (textExts.includes(ext)) {
      const content = await FS.read(path);
      if (content === null) { toast('Cannot read file', 'error'); return; }
      this.editorContent = content;
      detEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div>
            <div style="font-weight:600">${escHtml(name)}</div>
            <div style="font-size:.72rem;color:var(--text-3)">${escHtml(path)} · ${(content.length/1024).toFixed(1)} KB</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-primary" onclick="FileManager.saveEdit('${escHtml(path)}')">Save</button>
            <button class="btn btn-sm btn-secondary" onclick="FileManager.copyPath('${escHtml(path)}')">Copy path</button>
          </div>
        </div>
        <textarea id="fm-file-editor" style="width:100%;min-height:420px;font-family:var(--mono);font-size:.76rem;background:var(--ink-3);border:1px solid var(--border);color:var(--blue);padding:14px;border-radius:var(--radius);resize:vertical;outline:none;line-height:1.6">${escHtml(content)}</textarea>`;
    } else {
      detEl.innerHTML = `
        <div style="margin-bottom:12px">
          <div style="font-weight:600">${escHtml(name)}</div>
          <div style="font-size:.72rem;color:var(--text-3)">${escHtml(path)}</div>
        </div>
        <div class="empty-state"><p>Preview not available for .${ext} files</p>
          <button class="btn btn-secondary" onclick="FileManager.copyPath('${escHtml(path)}')">Copy Path</button>
        </div>`;
    }
  },

  async saveEdit(path) {
    const ta = document.getElementById('fm-file-editor');
    if (!ta) return;
    await FS.write(path, ta.value);
    toast(`Saved ${path}`, 'success');
    logActivity('File saved', path, 'green');
  },

  copyPath(path) {
    navigator.clipboard?.writeText(path);
    toast('Path copied to clipboard', 'info');
  },

  async newFile() {
    const name = prompt('File name (e.g. page.html):');
    if (!name?.trim()) return;
    const path = this.path ? `${this.path}/${name.trim()}` : name.trim();
    await FS.write(path, '');
    toast(`Created ${path}`, 'success');
    await this.browse(this.path);
  },

  async newFolder() {
    const name = prompt('Folder name:');
    if (!name?.trim()) return;
    const path = this.path ? `${this.path}/${name.trim()}` : name.trim();
    await FS.write(`${path}/.gitkeep`, '');
    toast(`Created folder ${path}`, 'success');
    await this.browse(this.path);
  }
};

/* ═══════════════════════════════════════════════════════════════════
   WYSIWYG.JS — Visual + Source HTML editor
   ═══════════════════════════════════════════════════════════════════ */

var WYSIWYG = {
  currentPath: null,
  mode: 'visual',

  async init() {
    const list = document.getElementById('wy-file-list');
    if (!list) return;
    list.innerHTML = '<div style="color:var(--text-3);font-size:.78rem;padding:8px">Scanning…</div>';
    const files = await FS.findHtml('content/en');
    list.innerHTML = files.map(f => `
      <div class="file-node" onclick="WYSIWYG.open('${escHtml(f)}')" title="${escHtml(f)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
        ${escHtml(f.replace('content/en/',''))}
      </div>`).join('') || '<div style="color:var(--text-3);font-size:.78rem;padding:8px">No HTML files found</div>';
  },

  async open(path) {
    this.currentPath = path;
    document.querySelectorAll('#wy-file-list .file-node').forEach(n => {
      n.classList.toggle('active', n.textContent.trim().includes(path.replace('content/en/','')));
    });
    const content = await FS.read(path) || '';
    document.getElementById('wy-current-file').textContent = path;
    document.getElementById('wy-editor').innerHTML = content;
    document.getElementById('wy-source').value = content;
    this.setMode(this.mode);
  },

  setMode(mode) {
    this.mode = mode;
    document.getElementById('wy-editor').style.display = mode === 'visual' ? 'block' : 'none';
    document.getElementById('wy-source').style.display = mode === 'source' ? 'block' : 'none';
    document.getElementById('wy-btn-visual').classList.toggle('active', mode === 'visual');
    document.getElementById('wy-btn-source').classList.toggle('active', mode === 'source');
    if (mode === 'source') {
      document.getElementById('wy-source').value = document.getElementById('wy-editor').innerHTML;
    } else {
      document.getElementById('wy-editor').innerHTML = document.getElementById('wy-source').value;
    }
  },

  exec(cmd, val = null) {
    document.getElementById('wy-editor').focus();
    document.execCommand(cmd, false, val);
  },

  insertLink() {
    const url = prompt('URL:'); if (!url) return;
    this.exec('createLink', url);
  },

  insertImg() {
    const src = prompt('Image URL or path:'); if (!src) return;
    this.exec('insertImage', src);
  },

  async save() {
    if (!this.currentPath) return toast('No file open', 'warn');
    const content = this.mode === 'visual'
      ? document.getElementById('wy-editor').innerHTML
      : document.getElementById('wy-source').value;
    await FS.write(this.currentPath, content);
    logActivity('WYSIWYG save', this.currentPath, 'green');
    toast(`Saved ${this.currentPath}`, 'success');
  }
};


var Countries = { _showInactive:false, render() { var el=document.getElementById('currencies-tbody'); if(!el)return; var list=(State.countries||[]).filter(function(c){return Countries._showInactive||c.active!==false;}); el.innerHTML=list.map(function(c,i){var actual=(State.countries||[]).indexOf(c);return '<tr><td>'+escHtml(c.flag||'')+'</td><td><span class="td-mono">'+escHtml(c.code||'')+'</span></td><td>'+escHtml(c.label||'')+'</td><td><span class="badge badge-gray">'+escHtml(c.currency||'')+'</span></td><td>'+escHtml(c.language||'')+'</td><td>'+escHtml(c.groupLabel||'')+'</td><td><label class="toggle"><input type="checkbox" '+(c.active?'checked':'')+' onchange="Countries.setActive('+actual+',this.checked)"><span class="toggle-slider"></span></label></td></tr>';}).join('')||'<tr><td colspan="7" class="tbl-empty">No countries</td></tr>'; }, setActive(i,v){if(State.countries[i]){State.countries[i].active=v;markDirty('data/countries.json');}}, toggleInactive(){this._showInactive=!this._showInactive;this.render();} };