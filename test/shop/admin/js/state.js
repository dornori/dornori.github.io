'use strict';

const State = {
  dir: null,
  products: [],
  langUi: {},
  langProducts: {},
  currencies: [],
  shipping: { settings: {}, countries: [], headers: [] },
  config: null,
  configRaw: '',
  dirty: new Set(),
  editingProduct: null,
};

const LANGS = ['en', 'de', 'nl', 'no'];
const LANG_NAMES = { en: 'English', de: 'German', nl: 'Dutch', no: 'Norwegian' };
