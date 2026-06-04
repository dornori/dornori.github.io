/* lang-manager.js */

var LANG_CATALOGUE = [
  { code:'en', name:'English',   flag:'EN', locale:'en-GB', tl:'en',  dir:'ltr' },
  { code:'de', name:'Deutsch',   flag:'DE', locale:'de-DE', tl:'de',  dir:'ltr' },
  { code:'nl', name:'Nederlands',flag:'NL', locale:'nl-NL', tl:'nl',  dir:'ltr' },
  { code:'fr', name:'Francais',  flag:'FR', locale:'fr-FR', tl:'fr',  dir:'ltr' },
  { code:'no', name:'Norsk',     flag:'NO', locale:'nb-NO', tl:'nb',  dir:'ltr' },
  { code:'sv', name:'Svenska',   flag:'SV', locale:'sv-SE', tl:'sv',  dir:'ltr' },
  { code:'da', name:'Dansk',     flag:'DA', locale:'da-DK', tl:'da',  dir:'ltr' },
  { code:'fi', name:'Suomi',     flag:'FI', locale:'fi-FI', tl:'fi',  dir:'ltr' },
  { code:'it', name:'Italiano',  flag:'IT', locale:'it-IT', tl:'it',  dir:'ltr' },
  { code:'es', name:'Espanol',   flag:'ES', locale:'es-ES', tl:'es',  dir:'ltr' },
  { code:'pt', name:'Portugues', flag:'PT', locale:'pt-PT', tl:'pt',  dir:'ltr' },
  { code:'pl', name:'Polski',    flag:'PL', locale:'pl-PL', tl:'pl',  dir:'ltr' },
  { code:'cs', name:'Cestina',   flag:'CS', locale:'cs-CZ', tl:'cs',  dir:'ltr' },
  { code:'ro', name:'Romana',    flag:'RO', locale:'ro-RO', tl:'ro',  dir:'ltr' },
  { code:'tr', name:'Turkce',    flag:'TR', locale:'tr-TR', tl:'tr',  dir:'ltr' },
  { code:'hu', name:'Magyar',    flag:'HU', locale:'hu-HU', tl:'hu',  dir:'ltr' },
  { code:'el', name:'Greek',     flag:'EL', locale:'el-GR', tl:'el',  dir:'ltr' },
  { code:'ja', name:'Japanese',  flag:'JA', locale:'ja-JP', tl:'ja',  dir:'ltr' },
  { code:'ko', name:'Korean',    flag:'KO', locale:'ko-KR', tl:'ko',  dir:'ltr' },
  { code:'zh', name:'Chinese',   flag:'ZH', locale:'zh-CN', tl:'zh',  dir:'ltr' },
  { code:'ar', name:'Arabic',    flag:'AR', locale:'ar-SA', tl:'ar',  dir:'rtl' }
];

var SLUG_SEED = {
  sv: { about:'om-oss', built:'fardigbyggd', cart:'varukorg', children:'barnsakerhet', contact:'kontakt', cookies:'kakor', files:'3d-filer', gallery:'galleri', imprint:'juridisk', kit:'byggsats', 'mission-statement':'var-mission', parts:'reservdelar', privacy:'integritet', product:'produkt', returns:'returpolicy', security:'sakerhetscenter', shop:'butik', terms:'villkor' },
  da: { about:'om-os', built:'faerdigbygget', cart:'indkoebskurv', children:'bornesikkerhed', contact:'kontakt', cookies:'cookiepolitik', files:'3d-filer', gallery:'galleri', imprint:'juridisk', kit:'byggesaet', 'mission-statement':'vores-mission', parts:'reservedele', privacy:'privatlivspolitik', product:'produkt', returns:'returpolitik', security:'sikkerhedscenter', shop:'butik', terms:'vilkaar' },
  fi: { about:'meista', built:'valmis', cart:'ostoskori', children:'lastenturvallisuus', contact:'yhteystiedot', cookies:'evasteet', files:'3d-tiedostot', gallery:'galleria', imprint:'juridinen', kit:'rakennuspaketti', 'mission-statement':'missio', parts:'varaosat', privacy:'tietosuoja', product:'tuote', returns:'palautuspolitiikka', security:'turvallisuuskeskus', shop:'kauppa', terms:'kayttoehdot' },
  it: { about:'chi-siamo', built:'gia-montato', cart:'carrello', children:'sicurezza-bambini', contact:'contatti', cookies:'cookie', files:'file-3d', gallery:'galleria', imprint:'note-legali', kit:'kit-costruzione', 'mission-statement':'missione', parts:'ricambi', privacy:'privacy', product:'prodotto', returns:'rimborsi', security:'centro-sicurezza', shop:'negozio', terms:'termini' },
  es: { about:'sobre-nosotros', built:'ya-montado', cart:'carrito', children:'seguridad-infantil', contact:'contacto', cookies:'cookies', files:'archivos-3d', gallery:'galeria', imprint:'aviso-legal', kit:'kit-construccion', 'mission-statement':'mision', parts:'repuestos', privacy:'privacidad', product:'producto', returns:'devoluciones', security:'centro-seguridad', shop:'tienda', terms:'terminos' },
  pt: { about:'sobre-nos', built:'ja-montado', cart:'carrinho', children:'seguranca-infantil', contact:'contato', cookies:'cookies', files:'ficheiros-3d', gallery:'galeria', imprint:'impressum', kit:'kit-construcao', 'mission-statement':'missao', parts:'pecas', privacy:'privacidade', product:'produto', returns:'devolucoes', security:'centro-seguranca', shop:'loja', terms:'termos' },
  pl: { about:'o-nas', built:'gotowy', cart:'koszyk', children:'bezpieczenstwo-dzieci', contact:'kontakt', cookies:'ciasteczka', files:'pliki-3d', gallery:'galeria', imprint:'impressum', kit:'zestaw-budowy', 'mission-statement':'misja', parts:'czesci', privacy:'prywatnosc', product:'produkt', returns:'zwroty', security:'centrum-bezpieczenstwa', shop:'sklep', terms:'warunki' }
};

/* ── Translation helpers ──────────────────────────────────────────── */

var LM_QUOTA_HIT  = false;
var LM_PAUSED     = false;
var LM_RESUME_CB  = null;
var LM_DELAY_MS   = 120;   /* DeepL is faster, smaller delay needed */
var LM_CHAR_LIMIT = 4500;  /* DeepL supports up to 128k chars/request */
var LM_CHAR_LIMIT_MM = 450; /* MyMemory fallback limit */
var LM_PROGRESS   = { done:0, total:0, failed:0, lang:'' };

/* ── Translation provider codes ────────────────────────────────────── */
var DEEPL_CODES = {
  en:'EN', de:'DE', nl:'NL', fr:'FR', no:'NB', sv:'SV', da:'DA',
  fi:'FI', it:'IT', es:'ES', pt:'PT-PT', pl:'PL', cs:'CS', ro:'RO',
  tr:'TR', hu:'HU', el:'EL', zh:'ZH', ja:'JA', ko:'KO', ar:'AR'
};
/* Microsoft Translator uses the same codes as MyMemory mostly, with a few exceptions */
var MSFT_CODES = {
  en:'en', de:'de', nl:'nl', fr:'fr', no:'nb', sv:'sv', da:'da',
  fi:'fi', it:'it', es:'es', pt:'pt-pt', pl:'pl', cs:'cs', ro:'ro',
  tr:'tr', hu:'hu', el:'el', zh:'zh-Hans', ja:'ja', ko:'ko', ar:'ar'
};

function lmGetProvider()  { return localStorage.getItem('trans_provider') || 'mymemory'; }
function lmGetApiKey()    { return (localStorage.getItem('trans_api_key') || '').trim(); }

/* DeepL — best quality for European langs, free tier needs credit card */
async function lmDeepL(text, tl) {
  var key = lmGetApiKey();
  if (!key) return null;
  var targetLang = DEEPL_CODES[tl] || tl.toUpperCase();
  try {
    var body = 'auth_key=' + encodeURIComponent(key)
             + '&text=' + encodeURIComponent(text)
             + '&source_lang=EN&target_lang=' + encodeURIComponent(targetLang)
             + '&tag_handling=html&preserve_formatting=1';
    var res = await fetch('https://api-free.deepl.com/v2/translate', {
      method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:body, signal: AbortSignal.timeout(12000)
    });
    if (res.status === 403) { toast('DeepL API key invalid', 'error'); localStorage.removeItem('trans_api_key'); return null; }
    if (res.status === 456) { toast('DeepL monthly quota exhausted', 'warn'); return null; }
    if (!res.ok) return null;
    var d = await res.json();
    return (d.translations && d.translations[0]) ? d.translations[0].text : null;
  } catch(e) { console.warn('DeepL:', e.message); return null; }
}

/* Microsoft Translator — 2M free chars/month, no credit card, good quality */
async function lmMicrosoft(text, tl) {
  var key = lmGetApiKey();
  if (!key) return null;
  var toLang = MSFT_CODES[tl] || tl;
  try {
    var res = await fetch('https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=' + encodeURIComponent(toLang), {
      method:'POST',
      headers:{ 'Ocp-Apim-Subscription-Key': key, 'Content-Type':'application/json' },
      body: JSON.stringify([{ Text: text }]),
      signal: AbortSignal.timeout(12000)
    });
    if (res.status === 401) { toast('Microsoft Translator key invalid', 'error'); return null; }
    if (!res.ok) return null;
    var d = await res.json();
    return (d[0] && d[0].translations && d[0].translations[0]) ? d[0].translations[0].text : null;
  } catch(e) { console.warn('Microsoft Translator:', e.message); return null; }
}

/* Google Cloud Translation Basic */
async function lmGoogle(text, tl) {
  var key = lmGetApiKey();
  if (!key) return null;
  try {
    var res = await fetch('https://translation.googleapis.com/language/translate/v2?key=' + encodeURIComponent(key), {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ q:text, source:'en', target:tl, format:'html' }),
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return null;
    var d = await res.json();
    return (d.data && d.data.translations && d.data.translations[0]) ? d.data.translations[0].translatedText : null;
  } catch(e) { console.warn('Google Translate:', e.message); return null; }
}

/* Translate via MyMemory — fallback when no DeepL key */
async function lmMyMemory(text, tl) {
  /* Chunk to MyMemory's 450 char limit */
  if (text.length > LM_CHAR_LIMIT_MM) {
    var chunks = [], remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= LM_CHAR_LIMIT_MM) { chunks.push(remaining); break; }
      var sub = remaining.slice(0, LM_CHAR_LIMIT_MM);
      var cut = Math.max(sub.lastIndexOf('. '), sub.lastIndexOf('! '), sub.lastIndexOf('? '), sub.lastIndexOf(' '));
      if (cut < 1) cut = LM_CHAR_LIMIT_MM;
      chunks.push(remaining.slice(0, cut + 1).trim());
      remaining = remaining.slice(cut + 1).trim();
    }
    var out = [];
    for (var i = 0; i < chunks.length; i++) {
      out.push(await lmMyMemory(chunks[i], tl));
      if (LM_QUOTA_HIT) { for (var j = i+1; j < chunks.length; j++) out.push(chunks[j]); break; }
    }
    return out.join(' ');
  }
  var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=en|' + tl;
  try {
    var res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var d = await res.json();
    if (!d || !d.responseData) return text;
    var t = String(d.responseData.translatedText || '');
    if (t.toUpperCase().indexOf('MYMEMORY') !== -1 || t.toUpperCase().indexOf('QUERY LENGTH') !== -1) {
      LM_QUOTA_HIT = true;
      lmShowBar('MyMemory quota reached. Add a DeepL API key in Site Settings for better quality.', Math.round(LM_PROGRESS.done / Math.max(1, LM_PROGRESS.total) * 100), true);
      toast('MyMemory quota reached — add DeepL API key in Site Settings', 'warn', 10000);
      return text;
    }
    if (d.responseStatus === 429 || d.responseStatus === 403) { LM_QUOTA_HIT = true; return text; }
    if (!t || t === text) return text;
    return t;
  } catch(e) {
    LM_PROGRESS.failed++;
    lmMonitorLog('ERROR', text, e.message);
    if (LM_PROGRESS.failed > 5) { LM_QUOTA_HIT = true; lmShowBar('Translation stopped: ' + e.message, 0, true); }
    return text;
  }
}

function lmShowBar(msg, pct, showResume) {
  var bar = document.getElementById('lm-status-bar');
  if (!bar) return;
  bar.style.display = 'block';
  var btn = showResume
    ? '<button class="btn btn-xs btn-primary" style="margin-left:8px" onclick="LM_PAUSED=false;LM_QUOTA_HIT=false;if(LM_RESUME_CB)LM_RESUME_CB()">Resume</button>'
    : '<button class="btn btn-xs btn-ghost" style="margin-left:8px" onclick="LM_PAUSED=true">Pause</button>';
  bar.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    + '<div style="flex:1;min-width:180px">'
      + '<div style="font-size:.72rem;color:var(--text-2);margin-bottom:3px">' + escHtml(msg) + '</div>'
      + '<div class="progress-bar" style="margin:0"><div class="progress-fill green" style="width:' + pct + '%"></div></div>'
    + '</div>'
    + '<span style="font-size:.72rem;font-family:var(--mono);color:var(--text-3);white-space:nowrap">'
      + LM_PROGRESS.done + '/' + LM_PROGRESS.total
    + '</span>'
    + btn
    + '<button class="btn-icon" onclick="document.getElementById(\'lm-status-bar\').style.display=\'none\'" style="flex-shrink:0">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    + '</button>'
    + '</div>';
}

function lmHideBar() {
  var bar = document.getElementById('lm-status-bar');
  if (bar) bar.style.display = 'none';
}

function lmResetQuota() {
  LM_QUOTA_HIT = false;
  LM_PAUSED    = false;
  LM_RESUME_CB = null;
  LM_PROGRESS  = { done:0, total:0, failed:0, lang:'' };
  lmHideBar();
  lmMonitorClear();
}

/* ── Translation Monitor ────────────────────────────────────────────
   Collapsible panel that logs every translate call in real time.
   Shows: provider, source text, result, timing, errors.
────────────────────────────────────────────────────────────────────── */
var LM_MONITOR_LOGS = [];
var LM_MONITOR_MAX  = 500;
var LM_MONITOR_START = 0;  /* timestamp of current job */

function lmMonitorLog(provider, source, result) {
  var ms = Date.now() - LM_MONITOR_START;
  var entry = {
    t:       ms,
    p:       provider,
    src:     String(source  || '').slice(0, 80),
    res:     String(result  || '').slice(0, 80),
    ok:      provider !== 'ERROR' && result && result !== source
  };
  LM_MONITOR_LOGS.push(entry);
  if (LM_MONITOR_LOGS.length > LM_MONITOR_MAX) LM_MONITOR_LOGS.shift();
  lmMonitorRender();
}

function lmMonitorClear() {
  LM_MONITOR_LOGS = [];
  LM_MONITOR_START = Date.now();
  lmMonitorRender();
}

function lmMonitorRender() {
  var el = document.getElementById('lm-monitor-body');
  if (!el) return;
  /* Only render last 80 entries for performance */
  var entries = LM_MONITOR_LOGS.slice(-80);
  var html = entries.map(function(e) {
    var color = e.p === 'ERROR' ? 'var(--red)' : (e.ok ? 'var(--green)' : 'var(--amber)');
    var badge = '<span style="background:' + color + ';color:var(--ink);font-size:.6rem;padding:1px 5px;border-radius:3px;font-weight:700;flex-shrink:0">' + e.p + '</span>';
    var time  = '<span style="color:var(--text-4);font-size:.65rem;flex-shrink:0;font-family:var(--mono)">' + (e.t/1000).toFixed(1) + 's</span>';
    var src   = '<span style="color:var(--text-3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem">' + escHtml(e.src) + '</span>';
    var arr   = '<span style="color:var(--text-4);flex-shrink:0">&#8594;</span>';
    var res   = e.p === 'ERROR'
      ? '<span style="color:var(--red);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem">' + escHtml(e.res) + '</span>'
      : '<span style="color:var(--text-2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem">' + escHtml(e.res) + '</span>';
    return '<div style="display:flex;align-items:center;gap:6px;padding:3px 10px;border-bottom:1px solid rgba(46,43,36,.3)">'
         + time + badge + src + arr + res
         + '</div>';
  }).join('');
  el.innerHTML = html || '<div style="padding:12px;color:var(--text-4);font-size:.76rem">No translations yet — add a language to see output here.</div>';
  /* Auto-scroll to bottom */
  el.scrollTop = el.scrollHeight;
}

function lmMonitorToggle() {
  var panel = document.getElementById('lm-monitor-panel');
  var btn   = document.getElementById('lm-monitor-toggle-btn');
  if (!panel) return;
  var open = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  if (btn) btn.textContent = open ? '▲ Monitor' : '▼ Monitor';
  if (!open) lmMonitorRender();
}

function lmSlugify(text) {
  return String(text || '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'page';
}

function lmCountKeys(obj) {
  var count = 0;
  if (!obj || typeof obj !== 'object') return 0;
  Object.keys(obj).forEach(function(k) {
    var v = obj[k];
    if (typeof v === 'string') count++;
    else if (Array.isArray(v)) v.forEach(function(i) { if (i && typeof i === 'object') count += lmCountKeys(i); else if (typeof i === 'string') count++; });
    else if (v && typeof v === 'object') count += lmCountKeys(v);
  });
  return count;
}

function lmCountHtmlNodes(html) {
  if (!html) return 0;
  var parts = html.split(/<[^>]+>/);
  var count = 0;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p && p.trim() && p.replace(/[\s .,;:!?\-–—'"()\/\\]/g, '').length > 0) count++;
  }
  return count;
}

function lmCalcTotal() {
  var jsonKeys    = lmCountKeys(State.langUi.en || {}) + lmCountKeys(State.langProducts.en || {}) + Object.keys(State.langProducts.en || {}).length * 2;
  var slugKeys    = Object.keys((typeof LangManager !== 'undefined' && LangManager.slugMap) ? LangManager.slugMap : {}).length;
  var contentNodes = 0;
  var enPages = Object.keys((State.sitePages && State.sitePages.en) ? State.sitePages.en : {});
  for (var i = 0; i < enPages.length; i++) {
    contentNodes += lmCountHtmlNodes(State.sitePages.en[enPages[i]]);
  }
  return jsonKeys + slugKeys + contentNodes;
}

function lmSaveCheckpoint(lang, type, data) {
  try { localStorage.setItem('lm_cp_' + lang + '_' + type, JSON.stringify({ data: data, ts: Date.now() })); } catch(e) {}
}
function lmLoadCheckpoint(lang, type) {
  try { var r = localStorage.getItem('lm_cp_' + lang + '_' + type); return r ? JSON.parse(r) : null; } catch(e) { return null; }
}
function lmClearCheckpoint(lang, type) {
  try { localStorage.removeItem('lm_cp_' + lang + '_' + type); } catch(e) {}
}

/* Main translate — uses selected provider, falls back to MyMemory */
async function lmTranslateText(text, tl) {
  if (!text || !text.trim() || tl === 'en') return text;
  if (LM_QUOTA_HIT) return text;
  while (LM_PAUSED) { await new Promise(function(r) { setTimeout(r, 300); }); }

  var provider = lmGetProvider();
  var result = null;
  var label  = 'MyMemory';

  if (provider === 'deepl')     { result = await lmDeepL(text, tl);     label = 'DeepL'; }
  if (provider === 'microsoft') { result = await lmMicrosoft(text, tl); label = 'Microsoft'; }
  if (provider === 'google')    { result = await lmGoogle(text, tl);    label = 'Google'; }

  /* Fall back to MyMemory if no key or provider failed */
  if (result === null) {
    label  = 'MyMemory';
    result = await lmMyMemory(text, tl);
  }

  if (!LM_QUOTA_HIT && result) {
    LM_PROGRESS.done++;
    var pct = Math.min(100, Math.round(LM_PROGRESS.done / Math.max(1, LM_PROGRESS.total) * 100));
    lmShowBar('Translating to ' + LM_PROGRESS.lang + ' via ' + label + '... ' + pct + '%', pct, false);
    lmMonitorLog(label, text, result);
    await new Promise(function(r) { setTimeout(r, LM_DELAY_MS); });
  }
  return result || text;
}

async function lmTranslateChunked(text, tl) {
  var chunks = [], remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= LM_CHAR_LIMIT) { chunks.push(remaining); break; }
    var sub = remaining.slice(0, LM_CHAR_LIMIT);
    var cut = Math.max(sub.lastIndexOf('. '), sub.lastIndexOf('! '), sub.lastIndexOf('? '), sub.lastIndexOf('\n'));
    if (cut < 20) cut = sub.lastIndexOf(' ');
    if (cut < 1)  cut = LM_CHAR_LIMIT;
    chunks.push(remaining.slice(0, cut + 1).trim());
    remaining = remaining.slice(cut + 1).trim();
  }
  var out = [];
  for (var i = 0; i < chunks.length; i++) {
    out.push(await lmTranslateText(chunks[i], tl));
    if (LM_QUOTA_HIT) { for (var j = i + 1; j < chunks.length; j++) out.push(chunks[j]); break; }
  }
  return out.join(' ');
}

async function lmTranslateTree(obj, tl, resume) {
  var result = resume ? Object.assign({}, resume) : {};
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = obj[k];
    if (result[k] !== undefined && typeof v === 'string') continue;
    if (typeof v === 'string') {
      result[k] = await lmTranslateText(v, tl);
    } else if (Array.isArray(v)) {
      var arr = result[k] || [];
      for (var j = 0; j < v.length; j++) {
        if (arr[j] !== undefined) continue;
        if (v[j] && typeof v[j] === 'object') arr[j] = await lmTranslateTree(v[j], tl, null);
        else if (typeof v[j] === 'string') arr[j] = await lmTranslateText(v[j], tl);
        else arr[j] = v[j];
      }
      result[k] = arr;
    } else if (v && typeof v === 'object') {
      result[k] = await lmTranslateTree(v, tl, result[k] || null);
    } else {
      result[k] = v;
    }
    if (LM_QUOTA_HIT) break;
  }
  return result;
}

async function lmFillMissing(source, target, tl) {
  var result = Object.assign({}, target);
  var keys = Object.keys(source);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i], v = source[k];
    if (typeof v === 'string') {
      if (!result[k]) result[k] = await lmTranslateText(v, tl);
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = await lmFillMissing(v, result[k] || {}, tl);
    } else {
      if (result[k] === undefined) result[k] = v;
    }
    if (LM_QUOTA_HIT) break;
  }
  return result;
}

/* ── Main LangManager object ──────────────────────────────────────── */

var LangManager = {

  registry: [],
  slugMap:  {},

  /* Load languages.json + slug-map.js from disk, sync LANGS globals */
  loadRegistry: async function() {
    var raw = await FS.read('js/languages.json');
    if (raw) {
      try {
        this.registry = JSON.parse(raw);
        var lngs = [], names = {}, flags = {}, locs = {};
        this.registry.forEach(function(l) {
          lngs.push(l.code);
          names[l.code] = l.name;
          flags[l.code] = l.flag;
          locs[l.code]  = l.locale;
        });
        LANGS = lngs; LANG_NAMES = names; LANG_FLAGS = flags; LANG_LOCALES = locs;
      } catch(e) { console.warn('loadRegistry:', e); }
    }
    var sm = await FS.read('js/slug-map.js');
    if (sm) {
      try {
        var m = sm.match(/var SLUG_MAP\s*=\s*(\{[\s\S]*?\});/) || sm.match(/const SLUG_MAP\s*=\s*(\{[\s\S]*?\});/);
        if (m) this.slugMap = Function('return ' + m[1])();
      } catch(e) { console.warn('slugMap parse:', e); }
    }
    /* Always sync registry from LANGS in case json missing */
    this._syncRegistry();
  },

  /* Ensure registry reflects LANGS even if languages.json not loaded yet */
  _syncRegistry: function() {
    var existing = this.registry.map(function(l) { return l.code; });
    for (var i = 0; i < LANGS.length; i++) {
      var code = LANGS[i];
      if (existing.indexOf(code) !== -1) continue;
      var meta = this._getMeta(code);
      this.registry.push({ code: code, name: meta.name, flag: meta.flag, locale: meta.locale, urlPrefix: '/test/' + code + '/', dir: meta.dir });
    }
  },

  _getMeta: function(code) {
    for (var i = 0; i < LANG_CATALOGUE.length; i++) {
      if (LANG_CATALOGUE[i].code === code) return LANG_CATALOGUE[i];
    }
    return { code: code, name: LANG_NAMES[code] || code, flag: LANG_FLAGS[code] || code.toUpperCase(), locale: LANG_LOCALES[code] || code, dir: 'ltr', tl: code };
  },

  /* Render the Languages view */
  render: function() {
    var el = document.getElementById('lang-list');
    if (!el) return;

    /* Ensure registry has entries */
    this._syncRegistry();

    var self  = this;
    var added = this.registry.map(function(l) { return l.code; });

    /* Table */
    el.innerHTML = this.registry.map(function(l) {
      var badges  = self._coverageBadges(l.code);
      var actions = l.code === 'en'
        ? '<span class="badge badge-gold">Source</span>'
        : '<button class="btn btn-xs btn-secondary" style="margin-right:4px" onclick="LangManager.retranslate(\'' + l.code + '\')">Fill Missing</button>'
          + '<button class="btn-icon danger" onclick="LangManager.removeLang(\'' + l.code + '\')" title="Remove">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
      return '<tr>'
        + '<td style="font-weight:700;color:var(--gold)">' + escHtml(l.flag) + '</td>'
        + '<td style="font-weight:600">' + escHtml(l.name) + '</td>'
        + '<td><span class="td-mono">' + escHtml(l.code) + '</span></td>'
        + '<td><span class="badge badge-gray">' + escHtml(l.locale) + '</span></td>'
        + '<td><span class="badge ' + (l.dir === 'rtl' ? 'badge-purple' : 'badge-green') + '">' + escHtml(l.dir) + '</span></td>'
        + '<td><div style="display:flex;gap:4px;flex-wrap:wrap">' + badges + '</div></td>'
        + '<td><div class="td-actions">' + actions + '</div></td>'
        + '</tr>';
    }).join('');

    /* Add-language dropdown — languages not yet active */
    var sel = document.getElementById('lang-add-select');
    if (sel) {
      sel.innerHTML = LANG_CATALOGUE
        .filter(function(l) { return added.indexOf(l.code) === -1; })
        .map(function(l) { return '<option value="' + l.code + '">' + l.flag + ' ' + escHtml(l.name) + ' (' + l.code + ')</option>'; })
        .join('');
      var sec = document.getElementById('lang-add-section');
      if (sec) sec.style.display = sel.options.length ? 'block' : 'none';
    }

    /* Resume notice */
    var resumes = this._getPendingResumes();
    var notice  = document.getElementById('lang-resume-notice');
    if (notice) {
      if (resumes.length) {
        notice.style.display = 'block';
        notice.innerHTML = resumes.map(function(code) {
          return '<span style="font-size:.8rem;color:var(--amber)">Interrupted: <strong>' + code + '</strong></span>'
            + ' <button class="btn btn-xs btn-primary" onclick="LangManager.resumeFrom(\'' + code + '\')">Resume</button>'
            + ' <button class="btn btn-xs btn-ghost" onclick="LangManager.clearCheckpoints(\'' + code + '\')">Discard</button>';
        }).join('<br>');
      } else {
        notice.style.display = 'none';
      }
    }
  },

  _coverageBadges: function(code) {
    var self   = this;
    var checks = [
      { label:'site lang', ok: !!State.siteLang[code] },
      { label:'shop ui',   ok: !!State.langUi[code] },
      { label:'products',  ok: !!State.langProducts[code] },
      { label:'content/',  ok: !!(State.sitePages[code] && Object.keys(State.sitePages[code]).length > 0) },
      { label:'slug-map',  ok: self._hasSlugMap(code) }
    ];
    return checks.map(function(c) {
      return '<span class="badge ' + (c.ok ? 'badge-green' : 'badge-red') + '">' + (c.ok ? 'OK' : '!') + ' ' + c.label + '</span>';
    }).join('');
  },

  _hasSlugMap: function(code) {
    var keys = Object.keys(this.slugMap);
    for (var i = 0; i < keys.length; i++) { if (this.slugMap[keys[i]][code]) return true; }
    return false;
  },

  _setStep: function(msg, pct) {
    /* Update both the in-page card and the status bar */
    var el = document.getElementById('lang-add-progress');
    pct = Math.min(100, Math.max(0, pct || 0));
    if (el) {
      el.style.display = 'block';
      el.innerHTML = '<div class="progress-bar" style="margin:0 0 6px"><div class="progress-fill green" style="width:' + pct + '%"></div></div>'
        + '<div style="font-size:.78rem;color:var(--text-2)">' + escHtml(msg) + '</div>';
    }
    lmShowBar(msg, pct, false);
    /* Log phase change to monitor */
    lmMonitorLog('PHASE', msg, pct + '%');
  },

  _getPendingResumes: function() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('lm_cp_') === 0 && k.indexOf('_meta') !== -1) {
          out.push(k.replace('lm_cp_', '').replace('_meta', ''));
        }
      }
    } catch(e) {}
    return out;
  },

  /* ── Add a new language ─────────────────────────────────────────── */
  addLang: async function(code) {
    if (!code) return toast('Select a language', 'warn');
    if (LANGS.indexOf(code) !== -1) return toast(code + ' already active', 'warn');
    if (!State.dir) return toast('Open your site folder first', 'warn');

    var meta = this._getMeta(code);
    var tl   = meta.tl || code;
    var btn  = document.getElementById('lang-add-btn');
    if (btn) btn.disabled = true;

    lmResetQuota();
    LM_PROGRESS.lang  = meta.name;
    LM_PROGRESS.total = lmCalcTotal();

    try {
      /* 1. Site lang */
      this._setStep('Translating site UI strings...', 10);
      var cpSite = lmLoadCheckpoint(code, 'site');
      State.siteLang[code] = await lmTranslateTree(State.siteLang.en || {}, tl, cpSite ? cpSite.data : null);
      await FS.write('lang/' + code + '/common.json', JSON.stringify(State.siteLang[code], null, 2));
      if (LM_QUOTA_HIT) { lmSaveCheckpoint(code, 'site', State.siteLang[code]); lmSaveCheckpoint(code, 'meta', meta); LM_RESUME_CB = function() { LangManager.addLang(code); }; if (btn) btn.disabled = false; return; }
      lmClearCheckpoint(code, 'site');

      /* 2. Shop UI */
      this._setStep('Translating shop UI strings...', 30);
      var cpUi = lmLoadCheckpoint(code, 'ui');
      State.langUi[code] = await lmTranslateTree(State.langUi.en || {}, tl, cpUi ? cpUi.data : null);
      await FS.write('lang/' + code + '/common.json', JSON.stringify(State.langUi[code], null, 2));
      if (LM_QUOTA_HIT) { lmSaveCheckpoint(code, 'ui', State.langUi[code]); lmSaveCheckpoint(code, 'meta', meta); LM_RESUME_CB = function() { LangManager.addLang(code); }; if (btn) btn.disabled = false; return; }
      lmClearCheckpoint(code, 'ui');

      /* 3. Products */
      this._setStep('Translating product strings...', 50);
      var cpProds = lmLoadCheckpoint(code, 'products');
      var prods   = cpProds ? cpProds.data : {};
      var pids    = Object.keys(State.langProducts.en || {});
      for (var pi = 0; pi < pids.length; pi++) {
        var pid = pids[pi];
        if (!prods[pid]) prods[pid] = {};
        var ep = State.langProducts.en[pid];
        if (!prods[pid].name        && ep.name)        prods[pid].name        = await lmTranslateText(ep.name, tl);
        if (!prods[pid].description && ep.description) prods[pid].description = await lmTranslateText(ep.description, tl);
        if (LM_QUOTA_HIT) { lmSaveCheckpoint(code, 'products', prods); lmSaveCheckpoint(code, 'meta', meta); LM_RESUME_CB = function() { LangManager.addLang(code); }; if (btn) btn.disabled = false; State.langProducts[code] = prods; await FS.write('lang/' + code + '/products.json', JSON.stringify(prods, null, 2)); return; }
      }
      State.langProducts[code] = prods;
      await FS.write('lang/' + code + '/products.json', JSON.stringify(prods, null, 2));
      lmClearCheckpoint(code, 'products');

      /* 4. URL slugs */
      this._setStep('Generating URL slugs...', 62);
      var slugs = await this._generateSlugs(code, tl);

      /* 5. URL folder tree */
      this._setStep('Building ' + code + '/ URL folders...', 72);
      await this._scaffoldUrlTree(code, slugs);

      /* 6. Content stubs */
      this._setStep('Creating content/' + code + '/ stubs...', 82);
      await this._scaffoldContent(code, tl);

      /* 7. languages.json */
      this._setStep('Updating languages.json...', 90);
      var alreadyIn = false;
      for (var ri = 0; ri < this.registry.length; ri++) { if (this.registry[ri].code === code) { alreadyIn = true; break; } }
      if (!alreadyIn) this.registry.push({ code: code, name: meta.name, flag: meta.flag, locale: meta.locale, urlPrefix: '/test/' + code + '/', dir: meta.dir });
      await FS.write('js/languages.json', JSON.stringify(this.registry, null, 2));

      /* 8. slug-map.js + config.js */
      this._setStep('Updating slug-map.js...', 95);
      await this._updateSlugMap(code, slugs);
      await this._updateConfigSlugs(code, slugs);

      /* Sync globals */
      if (LANGS.indexOf(code) === -1) LANGS.push(code);
      LANG_NAMES[code]   = meta.name;
      LANG_FLAGS[code]   = meta.flag;
      LANG_LOCALES[code] = meta.locale;

      lmClearCheckpoint(code, 'meta');
      this._setStep(meta.name + ' added! ' + Object.keys(slugs).length + ' pages created.', 100);
      setTimeout(lmHideBar, 4000);
      logActivity('Language Added', meta.name + ' (' + code + ')', 'green');
      toast(meta.name + ' added!', 'success');

    } catch(e) {
      toast('Error: ' + e.message, 'error');
      console.error(e);
    }

    if (btn) btn.disabled = false;
    this.render();
    Dashboard.render();
  },

  /* ── Scaffold helpers ─────────────────────────────────────────────── */

  _generateSlugs: async function(code, tl) {
    var seed = SLUG_SEED[code] || {};
    var slugs = {};
    var keys  = Object.keys(this.slugMap);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      slugs[key] = seed[key] || lmSlugify(await lmTranslateText(key.replace(/-/g, ' '), tl)) || key;
    }
    return slugs;
  },

  _scaffoldUrlTree: async function(code, slugs) {
    var enRoot   = await FS.read('en/index.html') || '';
    var enSample = await FS.read('en/files/index.html') || enRoot;

    function patch(html, lang, enKey, urlSlug) {
      html = html.replace(/(<html[^>]*\slang=")[^"]*(")/i, '$1' + lang + '$2');
      html = html.replace(/(window\.__PAGE_LANG__\s*=\s*)['"][^'"]*['"]\s*;/, "$1'" + lang + "';");
      html = html.replace(/(window\.__PAGE_SLUG__\s*=\s*)['"][^'"]*['"]\s*;/, "$1'" + enKey + "';");
      return html;
    }

    var rootSrc = enRoot || enSample || ('<html lang="' + code + '"><head><meta charset="UTF-8"></head><body data-lang="' + code + '"></body></html>');
    await FS.write(code + '/index.html', patch(rootSrc, code, '', ''));

    var keys = Object.keys(slugs);
    for (var i = 0; i < keys.length; i++) {
      var enKey = keys[i];
      var slug  = slugs[enKey];
      var src   = await FS.read('en/' + enKey + '/index.html') || enSample;
      await FS.write(code + '/' + slug + '/index.html', patch(src, code, enKey, slug));
    }
  },

  /* Translate an HTML string by extracting text nodes, translating, reassembling */
  _translateHtml: async function(html, tl) {
    /* Split on HTML tags — keep tags as-is, translate text chunks */
    var parts = html.split(/(<[^>]+>)/);
    var translated = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      /* Skip tags, comments, empty, whitespace-only, and things inside scripts/styles */
      if (!part || part.charAt(0) === '<' || !part.trim()) {
        translated.push(part);
        continue;
      }
      /* Skip if it's just whitespace + punctuation */
      if (!part.replace(/[\s&nbsp;.,;:!?\-–—''""()\/\\]/g, '').length) {
        translated.push(part);
        continue;
      }
      /* Translate the text chunk */
      var t = await lmTranslateText(part.trim(), tl);
      /* Preserve leading/trailing whitespace */
      var lead  = part.match(/^\s*/)[0];
      var trail = part.match(/\s*$/)[0];
      translated.push(lead + (t || part.trim()) + trail);
      if (LM_QUOTA_HIT) {
        /* Append remaining parts untranslated */
        for (var j = i + 1; j < parts.length; j++) translated.push(parts[j]);
        break;
      }
    }
    return translated.join('');
  },

  _scaffoldContent: async function(code, tl) {
    if (!State.sitePages[code]) State.sitePages[code] = {};
    var files = Object.keys(State.sitePages.en || {});
    var self  = this;
    for (var i = 0; i < files.length; i++) {
      var f       = files[i];
      var enHtml  = State.sitePages.en[f] || '';
      var result;
      if (LM_QUOTA_HIT) {
        /* Quota hit mid-way — save stub for remaining files */
        result = '<!-- ' + code.toUpperCase() + ' stub (quota reached) -->\n' + enHtml;
      } else {
        this._setStep('Translating content/' + code + '/' + f + '...', 82 + Math.round((i / files.length) * 12));
        result = await self._translateHtml(enHtml, tl);
      }
      State.sitePages[code][f] = result;
      await FS.write('content/' + code + '/' + f, result);
    }
  },

  _updateSlugMap: async function(code, slugs) {
    var keys = Object.keys(this.slugMap);
    for (var i = 0; i < keys.length; i++) { this.slugMap[keys[i]][code] = slugs[keys[i]] || keys[i]; }
    var lines = ['/* slug-map.js - managed by admin */', 'var SLUG_MAP = {'];
    var mapKeys = Object.keys(this.slugMap);
    for (var i = 0; i < mapKeys.length; i++) {
      var key = mapKeys[i], vals = this.slugMap[key];
      var pairs = Object.keys(vals).map(function(l) { return l + ':"' + vals[l] + '"'; }).join(', ');
      lines.push('  "' + key + '": { ' + pairs + ' }' + (i < mapKeys.length - 1 ? ',' : ''));
    }
    lines.push('};');
    lines.push('var SLUG_REVERSE={};Object.keys(SLUG_MAP).forEach(function(k){Object.keys(SLUG_MAP[k]).forEach(function(l){if(!SLUG_REVERSE[l])SLUG_REVERSE[l]={};SLUG_REVERSE[l][SLUG_MAP[k][l]]=k;});});');
    await FS.write('js/slug-map.js', lines.join('\n'));
  },

  _updateConfigSlugs: async function(code, slugs) {
    var raw = await FS.read('js/config.js');
    if (!raw) return;
    // Check if lang already present (any quote style)
    if (raw.indexOf("'" + code + "':") !== -1 || raw.indexOf('"' + code + '":') !== -1 || raw.indexOf(code + ':') !== -1) return;
    var lines = ["        '" + code + "': {"];
    Object.keys(slugs).forEach(function(k) {
      lines.push("            '" + k + "': '" + slugs[k] + "'");
    });
    lines.push("        },");
    var block = lines.join('\n');
    // Try multiple insertion points
    var inserted = false;
    var anchors = ['// --- NAVIGATION', '// -- NAVIGATION', 'navigation:', '// navigation'];
    for (var i = 0; i < anchors.length; i++) {
      if (raw.indexOf(anchors[i]) !== -1) {
        raw = raw.replace(anchors[i], block + '\n\n    ' + anchors[i]);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      // Fallback: no anchor found in config
      console.warn('Could not insert ' + code + ' slugs into config.js - add manually');
    }
    await FS.write('js/config.js', raw);
  },

  /* ── Remove a language ─────────────────────────────────────────── */
  removeLang: function(code) {
    if (code === 'en') return toast('Cannot remove English', 'warn');
    confirm('Remove ' + (LANG_NAMES[code] || code) + '?', 'Removes from registry. Files on disk are kept.',
      async function() {
        LangManager.registry = LangManager.registry.filter(function(l) { return l.code !== code; });
        await FS.write('js/languages.json', JSON.stringify(LangManager.registry, null, 2));
        LANGS = LANGS.filter(function(l) { return l !== code; });
        delete LANG_NAMES[code]; delete LANG_FLAGS[code]; delete LANG_LOCALES[code];
        delete State.langUi[code]; delete State.langProducts[code]; delete State.siteLang[code]; delete State.sitePages[code];
        logActivity('Language Removed', code, 'amber');
        toast(code + ' removed', 'success');
        LangManager.render(); Dashboard.render();
      }, true);
  },

  /* ── Fill missing strings for existing language ─────────────────── */
  retranslate: async function(code) {
    if (!State.dir) return toast('Open your site folder first', 'warn');
    var meta = this._getMeta(code), tl = meta.tl || code;
    lmResetQuota();
    LM_PROGRESS.lang  = LANG_NAMES[code] || code;
    LM_PROGRESS.total = lmCalcTotal();
    toast('Filling missing strings for ' + (LANG_NAMES[code] || code) + '...', 'info');
    State.siteLang[code]   = await lmFillMissing(State.siteLang.en || {},  State.siteLang[code] || {}, tl);
    State.langUi[code]     = await lmFillMissing(State.langUi.en || {},    State.langUi[code] || {},   tl);
    await FS.write('lang/' + code + '/common.json',              JSON.stringify(State.siteLang[code], null, 2));
    await FS.write('lang/' + code + '/common.json', JSON.stringify(State.langUi[code],   null, 2));
    var pids = Object.keys(State.langProducts.en || {});
    if (!State.langProducts[code]) State.langProducts[code] = {};
    for (var i = 0; i < pids.length; i++) {
      var pid = pids[i], ep = State.langProducts.en[pid];
      if (!State.langProducts[code][pid]) State.langProducts[code][pid] = {};
      if (!State.langProducts[code][pid].name        && ep.name)        State.langProducts[code][pid].name        = await lmTranslateText(ep.name, tl);
      if (!State.langProducts[code][pid].description && ep.description) State.langProducts[code][pid].description = await lmTranslateText(ep.description, tl);
    }
    await FS.write('lang/' + code + '/products.json', JSON.stringify(State.langProducts[code], null, 2));
    lmHideBar();
    toast('Done filling ' + (LANG_NAMES[code] || code), 'success');
    logActivity('Retranslated', code, 'blue');
    this.render();
  },

  /* ── Resume interrupted job ──────────────────────────────────────── */
  resumeFrom: function(code) {
    var cp = lmLoadCheckpoint(code, 'meta');
    if (!cp) return toast('No saved progress for ' + code, 'warn');
    toast('Resuming ' + code + '...', 'info');
    this.addLang(code);
  },

  clearCheckpoints: function(code) {
    ['site','ui','products','meta'].forEach(function(t) { lmClearCheckpoint(code, t); });
    toast('Cleared saved progress for ' + code, 'info');
    this.render();
  },

  /* ── Custom language form ────────────────────────────────────────── */
  showCustomForm: function() {
    var el = document.getElementById('lang-custom-section');
    if (el) el.style.display = 'block';
  },

  addCustomLang: async function() {
    var code   = ((document.getElementById('custom-code')   || {}).value || '').trim().toLowerCase();
    var name   = ((document.getElementById('custom-name')   || {}).value || '').trim();
    var flag   = ((document.getElementById('custom-flag')   || {}).value || '').trim() || code.toUpperCase();
    var locale = ((document.getElementById('custom-locale') || {}).value || '').trim() || code;
    var tl     = ((document.getElementById('custom-tl')     || {}).value || '').trim() || code;
    var dir    = ((document.getElementById('custom-dir')    || {}).value) || 'ltr';
    if (!code || !name)              return toast('Code and name required', 'error');
    if (LANGS.indexOf(code) !== -1)  return toast(code + ' already active', 'warn');
    if (!/^[a-z]{2,3}$/.test(code)) return toast('Code must be 2-3 letters', 'error');
    var exists = false;
    for (var i = 0; i < LANG_CATALOGUE.length; i++) { if (LANG_CATALOGUE[i].code === code) { exists = true; break; } }
    if (!exists) LANG_CATALOGUE.push({ code:code, name:name, flag:flag, locale:locale, tl:tl, dir:dir });
    var cs = document.getElementById('lang-custom-section');
    if (cs) cs.style.display = 'none';
    await this.addLang(code);
  }

};
