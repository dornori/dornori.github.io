import { loadScript } from '../utils/script-loader.js';
import { createFromHTML } from '../utils/dom-safe.js';

const Payment = (() => {
  let _ready = false;

  const _paypal = {
    async init() {
      const { clientId, currency } = CONFIG.payment.paypal;
      await loadScript(`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`);
    },
    async render(el) {
      if (!window.paypal) {
        el.innerHTML = '';
        const err = createFromHTML('<div>PayPal not loaded</div>');
        el.appendChild(err);
        return;
      }
    }
  };

  const _stripe = {
    _instance: null,
    async init() {
      await loadScript("https://js.stripe.com/v3/");
      this._instance = window.Stripe(CONFIG.payment.stripe.publishableKey);
    },
    async render(el) {
      if (!this._instance) throw new Error("Stripe not initialized");
    }
  };

  return {
    async init() {
      const proc = CONFIG.payment.activeProcessor;
      if (proc === "paypal") await _paypal.init();
      if (proc === "stripe") await _stripe.init();
      _ready = true;
    },
    async render(cart, totals, orderRef, selector) {
      const el = document.querySelector(selector);
      const proc = CONFIG.payment.activeProcessor;
      if (proc === "paypal") await _paypal.render(el);
      if (proc === "stripe") await _stripe.render(el);
    }
  };
})();

export default Payment;