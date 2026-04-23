'use strict';

const ConfigParser = {
  parse(raw) {
    try {
      // Strip everything up to and including "const CONFIG ="
      // Uses greedy-to-first-match so leading comment blocks are consumed
      const stripped = raw.replace(/[\s\S]*?const\s+CONFIG\s*=\s*/, '').trim();
      // Strip trailing semicolon
      const inner = stripped.replace(/;\s*$/, '').trim();
      return Function('return (' + inner + ')')();
    } catch (e) {
      toast('Config parse error: ' + e.message, 'error');
      return null;
    }
  },

  serialize(cfg) {
    // Produce clean config.js preserving the standard header comment
    const header = `/* =========================================================
   WEBSHOP CONFIG — config.js (managed by Dornori Manager)
   ========================================================= */\n\n`;
    const body = 'const CONFIG = ' + JSON.stringify(cfg, null, 2)
      .replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g, '$1:') // unquote simple keys
    + ';\n';
    return header + body;
  },

  getPath(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  },

  setPath(obj, path, val) {
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts.slice(0, -1)) cur = (cur[p] ??= {});
    cur[parts.at(-1)] = val;
  }
};
