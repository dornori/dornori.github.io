import { setTextContent } from '../utils/dom-safe.js';

const Shipping = (() => {
  function populateCountrySelect(selectEl, placeholderText) {
    if (!selectEl) return;
    placeholderText = placeholderText || 'Select country...';
    selectEl.innerHTML = '';
    
    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    setTextContent(placeholderOpt, placeholderText);
    selectEl.appendChild(placeholderOpt);
    
    const countries = [];
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      setTextContent(opt, c.name);
      selectEl.appendChild(opt);
    });
  }

  return {
    async init() {},
    populateCountrySelect
  };
})();

export default Shipping;