/* =========================================================
   WEBSHOP — Payment Module  (js/modules/payment.js)
   =========================================================
   Reads:  CONFIG.payment
   Emits:  CustomEvent "payment:success" { orderRef, processor, details }
           CustomEvent "payment:cancel"  { orderRef, processor }
           CustomEvent "payment:error"   { orderRef, processor, error }

   Usage:
     await Payment.init();
     Payment.render(cart, totals, orderRef, "#payment-mount");

   Switch processor at runtime:
     Payment.switchProcessor("stripe");
   ========================================================= */

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
      if (existing) existing.remove(); // remove failed/stale tag so we can retry
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
    return window.location.origin + path;
  }

  /* ── PayPal adapter ──────────────────────────────────── */
  const _paypal = {
    async init() {
      const { clientId, currency, intent } = CONFIG.payment.paypal;
      await _loadScript(
        `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=${intent || "capture"}`
      );
    },
    async render(cart, totals, orderRef, el) {
      if (!window.paypal) {
        el.innerHTML = `<div style="padding:20px;text-align:center;border:1px dashed var(--c-border);border-radius:var(--radius);color:var(--c-text-3);font-size:0.85rem;line-height:1.6;">
          <strong style="display:block;margin-bottom:6px;">PayPal not loaded</strong>
          Set a valid <code>CONFIG.payment.paypal.clientId</code> in <code>js/config.js</code>.<br>
          Use your <a href="https://developer.paypal.com/dashboard/" target="_blank" style="color:var(--c-accent);">PayPal Developer</a> sandbox or live client ID.
        </div>`;
        return;
      }
      el.innerHTML = "";
      const cfg = CONFIG.payment.paypal;
      await window.paypal.Buttons({
        style: { layout: "vertical", color: "black", shape: "rect", label: "pay", height: 48 },
        createOrder: (data, actions) => actions.order.create({
          purchase_units: [{
            reference_id: orderRef,
            description:  `${CONFIG.shopName} – ${orderRef}`,
            amount: {
              currency_code: cfg.currency,
              value:         totals.total.toFixed(2),
              breakdown: {
                item_total: { currency_code: cfg.currency, value: totals.subtotal.toFixed(2) },
                shipping:   { currency_code: cfg.currency, value: totals.shipping.toFixed(2) },
                tax_total:  { currency_code: cfg.currency, value: totals.tax.toFixed(2) },
              },
            },
            items: cart.map(i => ({
              name:        i.name + (i.selectedColor ? ` (${i.selectedColor})` : ""),
              unit_amount: { currency_code: cfg.currency, value: i.price.toFixed(2) },
              quantity:    String(i.qty),
            })),
          }],
          application_context: {
            return_url: _resolveUrl(cfg.returnPath),
            cancel_url: _resolveUrl(cfg.cancelPath),
          },
        }),
        onApprove:  async (data, actions) => {
          const d = await actions.order.capture();
          _dispatch("payment:success", { orderRef, processor: "paypal", details: d });
        },
        onCancel:   ()    => _dispatch("payment:cancel",  { orderRef, processor: "paypal" }),
        onError:    err   => {
          console.error("[Payment/PayPal]", err);
          _dispatch("payment:error", { orderRef, processor: "paypal", error: err });
        },
      }).render(el);
    },
  };

  /* ── Stripe adapter ──────────────────────────────────── */
  const _stripe = {
    _instance: null,
    _elements: null,
    async init() {
      await _loadScript("https://js.stripe.com/v3/");
      this._instance = window.Stripe(CONFIG.payment.stripe.publishableKey);
    },
    async render(cart, totals, orderRef, el) {
      if (!this._instance) throw new Error("[Payment/Stripe] Not initialized");
      const cfg = CONFIG.payment.stripe;

      if (!cfg.intentEndpoint) {
        el.innerHTML = `<div style="padding:20px;text-align:center;color:var(--c-text-3);font-size:0.85rem;border:1px dashed var(--c-border);border-radius:var(--radius);">
          Stripe Payment Element<br><small>Set <code>CONFIG.payment.stripe.intentEndpoint</code> to enable.</small>
        </div>`;
        return;
      }

      let clientSecret;
      try {
        const res = await fetch(cfg.intentEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(totals.total * 100),
            currency: cfg.currency,
            metadata: { orderRef },
          }),
        });
        ({ clientSecret } = await res.json());
      } catch (e) {
        console.error("[Payment/Stripe] PaymentIntent failed:", e);
        _dispatch("payment:error", { orderRef, processor: "stripe", error: e });
        return;
      }

      this._elements = this._instance.elements({ clientSecret, appearance: cfg.appearance });
      el.innerHTML   = `
        <div id="stripe-pe" style="margin-bottom:14px;"></div>
        <button class="webshop-btn webshop-btn--primary webshop-btn--full" id="stripe-pay">Pay Now</button>
        <p id="stripe-err" style="color:#c0392b;font-size:0.82rem;margin-top:8px;display:none;"></p>`;
      this._elements.create("payment").mount("#stripe-pe");

      const btn = el.querySelector("#stripe-pay");
      const err = el.querySelector("#stripe-err");
      btn.addEventListener("click", async () => {
        btn.disabled = true; btn.textContent = "Processing…"; err.style.display = "none";
        const { error } = await this._instance.confirmPayment({
          elements: this._elements,
          confirmParams: { return_url: _resolveUrl(cfg.returnPath) + "?ref=" + orderRef },
        });
        if (error) {
          err.textContent = error.message; err.style.display = "block";
          btn.disabled = false; btn.textContent = "Pay Now";
          _dispatch("payment:error", { orderRef, processor: "stripe", error });
        }
        // success: Stripe redirects to returnUrl
      });
    },
  };

  /* ── No-op adapter ───────────────────────────────────── */
  const _none = {
    async init()               {},
    async render(c, t, o, el) { el.innerHTML = ""; },
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
      // Don't mark ready — allow retry. Propagate so renderPayment can show fallback.
      throw e;
    }
  }

  async function render(cart, totals, orderRef, mountEl) {
    if (!_ready) await init();
    const el = typeof mountEl === "string" ? document.querySelector(mountEl) : mountEl;
    if (!el) return;
    await _adapters[CONFIG.payment.activeProcessor || "none"].render(cart, totals, orderRef, el);
  }

  async function switchProcessor(name) {
    if (!_adapters[name]) return;
    _ready = false;
    CONFIG.payment.activeProcessor = name;
    await init();
  }

  return { init, render, switchProcessor, getActive: () => CONFIG.payment.activeProcessor, adapters: _adapters };
})();
