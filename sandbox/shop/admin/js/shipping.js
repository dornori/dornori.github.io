'use strict';

const Shipping = {
  render() {
    document.getElementById('shipping-settings').innerHTML = Object.entries(State.shipping.settings).map(([k, v]) => `
      <div class="form-group">
        <label>${k.replace(/_/g,' ')} <span class="label-hint">(${escHtml(v.unit)})</span></label>
        <input type="text" value="${escHtml(v.value)}" oninput="Shipping.updateSetting('${k}',this.value)">
        ${v.notes ? `<div class="form-hint">${escHtml(v.notes)}</div>` : ''}
      </div>`).join('');

    const headers = State.shipping.headers;
    document.getElementById('shipping-tbody').innerHTML = State.shipping.countries.map((c, i) => `
      <tr>
        ${headers.map(h => `<td><input class="cell-input" value="${escHtml(c[h]||'')}" oninput="Shipping.updateCountry(${i},'${h}',this.value)" style="width:${h==='country_name'?'120px':h==='notes'?'160px':'70px'}"></td>`).join('')}
        <td><button class="btn-icon" style="color:var(--red)" onclick="Shipping.removeCountry(${i})">✕</button></td>
      </tr>`).join('');
  },

  updateSetting(key, val) {
    State.shipping.settings[key].value = val;
    markDirty('data/shipping.csv');
  },

  updateCountry(i, key, val) {
    State.shipping.countries[i][key] = val;
    markDirty('data/shipping.csv');
  },

  removeCountry(i) {
    State.shipping.countries.splice(i, 1);
    markDirty('data/shipping.csv');
    this.render();
  },

  addCountry() {
    const empty = {};
    State.shipping.headers.forEach(h => empty[h] = '');
    State.shipping.countries.push(empty);
    markDirty('data/shipping.csv');
    this.render();
    // Scroll table to bottom
    setTimeout(() => {
      const tbody = document.getElementById('shipping-tbody');
      tbody?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
};
