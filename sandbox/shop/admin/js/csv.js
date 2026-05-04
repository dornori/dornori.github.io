'use strict';

const CSV = {
  parseShipping(text) {
    const lines = text.split('\n');
    let section = null;
    const settings = {}, headers = [], countries = [];
    for (const raw of lines) {
      const l = raw.trim();
      if (!l || l.startsWith('#')) continue;
      if (l === '[settings]') { section = 'settings'; continue; }
      if (l === '[country_rates]') { section = 'countries'; continue; }
      const cells = l.split(',').map(c => c.trim());
      if (section === 'settings') {
        if (cells[0] === 'key') continue;
        settings[cells[0]] = { value: cells[1] || '', unit: cells[2] || '', notes: cells[3] || '' };
      } else if (section === 'countries') {
        if (cells[0] === 'country_code') { headers.push(...cells); continue; }
        if (!cells[0]) continue;
        const obj = {};
        headers.forEach((h, i) => obj[h] = cells[i] || '');
        countries.push(obj);
      }
    }
    return {
      settings, countries,
      headers: headers.length ? headers : ['country_code','country_name','zone','base_eur','per_kg_eur','free_threshold_override','estimated_days','notes']
    };
  },

  serializeShipping(data) {
    const lines = [
      '# WEBSHOP Shipping Configuration',
      '# Section 1: General settings',
      '# Section 2: Country-specific rates',
      '', '[settings]', 'key,value,unit,notes',
    ];
    for (const [k, v] of Object.entries(data.settings))
      lines.push(`${k},${v.value},${v.unit},${v.notes}`);
    lines.push('', '[country_rates]', '');
    lines.push(data.headers.join(','));
    for (const c of data.countries)
      lines.push(data.headers.map(h => c[h] || '').join(','));
    return lines.join('\n');
  },

  parseCurrencies(text) {
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(row => {
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
