const Payment = (() => {
  let _ready = false;

  function _dispatch(event, detail) {
    document.dispatchEvent(new CustomEvent(event, { detail }));
  }

  function _loadScript(src, attrs = {}) {
    return new Promise((resolve, reject) => {
      const baseSrc = src.split("?")[0];
      const existing = document.querySelector(`script[src*="${baseSrc}"]`);
      if (existing && existing._loadSuccess) { resolve(); return; }
      if (existing) existing.remove();
      const s = Object.assign(document.createElement("script"), {
        src,
        onload:  () => { s._loadSuccess = true; resolve(); },
        onerror: () => reject(new Error("Script load failed: " + src)),
      });
      Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
      document.head.appendChild(s);
    });
  }

  function _resolveUrl(path) {
    const base = (window.__BASE_PATH__ && window.__BASE_PATH__ !== '/') ? window.__BASE_PATH__ : '';
    const resolved = (base && !path.startsWith(base)) ? base + path.replace(/^\//, '') : path;
    return window.location.origin + resolved;
  }

  const _paypal = {
    _loadedCurrency: null,
    async init(forceCurrency) {
      const { clientId, intent } = CONFIG.payment.paypal;
      if (!clientId) return;
      const targetCurrency = forceCurrency ||
        ((typeof Currency !== 'undefined' && Currency.getActive) ? Currency.getActive() : CONFIG.payment.paypal.currency);
      if (window.paypal && this._loadedCurrency === targetCurrency) return;
      document.querySelectorAll('script[src*="paypal.com/sdk/js"]').forEach(s => s.remove());
      delete window.paypal;
      await _loadScript(
        `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${targetCurrency}&intent=${intent || "capture"}`
      );
      this._loadedCurrency = targetCurrency;
    },
    async render(cart, totals, orderRef, el, formData) {
      const activeCurrency = (typeof Currency !== 'undefined' && Currency.getActive)
        ? Currency.getActive()
        : CONFIG.payment.paypal.currency;

      if (!window.paypal || this._loadedCurrency !== activeCurrency) {
        await this.init(activeCurrency);
      }

      if (!window.paypal) {
        el.innerHTML = `<div style="padding:20px;text-align:center;border:1px dashed var(--c-border);color:var(--c-text-3);font-size:0.85rem;">PayPal not loaded</div>`;
        return;
      }

      el.innerHTML = "";
      const cfg = CONFIG.payment.paypal;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'max-width:480px;margin:0 auto;background:var(--c-surface);padding:24px;border-radius:var(--radius,8px);border:1px solid var(--c-border);';
      el.appendChild(wrapper);

      await window.paypal.Buttons({
        style: { layout: "vertical", color: "black", shape: "rect", label: "pay", height: 48 },
        createOrder: async (data, actions) => {
          try {
            // Call Worker to create order (validates prices server-side)
            const workerRes = await fetch('https://pay.dornori-info.workers.dev/api/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: cart,
                countryCode: formData?.country || 'US',
                currency: activeCurrency,
                formData: formData
              })
            });
            
            if (!workerRes.ok) {
              const err = await workerRes.json();
              throw new Error(err.error || 'Order creation failed');
            }

            const result = await workerRes.json();
            
            // Store order snapshot for success page
            localStorage.setItem('webshop_order_ref', result.orderRef);
            localStorage.setItem('webshop_paypal_order_id', result.orderId);
            localStorage.setItem('webshop_order_snapshot', JSON.stringify({
              items: cart,
              formData: formData,
              totals: result.totals
            }));

            return result.orderId;
          } catch (err) {
            console.error('Order creation error:', err);
            throw err;
          }
        },
        onApprove: async (data, actions) => {
          try {
            // Capture via Worker
            const captureRes = await fetch('https://pay.dornori-info.workers.dev/api/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderID })
            });

            if (!captureRes.ok) {
              const err = await captureRes.json();
              throw new Error(err.error || 'Capture failed');
            }

            const captureResult = await captureRes.json();
            
            // Store PayPal result for success page
            localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult.paypalData));
            
            const orderRef = localStorage.getItem('webshop_order_ref');
            window.location.href = `/en/success/?ref=${orderRef}&status=success`;
          } catch (err) {
            console.error('Capture error:', err);
            _dispatch("payment:error", { orderRef, processor: "paypal", error: err });
          }
        },
        onCancel: () => {
          localStorage.removeItem('webshop_order_ref');
          localStorage.removeItem('webshop_paypal_order_id');
          localStorage.removeItem('webshop_order_snapshot');
          _dispatch("payment:cancel", { orderRef, processor: "paypal" });
        },
        onError: err => {
          console.error("[Payment/PayPal]", err);
          _dispatch("payment:error", { orderRef, processor: "paypal", error: err });
        },
      }).render(wrapper);
    },
  };

  const _stripe = {
    _instance: null,
    _elements: null,
    async init() {
      await _loadScript("https://js.stripe.com/v3/");
      this._instance = window.Stripe(CONFIG.payment.stripe.publishableKey);
    },
    async render(cart, totals, orderRef, el, formData) {
      if (!this._instance) throw new Error("[Payment/Stripe] Not initialized");
      el.innerHTML = `<div style="padding:20px;text-align:center;color:var(--c-text-3);font-size:0.85rem;">Stripe not yet integrated with Worker</div>`;
    },
  };

  const _none = {
    async init() {},
    async render(c, t, o, el, f) { el.innerHTML = ""; },
  };

  const _adapters = { paypal: _paypal, stripe: _stripe, none: _none };

  async function init() {
    if (_ready) return;
    const name = CONFIG.payment.activeProcessor || "none";
    if (!_adapters[name]) { console.warn("[Payment] Unknown processor:", name); return; }
    try {
      await _adapters[name].init();
      _ready = true;
    } catch (e) {
      throw e;
    }
  }

  async function render(cart, totals, orderRef, mountEl, formData) {
    if (!_ready) await init();
    const el = typeof mountEl === "string" ? document.querySelector(mountEl) : mountEl;
    if (!el) return;
    await _adapters[CONFIG.payment.activeProcessor || "none"].render(cart, totals, orderRef, el, formData);
  }

  async function switchProcessor(name) {
    if (!_adapters[name]) return;
    _ready = false;
    if (_stripe._instance) {
      _stripe._instance = null;
      _stripe._elements = null;
    }
    CONFIG.payment.activeProcessor = name;
    await init();
  }

  return { init, render, switchProcessor, getActive: () => CONFIG.payment.activeProcessor, adapters: _adapters };
})();
