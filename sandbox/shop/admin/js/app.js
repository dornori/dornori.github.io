'use strict';

const App = {
  async loadAll() {
    try {
      // Products
      State.products = JSON.parse(await FS.read('data/products.json'));

      // Lang
      for (const lang of LANGS) {
        try { State.langUi[lang] = JSON.parse(await FS.read(`data/lang/ui/${lang}.json`)); } catch {}
        try { State.langProducts[lang] = JSON.parse(await FS.read(`data/lang/products/${lang}.json`)); } catch {}
      }

      // Currencies
      State.currencies = CSV.parseCurrencies(await FS.read('data/currencies.csv'));

      // Shipping
      State.shipping = CSV.parseShipping(await FS.read('data/shipping.csv'));

      // Config — load from js/config.js
      State.configRaw = await FS.read('js/config.js');
      State.config = ConfigParser.parse(State.configRaw);

      // Render all
      Dashboard.render();
      Products.render();
      Translations.render();
      Currencies.render();
      Shipping.render();
      ConfigEditor.render();
      FileManager.renderTree();

      markClean();
      toast('Shop data loaded', 'success');
    } catch (e) {
      toast('Load error: ' + e.message, 'error');
      console.error(e);
    }
  },

  async save() {
    if (!State.dir) return toast('No folder connected', 'error');
    try {
      await FS.write('data/products.json', JSON.stringify(State.products, null, 2));

      for (const lang of LANGS) {
        if (State.langUi[lang])
          await FS.write(`data/lang/ui/${lang}.json`, JSON.stringify(State.langUi[lang], null, 2));
        if (State.langProducts[lang])
          await FS.write(`data/lang/products/${lang}.json`, JSON.stringify(State.langProducts[lang], null, 2));
      }

      await FS.write('data/currencies.csv', CSV.serializeCurrencies(State.currencies));
      await FS.write('data/shipping.csv', CSV.serializeShipping(State.shipping));

      if (State.config)
        await FS.write('js/config.js', ConfigParser.serialize(State.config));

      markClean();
      toast('All files saved ✓', 'success');
    } catch (e) {
      toast('Save error: ' + e.message, 'error');
    }
  },

  nav(el) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    const view = el.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
  },

  toggleTheme() {
    const h = document.documentElement;
    h.dataset.theme = h.dataset.theme === 'dark' ? 'light' : 'dark';
  }
};
