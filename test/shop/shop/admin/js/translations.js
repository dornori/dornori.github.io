'use strict';

const Translations = {
  render() {
    const type = document.getElementById('trans-type').value;
    const lang = document.getElementById('trans-lang').value;
    const q    = document.getElementById('trans-search').value.toLowerCase();
    const miss = document.getElementById('trans-missing-only').checked;

    document.getElementById('trans-lang-label').textContent = LANG_NAMES[lang] || lang;

    const en = type === 'ui' ? State.langUi.en : State.langProducts.en;
    if (!en) { document.getElementById('trans-body').innerHTML = '<div style="padding:24px;color:var(--text-3)">English source not loaded</div>'; return; }

    const target = type === 'ui' ? (State.langUi[lang] ||= {}) : (State.langProducts[lang] ||= {});
    const keys = this._flatKeys(en);

    const filtered = keys.filter(k => {
      if (q && !k.toLowerCase().includes(q)) return false;
      if (miss && this._get(target, k)) return false;
      return true;
    });

    document.getElementById('trans-body').innerHTML = filtered.map(k => {
      const enVal   = escHtml(this._get(en, k) || '');
      const tgtVal  = this._get(target, k) || '';
      const missing = !tgtVal;
      const long    = (this._get(en, k) || '').length > 60;
      const esc_k   = k.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      const inputEl = long
        ? `<textarea rows="2" style="width:100%" oninput="Translations.set('${lang}','${type}','${esc_k}',this.value)">${escHtml(tgtVal)}</textarea>`
        : `<input type="text" style="width:100%" value="${escHtml(tgtVal)}" oninput="Translations.set('${lang}','${type}','${esc_k}',this.value)">`;
      return `<div class="trans-row ${missing?'trans-missing':''}">
        <div class="trans-key">${escHtml(k)}</div>
        <div style="font-size:.82rem;color:var(--text-2);padding-top:${long?4:9}px">${enVal}</div>
        <div>${inputEl}</div>
      </div>`;
    }).join('') || '<div style="padding:24px;text-align:center;color:var(--text-3)">No matching keys</div>';
  },

  set(lang, type, key, val) {
    const target = type === 'ui' ? (State.langUi[lang] ||= {}) : (State.langProducts[lang] ||= {});
    this._setDeep(target, key, val);
    markDirty(`data/lang/${type}/${lang}.json`);
  },

  // ── AUTO TRANSLATE ──────────────────────────────────────────────────────────
  // Uses MyMemory free API (no key needed, 5000 chars/day) with
  // LibreTranslate public instance as fallback.
  // Only content fields are translated (not IDs/slugs/URLs/keys).

  async translateAll() {
    const type = document.getElementById('trans-type').value;
    const lang = document.getElementById('trans-lang').value;

    const en = type === 'ui' ? State.langUi.en : State.langProducts.en;
    const target = type === 'ui' ? (State.langUi[lang] ||= {}) : (State.langProducts[lang] ||= {});
    const keys = this._flatKeys(en).filter(k => !this._get(target, k));

    if (!keys.length) return toast('No missing translations for ' + lang, 'info');

    // Determine language pair code
    const langMap = { de: 'de', nl: 'nl', no: 'no' };
    const tgtCode = langMap[lang] || lang;

    const prog = document.getElementById('trans-progress');
    prog.style.display = '';
    let done = 0;

    for (const k of keys) {
      const src = this._get(en, k);
      if (!src || typeof src !== 'string') continue;

      // Skip non-translatable: short IDs/codes, URLs, numeric strings
      if (/^[a-z_]+$/.test(src) || src.startsWith('http') || /^\d+$/.test(src)) continue;

      try {
        const translated = await this._translate(src, tgtCode);
        if (translated) {
          this._setDeep(target, k, translated);
          markDirty(`data/lang/${type}/${lang}.json`);
        }
      } catch {}

      done++;
      prog.textContent = `${done}/${keys.length} translated…`;
      await new Promise(r => setTimeout(r, 120)); // rate limit
    }

    prog.style.display = 'none';
    this.render();
    toast(`Translated ${done} strings into ${LANG_NAMES[lang]}`, 'success');
  },

  async _translate(text, lang) {
    // Primary: MyMemory (free, no key, 5000 chars/day)
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${lang}`;
      const r = await fetch(url);
      if (r.ok) {
        const d = await r.json();
        if (d.responseStatus === 200 && d.responseData?.translatedText) {
          const t = d.responseData.translatedText;
          // Reject if same as source or error markers
          if (t !== text && !t.includes('QUERY LENGTH')) return t;
        }
      }
    } catch {}

    // Fallback: LibreTranslate public (rate limited but free)
    try {
      const r = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'en', target: lang, format: 'text' })
      });
      if (r.ok) {
        const d = await r.json();
        if (d.translatedText && d.translatedText !== text) return d.translatedText;
      }
    } catch {}

    return null; // both failed — leave blank
  },

  // ── HELPERS ────────────────────────────────────────────────────────────────
  _flatKeys(obj, prefix = '') {
    const keys = [];
    for (const k of Object.keys(obj || {})) {
      const full = prefix ? prefix + '.' + k : k;
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k]))
        keys.push(...this._flatKeys(obj[k], full));
      else
        keys.push(full);
    }
    return keys;
  },

  _get(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  },

  _setDeep(obj, path, val) {
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts.slice(0, -1)) cur = (cur[p] ??= {});
    cur[parts.at(-1)] = val;
  }
};
