/* ═══════════════════════════════════════════════════════════════════
   PAGES.JS — Site page management + translation propagation
   ═══════════════════════════════════════════════════════════════════ */

var Pages = {
  currentPage: null,
  currentLang: 'en',
  translating: false,

  render() {
    const pages = Object.keys(State.sitePages.en || {}).sort();
    const tbody = document.getElementById('pages-tbody');
    if (!tbody) return;

    const q = document.getElementById('pages-search')?.value?.toLowerCase() || '';

    tbody.innerHTML = pages
      .filter(p => !q || p.includes(q))
      .map(p => {
        // Check which langs have this page
        const langStatus = LANGS.map(l => {
          const content = State.sitePages[l]?.[p];
          if (!content) return `<span class="lang-pill missing" title="${LANG_NAMES[l]} — missing">${l}</span>`;
          const isShort = content.length < 100;
          if (isShort) return `<span class="lang-pill partial" title="${LANG_NAMES[l]} — stub">${l}</span>`;
          return `<span class="lang-pill active" title="${LANG_NAMES[l]} — ok">${l}</span>`;
        }).join('');

        const enLen   = State.sitePages.en[p]?.length || 0;
        const enText  = (State.sitePages.en[p] || '').replace(/<[^>]+>/g, ' ');
        const words   = enText.trim().split(/\s+/).filter(w => w.length > 0).length;
        const readMin = Math.max(1, Math.round(words / 200));
        return `<tr class="row-link" onclick="Pages.openEdit('${escHtml(p)}')">
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              <span style="font-weight:500">${escHtml(p.replace('.html',''))}</span>
            </div>
          </td>
          <td><span class="td-mono">${escHtml(p)}</span></td>
          <td><div class="lang-pills" style="gap:4px">${langStatus}</div></td>
          <td style="color:var(--text-3);font-size:.76rem">${(enLen/1024).toFixed(1)} KB · ${words} words · ${readMin}min</td>
          <td onclick="event.stopPropagation()">
            <div class="td-actions">
              <button class="btn-icon" onclick="Pages.openEdit('${escHtml(p)}')" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon" onclick="Pages.translatePage('${escHtml(p)}')" title="Auto-translate all langs">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
              </button>
              <button class="btn-icon danger" onclick="Pages.deletePage('${escHtml(p)}')" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
      }).join('') || `<tr><td colspan="5" class="tbl-empty">No pages found</td></tr>`;
  },

  quickEdit(page) {
    App.nav(null, 'pages');
    setTimeout(() => this.openEdit(page), 100);
  },

  openEdit(page) {
    this.currentPage = page;
    this.currentLang = 'en';
    document.getElementById('page-edit-title').textContent = page.replace('.html','');
    this.renderLangTabs();
    this.loadPageContent();
    document.getElementById('page-modal').classList.add('open');
  },

  renderLangTabs() {
    const el = document.getElementById('page-lang-tabs');
    el.innerHTML = LANGS.map(l => {
      const has = State.sitePages[l]?.[this.currentPage];
      const cls = l === this.currentLang ? 'active' : '';
      const missing = !has ? ' style="opacity:.5"' : '';
      return `<div class="tab ${cls}" onclick="Pages.switchLang('${l}')"${missing}>
        ${LANG_FLAGS[l]} ${l.toUpperCase()}
        ${!has ? '<span class="nav-badge" style="margin-left:4px">!</span>' : ''}
      </div>`;
    }).join('');
  },

  switchLang(lang) {
    this.currentLang = lang;
    this.renderLangTabs();
    this.loadPageContent();
  },

  loadPageContent() {
    const content = State.sitePages[this.currentLang]?.[this.currentPage] || '';
    const ta = document.getElementById('page-source-editor');
    if (ta) ta.value = content;
    const preview = document.getElementById('page-preview');
    if (preview) {
      if (preview._blobUrl) URL.revokeObjectURL(preview._blobUrl);
      const blob = new Blob([content], { type: 'text/html' });
      preview._blobUrl = URL.createObjectURL(blob);
      preview.src = preview._blobUrl;
    }
    // Update lang badge
    const badge = document.getElementById('page-edit-lang-badge');
    if (badge) badge.textContent = content ? `${LANG_NAMES[this.currentLang]} — ${(content.length/1024).toFixed(1)} KB` : `${LANG_NAMES[this.currentLang]} — no content`;
  },

  savePageEdit() {
    const ta = document.getElementById('page-source-editor');
    if (!ta || !this.currentPage) return;
    if (!State.sitePages[this.currentLang]) State.sitePages[this.currentLang] = {};
    State.sitePages[this.currentLang][this.currentPage] = ta.value;
    markDirty(`content/${this.currentLang}/${this.currentPage}`);
    logActivity('Edited', `${this.currentPage} (${this.currentLang})`, 'blue');
    toast(`Page saved — ${this.currentPage} (${this.currentLang})`, 'success');
  },

  async translatePage(page) {
    if (this.translating) return;
    const enContent = State.sitePages.en?.[page];
    if (!enContent) return toast('No English source to translate', 'error');

    lmResetQuota();
    LM_PROGRESS.lang  = 'all languages';
    LM_PROGRESS.total = LANGS.filter(l => l !== 'en').length * 20; // rough estimate
    this.translating = true;
    toast('Auto-translating page to all languages…', 'info');

    for (const lang of LANGS.filter(l => l !== 'en')) {
      try {
        const translated = await this._translateHtml(enContent, lang);
        if (!State.sitePages[lang]) State.sitePages[lang] = {};
        State.sitePages[lang][page] = translated;
        markDirty(`content/${lang}/${page}`);
      } catch(e) {
        toast(`Translation to ${lang} failed: ${e.message}`, 'warn');
      }
    }

    this.translating = false;
    logActivity('Translated', page + ' -> all langs', 'blue');
    toast('Translation complete — saving to disk...', 'success');
    // Auto-save all translated versions to disk immediately
    await App.save();
    this.render();
  },

  async _translateHtml(html, tl) {
    /* Split on tags, translate text nodes, reassemble - same engine as JSON */
    var tlCode = LANG_TL[tl] || tl;
    var parts = html.split(/(<[^>]+>)/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p || p.charAt(0) === '<' || !p.trim()) { out.push(p); continue; }
      if (!p.replace(/[\s&nbsp;.,;:!?\-–—''""()\/\\]/g, '').length) { out.push(p); continue; }
      var lead  = p.match(/^\s*/)[0];
      var trail = p.match(/\s*$/)[0];
      var t     = await lmTranslateText(p.trim(), tlCode);
      out.push(lead + (t || p.trim()) + trail);
    }
    return out.join('');
  },

  updatePreview() {
    const ta = document.getElementById('page-source-editor');
    const preview = document.getElementById('page-preview');
    if (ta && preview) {
      const blob = new Blob([ta.value], { type: 'text/html' });
      preview.src = URL.createObjectURL(blob);
    }
  }
};
