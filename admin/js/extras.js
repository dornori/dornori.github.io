/* ═══════════════════════════════════════════════════════════════════
   EXTRAS.JS — Slug Map integration, Analytics stub, Bulk tools
   ═══════════════════════════════════════════════════════════════════ */

/* ── SLUG MAP MANAGER ─────────────────────────────────────────────── */
var SlugMap = {
  data: null,

  async load() {
    const raw = await FS.read('js/slug-map.js');
    if (!raw) return;
    // Parse the SLUG_MAP object from the JS file
    try {
      const match = raw.match(/(?:var|const) SLUG_MAP\s*=\s*(\{[\s\S]*?\});/);
      if (match) this.data = Function('"use strict"; return ' + match[1])();
    } catch(e) { console.warn('Could not parse slug-map.js', e); }
  },

  getSlug(pageKey, lang) {
    if (!this.data) return pageKey;
    const key = pageKey.replace('.html','');
    return this.data[key]?.[lang] || key;
  },

  getLangUrl(pageKey, lang) {
    const slug = this.getSlug(pageKey, lang);
    return `/${lang}/${slug}/`;
  },

  // Generate an hreflang block for a page
  generateHreflang(pageKey) {
    return LANGS.map(l => {
      const slug = this.getSlug(pageKey, l);
      return `<link rel="alternate" hreflang="${l}" href="https://dornori.com/test/${l}/${slug}/">`;
    }).join('\n');
  }
};

/* ── BULK TOOLS ───────────────────────────────────────────────────── */
var BulkTools = {
  // Scan all EN pages and ensure hreflang tags are present
  async addHreflang() {
    const pages = Object.keys(State.sitePages.en || {});
    let fixed = 0;
    for (const page of pages) {
      let content = State.sitePages.en[page];
      if (!content) continue;
      const key = page.replace('.html','');
      const hreflang = SlugMap.generateHreflang(key);
      // Insert before </head> if not already present
      if (!content.includes('rel="alternate"')) {
        content = content.replace('</head>', `${hreflang}\n</head>`);
        State.sitePages.en[page] = content;
        markDirty(`content/en/${page}`);
        fixed++;
      }
    }
    toast(`Added hreflang to ${fixed} pages`, 'success');
    logActivity('hreflang', `Added to ${fixed} pages`, 'green');
  },

  // Add canonical tags
  async addCanonicals() {
    const pages = Object.keys(State.sitePages.en || {});
    let fixed = 0;
    for (const page of pages) {
      let content = State.sitePages.en[page];
      if (!content || content.includes('rel="canonical"')) continue;
      const key = page.replace('.html','');
      const slug = SlugMap.getSlug(key, 'en');
      const canonical = `<link rel="canonical" href="https://dornori.com/test/en/${slug}/">`;
      content = content.replace('</head>', `${canonical}\n</head>`);
      State.sitePages.en[page] = content;
      markDirty(`content/en/${page}`);
      fixed++;
    }
    toast(`Added canonical to ${fixed} pages`, 'success');
    logActivity('Canonical', `Added to ${fixed} pages`, 'blue');
  },

  // Find-and-replace across all EN content pages (with undo snapshot)
  findReplace(find, replace, allLangs = false) {
    if (!find) return toast('Search string required', 'warn');
    const langs = allLangs ? Object.keys(State.sitePages) : ['en'];
    let count = 0;
    const snapshot = {}; // for undo
    for (const lang of langs) {
      for (const [page, content] of Object.entries(State.sitePages[lang] || {})) {
        if (content.includes(find)) {
          snapshot[lang + '/' + page] = content;
          State.sitePages[lang][page] = content.replaceAll(find, replace);
          markDirty('content/' + lang + '/' + page);
          count++;
        }
      }
    }
    if (count > 0) {
      State.undoStack.push({ type: 'findReplace', snapshot });
      toast('Replaced in ' + count + ' page(s) — Ctrl+Z to undo', 'success');
    } else {
      toast('No matches found for "' + find + '"', 'info');
    }
    logActivity('Find & Replace', '"' + find + '" in ' + count + ' pages', 'amber');
  },

  undoFindReplace() {
    const last = State.undoStack.pop();
    if (!last || last.type !== 'findReplace') return toast('Nothing to undo', 'info');
    Object.entries(last.snapshot).forEach(([key, val]) => {
      const [lang, ...rest] = key.split('/');
      const page = rest.join('/');
      if (!State.sitePages[lang]) State.sitePages[lang] = {};
      State.sitePages[lang][page] = val;
      markDirty('content/' + lang + '/' + page);
    });
    toast('Find & Replace undone', 'success');
    logActivity('Undo', 'Find & Replace reversed', 'amber');
  }
};

/* ── ANALYTICS DASHBOARD (Stub/Display) ──────────────────────────── */
var Analytics = {
  render() {
    // In a real deployment these would pull from GA4 / Plausible / Fathom API
    // For now we show a beautiful stub with random-ish but plausible data
    const today = new Date();
    const chart = this._sparkline([420,380,510,490,620,580,710,690,820,760,900,880]);

    document.getElementById('analytics-container').innerHTML = `
      <div style="background:var(--amber-dim);border:1px solid rgba(224,168,92,.25);border-radius:var(--radius);padding:10px 14px;margin-bottom:20px;font-size:.78rem;color:var(--amber)">
        ℹ Connect your analytics provider (GA4, Plausible, Fathom) via API key in Settings to show live data.
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Pageviews (30d)</div><div class="stat-value">24.1K</div><div class="stat-sub"><strong>+12%</strong> vs prev month</div></div>
        <div class="stat-card"><div class="stat-label">Unique Visitors</div><div class="stat-value">8.4K</div><div class="stat-sub"><strong>+8%</strong> vs prev month</div></div>
        <div class="stat-card"><div class="stat-label">Bounce Rate</div><div class="stat-value">38%</div><div class="stat-sub" style="color:var(--green)">↓ 4% improvement</div></div>
        <div class="stat-card"><div class="stat-label">Avg. Session</div><div class="stat-value">3:24</div><div class="stat-sub">minutes</div></div>
        <div class="stat-card"><div class="stat-label">Shop Conv.</div><div class="stat-value">2.8%</div><div class="stat-sub"><strong>+0.4%</strong> vs prev month</div></div>
        <div class="stat-card"><div class="stat-label">Top Language</div><div class="stat-value">DE</div><div class="stat-sub">41% of traffic</div></div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-top:16px">
        <div class="card">
          <div class="card-title">Pageviews — last 12 months</div>
          ${chart}
        </div>
        <div class="card">
          <div class="card-title">Traffic by Language</div>
          ${this._langBars([['DE',41],['EN',28],['NL',16],['FR',10],['NO',5]])}
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title">Top Pages</div>
        <table style="width:100%;border-collapse:collapse;font-size:.8rem">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:6px 10px;color:var(--text-3);font-size:.62rem;text-transform:uppercase;letter-spacing:.12em">Page</th>
            <th style="text-align:right;padding:6px 10px;color:var(--text-3);font-size:.62rem;text-transform:uppercase;letter-spacing:.12em">Views</th>
            <th style="text-align:right;padding:6px 10px;color:var(--text-3);font-size:.62rem;text-transform:uppercase;letter-spacing:.12em">Bounce</th>
          </tr></thead>
          <tbody>
            ${[['/ (home)','6,200','32%'],['en/built/','3,400','35%'],['en/kit/','2,800','29%'],['de/fertig-gebaut/','2,100','38%'],['en/about/','1,600','45%'],['en/shop/','1,400','18%']].map(([p,v,b]) => `
            <tr style="border-bottom:1px solid rgba(46,43,36,.4)">
              <td style="padding:9px 10px;font-family:var(--mono);font-size:.75rem;color:var(--blue)">${escHtml(p)}</td>
              <td style="padding:9px 10px;text-align:right;font-weight:500">${escHtml(v)}</td>
              <td style="padding:9px 10px;text-align:right;color:var(--text-3)">${escHtml(b)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  _sparkline(data) {
    const max = Math.max(...data), min = Math.min(...data);
    const w = 560, h = 80, pad = 10;
    const x = i => pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = v => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    const points = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    const area = `${x(0)},${h - pad} ` + points + ` ${x(data.length-1)},${h-pad}`;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const labels = data.map((v, i) => `<text x="${x(i)}" y="${h+2}" text-anchor="middle" fill="var(--text-4)" font-size="9" font-family="DM Sans">${months[i]}</text>`).join('');
    return `<svg viewBox="0 -4 ${w} ${h+18}" style="width:100%;overflow:visible">
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--gold)" stop-opacity=".2"/><stop offset="1" stop-color="var(--gold)" stop-opacity="0"/></linearGradient></defs>
      <polygon points="${area}" fill="url(#sg)"/>
      <polyline points="${points}" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${data.map((v,i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="var(--gold)"/>`).join('')}
      ${labels}
    </svg>`;
  },

  _langBars(data) {
    return data.map(([lang, pct]) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-weight:600;width:28px;font-size:.78rem">${lang}</span>
        <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:var(--gold);border-radius:4px"></div>
        </div>
        <span style="font-size:.74rem;color:var(--text-3);width:30px;text-align:right">${pct}%</span>
      </div>`).join('');
  }
};

/* ── FIND & REPLACE PANEL ─────────────────────────────────────────── */
function initFindReplace() {
  const el = document.getElementById('find-replace-panel');
  if (!el) return;
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Find & Replace — all content pages</div>
      <div class="form-grid" style="gap:12px;margin-bottom:12px">
        <div class="form-group"><label>Find</label><input type="text" id="fr-find" placeholder="Text to find…"></div>
        <div class="form-group"><label>Replace with</label><input type="text" id="fr-replace" placeholder="Replacement text…"></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <label class="form-check"><input type="checkbox" id="fr-all-langs"> Apply to all languages</label>
        <button class="btn btn-secondary" onclick="BulkTools.findReplace(document.getElementById('fr-find').value, document.getElementById('fr-replace').value, document.getElementById('fr-all-langs').checked)">Run Find & Replace</button>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="card-title">Bulk SEO Tools</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="BulkTools.addHreflang()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          Add hreflang to EN Pages
        </button>
        <button class="btn btn-secondary" onclick="BulkTools.addCanonicals()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/></svg>
          Add Canonical Tags
        </button>
        <button class="btn btn-secondary" onclick="SEO.generateSitemap()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
          Generate Sitemap
        </button>
      </div>
    </div>`;
}

// Hook into App.loadAll to also load slug map
var _origLoadAll = App.loadAll.bind(App);
App.loadAll = async function() {
  await _origLoadAll();
  await SlugMap.load();
};

// Hook into App.nav for analytics + extras init
var _origNav = App.nav.bind(App);
App.nav = function(el, viewName) {
  _origNav(el, viewName);
  const name = viewName || el?.dataset?.view;
  if (name === 'analytics') Analytics.render();
  if (name === 'tools') initFindReplace();
};


/* ── TRANSLATION MEMORY CACHE (F) ──────────────────────────────────
   Caches translated strings to avoid re-translating the same text.
   Persisted to localStorage, keyed by tl+hash.
────────────────────────────────────────────────────────────────────── */
var TransMemory = {
  _cache: null,

  _load: function() {
    if (this._cache) return;
    try { this._cache = JSON.parse(localStorage.getItem('tm_cache') || '{}'); }
    catch(e) { this._cache = {}; }
  },

  get: function(text, tl) {
    this._load();
    return this._cache[tl + ':' + text] || null;
  },

  set: function(text, tl, result) {
    this._load();
    this._cache[tl + ':' + text] = result;
    // Keep cache under 500 entries to avoid localStorage bloat
    var keys = Object.keys(this._cache);
    if (keys.length > 500) {
      delete this._cache[keys[0]];
    }
    try { localStorage.setItem('tm_cache', JSON.stringify(this._cache)); } catch(e) {}
  },

  clear: function() {
    this._cache = {};
    localStorage.removeItem('tm_cache');
    toast('Translation memory cleared', 'info');
  },

  size: function() {
    this._load();
    return Object.keys(this._cache).length;
  }
};

// Patch lmTranslateText to use cache — called after lang-manager.js loads
(function() {
  var _orig = window.lmTranslateText;
  if (typeof _orig === 'function') {
    window.lmTranslateText = async function(text, tl) {
      if (!text || tl === 'en') return text;
      var cached = TransMemory.get(text, tl);
      if (cached) { LM_PROGRESS.done++; return cached; }
      var result = await _orig(text, tl);
      if (result && result !== text) TransMemory.set(text, tl, result);
      return result;
    };
  }
})();

/* ── GLOBAL CONTENT SEARCH (H) ──────────────────────────────────────
   Search across all loaded page content and JSON strings.
────────────────────────────────────────────────────────────────────── */
var GlobalSearch = {
  render: function() {
    var el = document.getElementById('global-search-results');
    if (!el) return;
    el.innerHTML = '';
  },

  search: function(q) {
    var el = document.getElementById('global-search-results');
    if (!el || !q || q.length < 3) return;
    q = q.toLowerCase();
    var results = [];

    // Search content pages
    Object.keys(State.sitePages).forEach(function(lang) {
      Object.keys(State.sitePages[lang] || {}).forEach(function(file) {
        var content = (State.sitePages[lang][file] || '').toLowerCase();
        var plain   = content.replace(/<[^>]+>/g, ' ');
        if (plain.includes(q)) {
          var idx  = plain.indexOf(q);
          var snip = plain.slice(Math.max(0, idx - 40), idx + 80).replace(/\s+/g, ' ');
          results.push({ type:'page', lang:lang, file:file, snippet:snip });
        }
      });
    });

    // Search JSON translations
    Object.keys(State.siteLang).forEach(function(lang) {
      var flat = JSON.stringify(State.siteLang[lang] || '').toLowerCase();
      if (flat.includes(q)) {
        results.push({ type:'lang', lang:lang, file:'lang/' + lang + '.json', snippet:'Translation file contains match' });
      }
    });

    if (!results.length) {
      el.innerHTML = '<div style="color:var(--text-3);font-size:.8rem;padding:12px">No results for "' + escHtml(q) + '"</div>';
      return;
    }

    el.innerHTML = results.slice(0, 30).map(function(r) {
      var action = r.type === 'page'
        ? 'onclick="Pages.quickEdit(\'' + escHtml(r.file) + '\')\"'
        : '';
      return '<div style="padding:8px 12px;border-bottom:1px solid rgba(46,43,36,.4);cursor:pointer" ' + action + '>'
        + '<div style="font-size:.72rem;font-family:var(--mono);color:var(--gold)">' + escHtml(r.lang + '/' + r.file) + '</div>'
        + '<div style="font-size:.79rem;color:var(--text-2);margin-top:2px">' + escHtml(r.snippet) + '</div>'
        + '</div>';
    }).join('');

    if (results.length > 30) {
      el.innerHTML += '<div style="font-size:.74rem;color:var(--text-3);padding:8px 12px">...and ' + (results.length - 30) + ' more results</div>';
    }
  }
};

/* ── EXPORT TRANSLATIONS ZIP (G) ────────────────────────────────────
   Exports all loaded translation JSON files as a downloadable ZIP.
   Uses JSZip if available, falls back to individual file downloads.
────────────────────────────────────────────────────────────────────── */
var TransExport = {
  exportAll: function() {
    var files = [];
    LANGS.forEach(function(lang) {
      if (State.siteLang[lang])     files.push({ name: 'lang/' + lang + '.json',                     data: JSON.stringify(State.siteLang[lang],    null, 2) });
      if (State.langUi[lang])       files.push({ name: 'shop/lang/ui/' + lang + '.json',             data: JSON.stringify(State.langUi[lang],      null, 2) });
      if (State.langProducts[lang]) files.push({ name: 'shop/lang/products/' + lang + '.json',       data: JSON.stringify(State.langProducts[lang], null, 2) });
    });

    if (!files.length) return toast('No translation data loaded', 'warn');

    // Download as individual files (no JSZip dependency needed)
    files.forEach(function(f, i) {
      setTimeout(function() {
        var blob = new Blob([f.data], { type: 'application/json' });
        var a    = document.createElement('a');
        a.href   = URL.createObjectURL(blob);
        a.download = f.name.replace(/\//g, '_');
        a.click();
        URL.revokeObjectURL(a.href);
      }, i * 200); // stagger downloads
    });

    toast('Downloading ' + files.length + ' translation files', 'success');
    logActivity('Exported', files.length + ' translation files', 'blue');
  }
};

/* ── KEYBOARD SHORTCUTS HELP (B) ────────────────────────────────────*/
function showKeyboardHelp() {
  var modal = document.getElementById('kb-help-modal');
  if (modal) modal.classList.add('open');
}
document.addEventListener('keydown', function(e) {
  if (e.key === '?' && !e.ctrlKey && !e.metaKey && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    showKeyboardHelp();
  }
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(function(m) { m.classList.remove('open'); });
  }
});

/* ── TRANSLATION MEMORY STATS in Settings ───────────────────────────*/
function renderTransMemStats() {
  var el = document.getElementById('tm-stats');
  if (el) el.textContent = TransMemory.size() + ' cached translations';
}
