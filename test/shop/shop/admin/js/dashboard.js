'use strict';

const Dashboard = {
  render() {
    const p = State.products;
    const totalStock = p.reduce((s, x) => s + (x.stock || 0), 0);
    const stockValue = p.reduce((s, x) => s + (x.price || 0) * (x.stock || 0), 0);
    const lowStock = p.filter(x => (x.stock || 0) > 0 && (x.stock || 0) <= 5).length;
    const outOfStock = p.filter(x => (x.stock || 0) === 0).length;

    const stats = [
      { label: 'Products', value: p.length },
      { label: 'Stock Units', value: totalStock, sub: `€${stockValue.toLocaleString()} est. value` },
      { label: 'Low Stock', value: lowStock, sub: '≤ 5 units' },
      { label: 'Out of Stock', value: outOfStock, sub: 'need restocking' },
      { label: 'Languages', value: LANGS.length, sub: LANGS.join(', ') },
      { label: 'Currencies', value: State.currencies.length, sub: 'configured' },
    ];

    document.getElementById('dash-stats').innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
        ${s.sub ? `<div class="stat-sub">${s.sub}</div>` : ''}
      </div>`).join('');
  }
};
