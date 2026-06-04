/* ═══════════════════════════════════════════════════════════════════
   PRODUCTS.JS — Product management (moved from shop/admin)
   ═══════════════════════════════════════════════════════════════════ */

var Products = {
  render() {
    const cats = [...new Set(State.products.map(p => p.category).filter(Boolean))];
    const catSel = document.getElementById('product-cat');
    if (catSel) catSel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option>${escHtml(c)}</option>`).join('');
    this.filter();
  },

  filter() {
    const q = (document.getElementById('product-search')?.value || '').toLowerCase();
    const cat = document.getElementById('product-cat')?.value || '';
    const sf = document.getElementById('product-stock')?.value || '';

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

    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    tbody.innerHTML = list.map(p => {
      const name = escHtml(State.langProducts.en?.[p.id]?.name || p.id);
      const stk = this._stock(p);
      const badge = stk === 0
        ? `<span class="badge badge-red">Out of stock</span>`
        : stk <= 5 ? `<span class="badge badge-gold">Low: ${stk}</span>`
        : `<span class="badge badge-green">${stk}</span>`;
      return `<tr class="row-link" onclick="Products.openEdit('${p.id}')">
        <td><div style="display:flex;align-items:center;gap:10px">
          <img class="td-img" src="${escHtml(p.image||'')}" onerror="this.style.display='none'" loading="lazy">
          <div><div style="font-weight:500">${name}</div><div class="td-mono">${escHtml(p.id)}</div></div>
        </div></td>
        <td><span class="badge badge-gray">${escHtml(p.category||'—')}</span></td>
        <td style="font-weight:600">€${(p.price||0).toFixed(2)}</td>
        <td>${badge}</td>
        <td>${p.featured ? '<span class="badge badge-gold">★ Featured</span>' : ''}</td>
        <td onclick="event.stopPropagation()"><div class="td-actions">
          <button class="btn-icon" onclick="Products.openEdit('${p.id}')" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon" onclick="Products.duplicate('${p.id}')" title="Duplicate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="btn-icon danger" onclick="Products.delete('${p.id}')" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div></td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" class="tbl-empty">No products match your filters</td></tr>`;
  },

  _stock(p) {
    if (p.variants?.length) return p.variants.reduce((s,v) => s+(v.stock||0), 0);
    return p.stock ?? 0;
  },

  openNew() {
    State.editingProduct = null;
    document.getElementById('product-modal-title').textContent = 'New Product';
    if (typeof rebuildProductLangFields === 'function') rebuildProductLangFields();
    this._fill({ stock: 0, price: 0, weight: 0, category: '', featured: false });
    document.getElementById('product-modal').classList.add('open');
  },

  openEdit(id) {
    const p = State.products.find(x => x.id === id);
    if (!p) return;
    State.editingProduct = id;
    document.getElementById('product-modal-title').textContent = 'Edit: ' + ((State.langProducts.en && State.langProducts.en[id] && State.langProducts.en[id].name) || id);
    if (typeof rebuildProductLangFields === 'function') rebuildProductLangFields();
    this._fill(p);
    document.getElementById('product-modal').classList.add('open');
  },

  _fill(p) {
    const f = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    const fc = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    f('p-id', p.id || ''); f('p-url', p.url || ''); f('p-image', p.image || '');
    f('p-price', p.price ?? 0); f('p-weight', p.weight ?? 0); f('p-stock', p.stock ?? 0);
    f('p-category', p.category || ''); fc('p-featured', p.featured);
    // Lang fields
    for (const l of LANGS) {
      const ld = State.langProducts[l]?.[p.id] || {};
      f(`p-name-${l}`, ld.name || ''); f(`p-desc-${l}`, ld.description || '');
    }
  },

  save() {
    const g = id => document.getElementById(id)?.value || '';
    const gc = id => document.getElementById(id)?.checked || false;
    const id = g('p-id').trim();
    if (!id) return toast('Product ID required', 'error');

    const product = {
      id, url: g('p-url'), image: g('p-image'),
      price: parseFloat(g('p-price')) || 0,
      weight: parseFloat(g('p-weight')) || 0,
      stock: parseInt(g('p-stock')) || 0,
      category: g('p-category'), featured: gc('p-featured'),
    };

    // Keep existing variants
    const existing = State.products.find(p => p.id === id);
    if (existing?.variants) product.variants = existing.variants;

    const idx = State.editingProduct ? State.products.findIndex(p => p.id === State.editingProduct) : -1;
    if (idx >= 0) State.products[idx] = product;
    else State.products.push(product);

    // Save lang data
    for (const l of LANGS) {
      if (!State.langProducts[l]) State.langProducts[l] = {};
      if (!State.langProducts[l][id]) State.langProducts[l][id] = {};
      const name = document.getElementById(`p-name-${l}`)?.value || '';
      const desc = document.getElementById(`p-desc-${l}`)?.value || '';
      if (name) State.langProducts[l][id].name = name;
      if (desc) State.langProducts[l][id].description = desc;
      if (name || desc) markDirty(`shop/data/lang/products/${l}.json`);
    }

    markDirty('shop/data/products.json');
    document.getElementById('product-modal').classList.remove('open');
    logActivity(State.editingProduct ? 'Edited' : 'Created', `Product: ${id}`, 'blue');
    toast(`Product "${id}" saved`, 'success');
    this.render();
  },

  duplicate(id) {
    const p = State.products.find(x => x.id === id);
    if (!p) return;
    const newId = id + '-copy-' + Date.now().toString(36);
    const clone = { ...p, id: newId };
    State.products.push(clone);
    // Clone lang data (check before modifying)
    for (const l of LANGS) {
      const srcLang = State.langProducts[l];
      if (srcLang && srcLang[id]) {
        State.langProducts[l][newId] = Object.assign({}, srcLang[id]);
        markDirty('shop/data/lang/products/' + l + '.json');
      }
    }
    markDirty('shop/data/products.json');
    toast(`Duplicated as "${newId}"`, 'success');
    this.render();
  },

  delete(id) {
    confirm('Delete Product', `Delete "${State.langProducts.en?.[id]?.name || id}"? This cannot be undone.`, () => {
      State.products = State.products.filter(p => p.id !== id);
      for (const l of LANGS) {
        if (State.langProducts[l]?.[id]) { delete State.langProducts[l][id]; markDirty(`shop/data/lang/products/${l}.json`); }
      }
      markDirty('shop/data/products.json');
      logActivity('Deleted', `Product: ${id}`, 'red');
      toast(`Deleted "${id}"`, 'success');
      this.render();
    });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   SEO.JS — Meta tags, Open Graph, sitemap
   ═══════════════════════════════════════════════════════════════════ */

var SEO = {
  render() {
    const el = document.getElementById('seo-pages-list');
    if (!el) return;

    const pages = Object.keys(State.sitePages.en || {}).sort();
    el.innerHTML = pages.map(p => {
      const content = State.sitePages.en[p] || '';
      const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i);
      const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
      const title = titleMatch?.[1] || '—';
      const desc = descMatch?.[1] || '—';
      const titleScore = title === '—' ? 'red' : title.length > 60 ? 'gold' : 'green';
      const descScore = desc === '—' ? 'red' : desc.length > 160 ? 'gold' : 'green';

      return `<tr>
        <td style="font-weight:500">${escHtml(p.replace('.html',''))}</td>
        <td>
          <div style="font-size:.78rem;color:var(--text-2);max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(title)}</div>
          <span class="badge badge-${titleScore}" style="margin-top:4px">${title.length} chars</span>
        </td>
        <td>
          <div style="font-size:.78rem;color:var(--text-2);max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(desc)}</div>
          <span class="badge badge-${descScore}" style="margin-top:4px">${desc.length} chars</span>
        </td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-xs btn-secondary" onclick="SEO.editPage('${escHtml(p)}')">Edit Meta</button>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="4" class="tbl-empty">No pages loaded</td></tr>`;
  },

  editPage(page) {
    const content = State.sitePages.en?.[page] || '';
    const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const ogTitleMatch = content.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
    const ogDescMatch = content.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);

    document.getElementById('seo-edit-page').textContent = page;
    document.getElementById('seo-title').value = titleMatch?.[1] || '';
    document.getElementById('seo-desc').value = descMatch?.[1] || '';
    document.getElementById('seo-og-title').value = ogTitleMatch?.[1] || '';
    document.getElementById('seo-og-desc').value = ogDescMatch?.[1] || '';
    document.getElementById('seo-modal').classList.add('open');
    this._currentPage = page;
    this.updatePreview();
  },

  updatePreview() {
    const title = document.getElementById('seo-title')?.value || '';
    const desc = document.getElementById('seo-desc')?.value || '';
    document.getElementById('seo-preview-title').textContent = title || 'No title set';
    document.getElementById('seo-preview-desc').textContent = desc || 'No description set';
    document.getElementById('seo-title-count').textContent = title.length;
    document.getElementById('seo-desc-count').textContent = desc.length;
    document.getElementById('seo-title-count').style.color = title.length > 60 ? 'var(--amber)' : 'var(--text-3)';
    document.getElementById('seo-desc-count').style.color = desc.length > 160 ? 'var(--amber)' : 'var(--text-3)';
  },

  saveMeta() {
    const page = this._currentPage;
    if (!page || !State.sitePages.en?.[page]) return;
    let content = State.sitePages.en[page];
    const title = document.getElementById('seo-title').value;
    const desc = document.getElementById('seo-desc').value;
    const ogTitle = document.getElementById('seo-og-title').value;
    const ogDesc = document.getElementById('seo-og-desc').value;

    // Update or insert title
    if (content.includes('<title')) {
      content = content.replace(/<title[^>]*>[^<]*<\/title>/i, `<title>${title}</title>`);
    } else {
      content = content.replace('</head>', `  <title>${title}</title>\n</head>`);
    }
    // Update description
    if (content.includes('name="description"') || content.includes("name='description'")) {
      content = content.replace(/(<meta[^>]*name=["']description["'][^>]*content=["'])[^"']*(['"][^>]*>)/gi, `$1${desc}$2`);
    } else {
      content = content.replace('</head>', `  <meta name="description" content="${desc}">\n</head>`);
    }
    // Update OG
    if (ogTitle) {
      if (content.includes('og:title')) {
        content = content.replace(/(<meta[^>]*property=["']og:title["'][^>]*content=["'])[^"']*(['"][^>]*>)/gi, `$1${ogTitle}$2`);
      }
    }
    if (ogDesc) {
      if (content.includes('og:description')) {
        content = content.replace(/(<meta[^>]*property=["']og:description["'][^>]*content=["'])[^"']*(['"][^>]*>)/gi, `$1${ogDesc}$2`);
      }
    }

    State.sitePages.en[page] = content;
    markDirty(`content/en/${page}`);
    document.getElementById('seo-modal').classList.remove('open');
    toast(`SEO meta updated for ${page}`, 'success');
    logActivity('SEO Updated', page, 'blue');
    this.render();
  },

  async generateSitemap() {
    const baseUrl = 'https://dornori.com/test';
    const today   = new Date().toISOString().split('T')[0];
    const slugMap = (typeof LangManager !== 'undefined') ? LangManager.slugMap : {};
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
            + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    // Root pages per language
    for (const lang of LANGS) {
      xml += '  <url>\n    <loc>' + baseUrl + '/' + lang + '/</loc>\n';
      xml += '    <lastmod>' + today + '</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n';
    }

    // Content pages using real slugs from slug-map
    const enPages = Object.keys(State.sitePages.en || {});
    for (const file of enPages) {
      const enKey = file.replace('.html', '');
      for (const lang of LANGS) {
        const slug = (slugMap[enKey] && slugMap[enKey][lang]) ? slugMap[enKey][lang] : enKey;
        const loc  = baseUrl + '/' + lang + '/' + slug + '/';
        xml += '  <url>\n    <loc>' + loc + '</loc>\n';
        // hreflang alternates
        for (const altLang of LANGS) {
          const altSlug = (slugMap[enKey] && slugMap[enKey][altLang]) ? slugMap[enKey][altLang] : enKey;
          xml += '    <xhtml:link rel="alternate" hreflang="' + altLang + '" href="' + baseUrl + '/' + altLang + '/' + altSlug + '/"/>\n';
        }
        xml += '    <lastmod>' + today + '</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n';
      }
    }

    xml += '</urlset>';
    await FS.write('sitemap.xml', xml);
    toast('Sitemap generated — ' + enPages.length + ' pages x ' + LANGS.length + ' languages', 'success');
    logActivity('Generated', 'sitemap.xml (' + (enPages.length * LANGS.length) + ' URLs)', 'green');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   SITESETTINGS.JS — Site-wide config editor
   ═══════════════════════════════════════════════════════════════════ */

var SiteSettings = {
  _oldRender() {
    // Show raw config for editing
    const ta = document.getElementById('site-config-raw');
    if (ta) ta.value = State.siteConfigRaw || '// config.js not loaded';
    const ta2 = document.getElementById('shop-config-raw');
    if (ta2) ta2.value = State.shopConfigRaw || '// shop config.js not loaded';

    // Parsed quick-edit fields
    this.renderQuickEdit();
  },

  renderQuickEdit() {
    // Extract key values from raw config using regex
    const extract = (raw, key) => {
      const m = raw.match(new RegExp(`${key}\\s*:\\s*['"]([^'"]+)['"]`));
      return m?.[1] || '';
    };
    const extractBool = (raw, key) => {
      const m = raw.match(new RegExp(`${key}\\s*:\\s*(true|false)`));
      return m?.[1] === 'true';
    };

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };

    setVal('cfg-shop-name', extract(State.shopConfigRaw, 'shopName'));
    setVal('cfg-tagline', extract(State.shopConfigRaw, 'tagline'));
    setVal('cfg-base-currency', extract(State.shopConfigRaw, 'baseCurrency'));
    setVal('cfg-default-lang', extract(State.shopConfigRaw, 'defaultLanguage'));
    setChk('cfg-show-currency', extractBool(State.shopConfigRaw, 'showCurrencySelector'));
    setChk('cfg-show-lang', extractBool(State.shopConfigRaw, 'showLanguageSwitcher'));

    const siteCfg = State.siteConfigRaw;
    setVal('cfg-root-url', extract(siteCfg, 'root_url'));
    setVal('cfg-base-path', extract(siteCfg, 'base_path'));
  },

  applyQuickEdit() {
    const g = id => document.getElementById(id)?.value || '';
    const gc = id => document.getElementById(id)?.checked || false;

    // Update shop config
    let raw = State.shopConfigRaw;
    const replace = (r, key, val) => r.replace(new RegExp(`(${key}\\s*:\\s*)['"][^'"]*['"]`), `$1"${val}"`);
    const replaceBool = (r, key, val) => r.replace(new RegExp(`(${key}\\s*:\\s*)(true|false)`), `$1${val}`);

    raw = replace(raw, 'shopName', g('cfg-shop-name'));
    raw = replace(raw, 'tagline', g('cfg-tagline'));
    raw = replace(raw, 'baseCurrency', g('cfg-base-currency'));
    raw = replace(raw, 'defaultLanguage', g('cfg-default-lang'));
    raw = replaceBool(raw, 'showCurrencySelector', gc('cfg-show-currency'));
    raw = replaceBool(raw, 'showLanguageSwitcher', gc('cfg-show-lang'));
    State.shopConfigRaw = raw;
    markDirty('shop/js/config.js');

    // Update site config
    let siteCfg = State.siteConfigRaw;
    siteCfg = replace(siteCfg, 'root_url', g('cfg-root-url'));
    siteCfg = replace(siteCfg, 'base_path', g('cfg-base-path'));
    State.siteConfigRaw = siteCfg;
    markDirty('js/config.js');

    toast('Config updated — save to write to disk', 'success');
    logActivity('Config', 'Quick settings updated', 'blue');
  },

  saveRawShopConfig() {
    State.shopConfigRaw = document.getElementById('shop-config-raw')?.value || '';
    markDirty('shop/js/config.js');
    toast('Shop config staged', 'success');
  },

  saveRawSiteConfig() {
    State.siteConfigRaw = document.getElementById('site-config-raw')?.value || '';
    markDirty('js/config.js');
    toast('Site config staged', 'success');
  },

  saveDeeplKey() { this.saveApiKey(); }, /* legacy alias */

  onProviderChange() {
    var sel  = document.getElementById('trans-provider-select');
    var row  = document.getElementById('trans-api-key-row');
    var hint = document.getElementById('trans-key-hint');
    var lbl  = document.getElementById('trans-key-label');
    var inp  = document.getElementById('trans-key-input');
    var provider = sel ? sel.value : 'mymemory';
    localStorage.setItem('trans_provider', provider);
    var hints = {
      microsoft: 'Get a free key at <a href="https://portal.azure.com" target="_blank" style="color:var(--gold)">portal.azure.com</a> — create an Azure AI Translator resource. Free tier: 2M chars/month, no credit card.',
      deepl: 'Get a key at <a href="https://www.deepl.com/pro-api" target="_blank" style="color:var(--gold)">deepl.com/pro-api</a> — free tier: 500K chars/month, credit card required for verification.',
      google: 'Get a key at <a href="https://console.cloud.google.com" target="_blank" style="color:var(--gold)">console.cloud.google.com</a> — enable Cloud Translation API. Free: 500K chars/month, billing account required.'
    };
    if (provider === 'mymemory') {
      if (row) row.style.display = 'none';
    } else {
      if (row) row.style.display = 'block';
      if (lbl) lbl.textContent = provider.charAt(0).toUpperCase() + provider.slice(1) + ' API Key';
      if (hint) hint.innerHTML = hints[provider] || '';
      if (inp) inp.value = localStorage.getItem('trans_api_key') || '';
    }
    this._updateProviderStatus();
  },

  saveApiKey() {
    var key = ((document.getElementById('trans-key-input') || {}).value || '').trim();
    if (!key) { localStorage.removeItem('trans_api_key'); toast('API key cleared', 'info'); this._updateProviderStatus(); return; }
    localStorage.setItem('trans_api_key', key);
    toast('API key saved', 'success');
    this._updateProviderStatus();
  },

  async testApiKey() {
    var provider = localStorage.getItem('trans_provider') || 'mymemory';
    var key = localStorage.getItem('trans_api_key') || '';
    var statusEl = document.getElementById('trans-provider-status');
    if (statusEl) statusEl.textContent = ' Testing...';
    if (provider === 'mymemory') { if (statusEl) statusEl.innerHTML = ' <span style="color:var(--text-3)">MyMemory needs no key</span>'; return; }
    if (!key) return toast('Save a key first', 'warn');

    try {
      var ok = false, info = '';
      if (provider === 'deepl') {
        var res = await fetch('https://api-free.deepl.com/v2/usage', { headers:{ 'Authorization': 'DeepL-Auth-Key ' + key }});
        if (res.status === 403) { if (statusEl) statusEl.innerHTML = ' <span style="color:var(--red)">&#10005; Invalid key</span>'; return; }
        var d = await res.json();
        var rem = ((d.character_limit||500000) - (d.character_count||0)).toLocaleString();
        info = rem + ' chars remaining'; ok = true;
      } else if (provider === 'microsoft') {
        var res = await fetch('https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=de', {
          method:'POST', headers:{ 'Ocp-Apim-Subscription-Key': key, 'Content-Type':'application/json' },
          body: JSON.stringify([{ Text: 'Hello' }])
        });
        ok = res.ok; info = ok ? 'Connected' : 'Error ' + res.status;
      } else if (provider === 'google') {
        var res = await fetch('https://translation.googleapis.com/language/translate/v2?key=' + encodeURIComponent(key), {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ q:'Hello', source:'en', target:'de' })
        });
        ok = res.ok; info = ok ? 'Connected' : 'Error ' + res.status;
      }
      if (statusEl) statusEl.innerHTML = ok
        ? ' <span style="color:var(--green)">&#10003; ' + escHtml(info) + '</span>'
        : ' <span style="color:var(--red)">&#10005; ' + escHtml(info) + '</span>';
      toast(ok ? provider + ' key valid' : provider + ' test failed', ok ? 'success' : 'error');
    } catch(e) {
      if (statusEl) statusEl.innerHTML = ' <span style="color:var(--red)">&#10005; ' + escHtml(e.message) + '</span>';
    }
  },

  _updateProviderStatus() {
    var provider = localStorage.getItem('trans_provider') || 'mymemory';
    var key      = localStorage.getItem('trans_api_key') || '';
    var sel      = document.getElementById('trans-provider-select');
    var statusEl = document.getElementById('trans-provider-status');
    if (sel) sel.value = provider;
    var labels = { mymemory:'MyMemory (free fallback)', microsoft:'Microsoft Translator', deepl:'DeepL', google:'Google Translate' };
    var active = labels[provider] || provider;
    if (statusEl) statusEl.innerHTML = key || provider === 'mymemory'
      ? ' <span style="color:var(--green)">&#10003; ' + escHtml(active) + (key ? ' — key stored' : ' — no key needed') + '</span>'
      : ' <span style="color:var(--amber)">&#9888; ' + escHtml(active) + ' — no key saved yet</span>';
    this.onProviderChange();
  },

  render() {
    const ta = document.getElementById('site-config-raw');
    if (ta) ta.value = State.siteConfigRaw || '';
    const ta2 = document.getElementById('shop-config-raw');
    if (ta2) ta2.value = State.shopConfigRaw || '';
    this.renderQuickEdit();
    this._updateDeeplStatus();
  }
};

/* ═══════════════════════════════════════════════════════════════════
   REDIRECTS.JS — URL redirect management
   ═══════════════════════════════════════════════════════════════════ */

var Redirects = {
  list: [],

  render() {
    const el = document.getElementById('redirects-list');
    if (!el) return;
    el.innerHTML = this.list.map((r, i) => `
      <div class="kv-row" style="grid-template-columns:1fr 1fr 80px auto">
        <input type="text" value="${escHtml(r.from)}" oninput="Redirects.update(${i},'from',this.value)" placeholder="/old-path">
        <input type="text" value="${escHtml(r.to)}" oninput="Redirects.update(${i},'to',this.value)" placeholder="/new-path">
        <select class="form-select" oninput="Redirects.update(${i},'code',this.value)" style="padding:6px 8px">
          <option ${r.code==='301'?'selected':''}>301</option>
          <option ${r.code==='302'?'selected':''}>302</option>
        </select>
        <button class="btn-icon danger" onclick="Redirects.remove(${i})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`).join('') || `<div style="color:var(--text-3);font-size:.8rem;padding:12px 0">No redirects configured</div>`;
  },

  add() {
    this.list.push({ from: '', to: '', code: '301' });
    this.render();
  },

  update(i, key, val) {
    this.list[i][key] = val;
  },

  remove(i) {
    this.list.splice(i, 1);
    this.render();
  }
};

/* ═══════════════════════════════════════════════════════════════════
   MEDIA.JS — Image/asset management
   ═══════════════════════════════════════════════════════════════════ */

var Media = {
  files: [],

  async render() {
    const el = document.getElementById('media-grid');
    if (!el) return;
    el.innerHTML = '<div style="color:var(--text-3);padding:20px;text-align:center">Scanning assets…</div>';

    try {
      const entries = await FS.listDir('assets/images');
      this.files = entries.filter(e => e.kind === 'file');

      if (!this.files.length) {
        el.innerHTML = '<div class="empty-state"><p>No images found in assets/images/</p></div>';
        return;
      }

      el.innerHTML = this.files.map(f => {
        const ext = f.name.split('.').pop().toLowerCase();
        const isImg = ['jpg','jpeg','png','webp','gif','svg'].includes(ext);
        return `<div style="background:var(--ink-2);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;cursor:pointer" onclick="Media.selectFile('${escHtml(f.name)}')">
          <div style="height:100px;background:var(--ink-3);display:flex;align-items:center;justify-content:center;font-size:2rem;overflow:hidden">
            ${isImg
              ? `<img src="assets/images/${escHtml(f.name)}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextSibling.style.display='flex'" loading="lazy"><div style="display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:2rem">🖼</div>`
              : '📄'}
          </div>
          <div style="padding:8px 10px">
            <div style="font-size:.74rem;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escHtml(f.name)}">${escHtml(f.name)}</div>
          </div>
        </div>`;
      }).join('');
    } catch(e) {
      el.innerHTML = `<div class="empty-state"><p>Could not read assets/images/: ${e.message}</p></div>`;
    }
  },

  selectFile(name, dir) {
    const path = (dir || 'assets/images') + '/' + name;
    if (navigator.clipboard) navigator.clipboard.writeText(path);
    toast('Path copied: ' + path, 'success');
  }
};
