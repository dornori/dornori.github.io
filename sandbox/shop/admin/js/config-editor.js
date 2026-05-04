'use strict';

const ConfigEditor = {
  // Each entry: { section } for headers, or { path, label, type, hint }
  fields: [
    { section: 'Shop Identity' },
    { path: 'shopName',       label: 'Shop Name',         type: 'text',     hint: 'Shown in page title and email subjects' },
    { path: 'tagline',        label: 'Tagline',           type: 'text',     hint: 'Subtitle shown on the shop homepage' },
    { path: 'baseCurrency',   label: 'Base Currency',     type: 'text',     hint: 'Internal currency code — all product prices use this (e.g. EUR)' },
    { path: 'defaultLanguage',label: 'Default Language',  type: 'text',     hint: 'Fallback language code: en, de, nl, no' },

    { section: 'Tax & VAT' },
    { path: 'taxRate',           label: 'Tax Rate',        type: 'number',   hint: 'Decimal rate — e.g. 0.25 = 25% VAT' },
    { path: 'taxLabel',          label: 'Tax Label',       type: 'text',     hint: 'Displayed in cart totals e.g. "VAT (25%)"' },
    { path: 'businessVatExempt', label: 'B2B VAT Exempt',  type: 'checkbox', hint: 'Shows a business/VAT-exempt checkbox at checkout' },

    { section: 'Feature Flags' },
    { path: 'features.showLanguageSwitcher', label: 'Show Language Switcher', type: 'checkbox', hint: 'Show EN/NO/NL/DE toggle buttons in the shop header' },
    { path: 'features.showCurrencySelector', label: 'Show Currency Selector', type: 'checkbox', hint: 'Show currency dropdown in the shop header' },

    { section: 'Payment' },
    { path: 'payment.activeProcessor',       label: 'Active Processor',       type: 'text', hint: 'paypal | stripe | none' },
    { path: 'payment.paypal.clientId',       label: 'PayPal Client ID',       type: 'text', hint: 'Your PayPal REST API client ID (live or sandbox)' },
    { path: 'payment.paypal.currency',       label: 'PayPal Currency',        type: 'text', hint: 'Must match your PayPal account currency (e.g. EUR)' },
    { path: 'payment.stripe.publishableKey', label: 'Stripe Publishable Key', type: 'text', hint: 'pk_live_… or pk_test_… from your Stripe dashboard' },
    { path: 'payment.stripe.intentEndpoint', label: 'Stripe Intent Endpoint', type: 'text', hint: 'Your server endpoint returning { clientSecret }. Leave empty if unused.' },
    { path: 'payment.stripe.currency',       label: 'Stripe Currency',        type: 'text', hint: 'Lowercase currency code for Stripe (e.g. eur)' },

    { section: 'Order Emails — Formspree' },
    { path: 'formspree.id',       label: 'Form ID',   type: 'text', hint: 'The 8-character ID from your Formspree form URL' },
    { path: 'formspree.endpoint', label: 'Endpoint',  type: 'text', hint: 'Full URL: https://formspree.io/f/xxxxxxxx' },

    { section: 'Bot Protection — Cloudflare Turnstile' },
    { path: 'turnstile.sitekey', label: 'Turnstile Sitekey', type: 'text', hint: 'Get from dash.cloudflare.com → Turnstile. Leave empty to disable.' },

    { section: 'Images' },
    { path: 'images.imageDir', label: 'Image Directory', type: 'text', hint: 'Path prefix for auto-constructed variant image filenames' },
    { path: 'images.imageExt', label: 'Image Extension', type: 'text', hint: 'File extension: webp, jpg, or png' },

    { section: 'Shipping Fallbacks' },
    { path: 'shipping.freeThreshold', label: 'Free Threshold (EUR)', type: 'number', hint: 'Used if shipping.csv cannot be fetched' },
    { path: 'shipping.base',          label: 'Base Rate (EUR)',       type: 'number', hint: 'Fallback flat shipping rate' },
    { path: 'shipping.perKg',         label: 'Per kg Rate (EUR)',     type: 'number', hint: 'Fallback per-kilogram rate' },
    { path: 'shipping.maxFreeWeight', label: 'Max Free Weight (kg)',  type: 'number', hint: 'Orders heavier than this still pay shipping even above threshold' },

    { section: 'Storage Keys' },
    { path: 'storageKeys.parentLangKey',  label: 'Parent Lang Key',  type: 'text', hint: 'localStorage key your parent site writes the language to' },
    { path: 'storageKeys.shopLangKey',    label: 'Shop Lang Key',    type: 'text', hint: 'localStorage key the shop reads/writes for its own language preference' },
    { path: 'storageKeys.currencyKey',    label: 'Currency Key',     type: 'text', hint: 'localStorage key for persisted currency selection' },
    { path: 'storageKeys.cartKey',        label: 'Cart Key',         type: 'text', hint: 'localStorage key for cart data' },
  ],

  render() {
    if (!State.config) {
      document.getElementById('config-body').innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-3)">Config not loaded — connect your shop folder first.</div>`;
      return;
    }

    let html = '<div style="display:flex;flex-direction:column;gap:0">';
    let inSection = false;

    for (const f of this.fields) {
      if (f.section) {
        if (inSection) html += '</div></div>';
        html += `<div class="card" style="margin-bottom:12px"><div class="config-section-title">${escHtml(f.section)}</div><div class="form-grid">`;
        inSection = true;
        continue;
      }

      const val = ConfigParser.getPath(State.config, f.path);
      const id  = 'cfg-' + f.path.replace(/\./g, '-');

      if (f.type === 'checkbox') {
        html += `<div class="form-group" style="justify-content:flex-end;padding-bottom:2px">
          <label class="form-check">
            <input type="checkbox" id="${id}" ${val ? 'checked' : ''} onchange="ConfigEditor.update('${f.path}',this.checked)">
            ${escHtml(f.label)}
          </label>
          ${f.hint ? `<div class="form-hint">${escHtml(f.hint)}</div>` : ''}
        </div>`;
      } else {
        html += `<div class="form-group">
          <label>${escHtml(f.label)}</label>
          <input type="${f.type}" id="${id}" value="${escHtml(String(val ?? ''))}" ${f.type === 'number' ? 'step="any"' : ''}
            oninput="ConfigEditor.update('${f.path}',${f.type === 'number' ? '+this.value' : 'this.value'})">
          ${f.hint ? `<div class="form-hint">${escHtml(f.hint)}</div>` : ''}
        </div>`;
      }
    }

    if (inSection) html += '</div></div>';
    html += '</div>';
    document.getElementById('config-body').innerHTML = html;
  },

  update(path, val) {
    ConfigParser.setPath(State.config, path, val);
    markDirty('js/config.js');
  }
};
