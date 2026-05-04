'use strict';

const Currencies = {
  render() { this._table(); },

  _table() {
    const cols = ['code','symbol','name','rate_to_eur','buffer','decimals','locale'];
    document.getElementById('currencies-tbody').innerHTML = State.currencies.map((row, i) => {
      const rate = parseFloat(row.rate_to_eur)||1, buf = parseFloat(row.buffer)||0, dec = parseInt(row.decimals)||2;
      const preview = (100*(rate+buf)).toFixed(dec) + ' ' + (row.symbol||'');
      return `<tr>
        ${cols.map(h => `<td><input class="cell-input" value="${escHtml(row[h]||'')}" oninput="Currencies.update(${i},'${h}',this.value)" style="width:${h==='name'?'130px':h==='locale'?'80px':'70px'}"></td>`).join('')}
        <td style="color:var(--text-3);font-size:.75rem;white-space:nowrap">${escHtml(preview)}</td>
        <td><button class="btn-icon" style="color:var(--red)" onclick="Currencies.remove(${i})">✕</button></td>
      </tr>`;
    }).join('');
  },

  update(i, key, val) {
    State.currencies[i][key] = val;
    markDirty('data/currencies.csv');
    // Live preview update
    const rows = document.querySelectorAll('#currencies-tbody tr');
    if (rows[i]) {
      const r = State.currencies[i];
      const rate = parseFloat(r.rate_to_eur)||1, buf = parseFloat(r.buffer)||0, dec = parseInt(r.decimals)||2;
      rows[i].cells[7].textContent = (100*(rate+buf)).toFixed(dec) + ' ' + (r.symbol||'');
    }
  },

  remove(i) {
    State.currencies.splice(i, 1);
    markDirty('data/currencies.csv');
    this._table();
  },

  addRow() {
    State.currencies.push({ code:'NEW', symbol:'?', name:'New Currency', rate_to_eur:'1.0', buffer:'0', decimals:'2', locale:'en-US' });
    markDirty('data/currencies.csv');
    this._table();
  }
};
