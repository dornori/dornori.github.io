/* =========================================================
   WEBSHOP — Payment Module  (js/modules/payment.js)
   =========================================================
   Reads:  CONFIG.payment, CONFIG.shopName
           Customer formData (from cart.html step 2)
           Cart data with product details
           Shipping data (from Shipping module)
   
   Emits:  CustomEvent "payment:success" { orderRef, processor, details }
           CustomEvent "payment:cancel"  { orderRef, processor }
           CustomEvent "payment:error"   { orderRef, processor, error }

   Usage:
     await Payment.init();
     Payment.render(cart, totals, orderRef, "#payment-mount", formData);

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

  /* ── PayPal adapter ──────────────────────────────────── */
  const _paypal = {
    _loadedCurrency: null,
    async init(forceCurrency) {
      const { clientId, intent } = CONFIG.payment.paypal;
      if (!clientId) {
        return;
      }
      const targetCurrency = forceCurrency ||
        ((typeof Currency !== 'undefined' && Currency.getActive) ? Currency.getActive() : CONFIG.payment.paypal.currency);
      if (window.paypal && this._loadedCurrency === targetCurrency) return;
      // The SDK's order-create currency must match whatever it was loaded with —
      // if the shopper switched currencies since the last load, tear down and reload.
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
        el.innerHTML = `<div style="padding:20px;text-align:center;border:1px dashed var(--c-border);border-radius:var(--radius);color:var(--c-text-3);font-size:0.85rem;line-height:1.6;">
          <strong style="display:block;margin-bottom:6px;">PayPal not loaded</strong>
          Set a valid <code>CONFIG.payment.paypal.clientId</code> in <code>js/config.js</code>.<br>
          Use your <a href="https://developer.paypal.com/dashboard/" target="_blank" style="color:var(--c-accent);">PayPal Developer</a> sandbox or live client ID.
        </div>`;
        return;
      }
      
      el.innerHTML = "";
      const cfg = CONFIG.payment.paypal;

      // Wrap payment mount in styled container
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'max-width:480px;margin:0 auto;background:var(--c-surface);padding:24px;border-radius:var(--radius,8px);border:1px solid var(--c-border);';
      el.appendChild(wrapper);

      // Round each line item first, then sum the *rounded* lines for item_total.
      // PayPal requires item_total to exactly equal Σ(unit_amount × quantity) in cents —
      // deriving it from a separately-rounded cart subtotal can be a cent off and the
      // whole order (including all item/shipping/address detail) gets rejected.
      const itemLines = cart.map(i => {
        const unit = Math.round((i.price + Number.EPSILON) * 100) / 100;
        return {
          name: i.name + (i.selectedColor ? ` (${i.selectedColor})` : ""),
          unit_amount: { currency_code: activeCurrency, value: unit.toFixed(2) },
          quantity: String(i.qty),
          sku: i.sku || i.id || "",
          description: i.description || "",
          _lineTotal: unit * i.qty,
        };
      });
      const itemTotalValue = itemLines.reduce((a, l) => a + l._lineTotal, 0);
      const shippingValue  = Math.round((totals.shipping + Number.EPSILON) * 100) / 100;
      const taxValue       = Math.round((totals.tax + Number.EPSILON) * 100) / 100;
      const grandTotal     = Math.round((itemTotalValue + shippingValue + taxValue + Number.EPSILON) * 100) / 100;

      // Build purchase units with individual item details
      const purchaseUnits = [{
        reference_id: orderRef,
        description: `${CONFIG.shopName} – ${orderRef}`,
        amount: {
          currency_code: activeCurrency,
          value: grandTotal.toFixed(2),
          breakdown: {
            item_total: { currency_code: activeCurrency, value: itemTotalValue.toFixed(2) },
            shipping: { currency_code: activeCurrency, value: shippingValue.toFixed(2) },
            tax_total: { currency_code: activeCurrency, value: taxValue.toFixed(2) },
          },
        },
        items: itemLines.map(({ _lineTotal, ...line }) => line),
        // Include shipping address from customer details
        shipping: formData ? {
          name: {
            full_name: `${formData.first_name} ${formData.last_name}`.trim(),
          },
          address: {
            address_line_1: formData.address || "",
            address_line_2: "",
            admin_area_2: formData.city || "",
            admin_area_1: "",
            postal_code: formData.postal || "",
            country_code: formData.country || "US",
          },
        } : undefined,
      }];

      // Include payer info from customer details
      const billingIsDifferent = formData && formData.billingChoice === "different";
      const billingSrc = billingIsDifferent ? {
        address: formData.billing_address, city: formData.billing_city,
        postal: formData.billing_postal, country: formData.billing_country,
      } : formData;
      const payerInfo = formData ? {
        email_address: formData.email,
        name: {
          given_name: formData.first_name || "",
          surname: formData.last_name || "",
        },
        phone: formData.phone ? {
          phone_number: {
            national_number: formData.phone.replace(/\D/g, ""),
          },
        } : undefined,
        address: billingSrc && billingSrc.address ? {
          address_line_1: billingSrc.address || "",
          admin_area_2: billingSrc.city || "",
          postal_code: billingSrc.postal || "",
          country_code: billingSrc.country || "US",
        } : undefined,
      } : undefined;

      await window.paypal.Buttons({
        style: { layout: "vertical", color: "black", shape: "rect", label: "pay", height: 48 },
        createOrder: (data, actions) => actions.order.create({
          purchase_units: purchaseUnits,
          payer: payerInfo,
          application_context: {
            brand_name: CONFIG.shopName || undefined,
            return_url: _resolveUrl(cfg.returnPath),
            cancel_url: _resolveUrl(cfg.cancelPath),
            // Without this, PayPal defaults to GET_FROM_FILE and silently ignores the
            // shipping address / items / payer data we built above, falling back to
            // whatever is on the buyer's PayPal account (only their account name shows up).
            shipping_preference: formData && formData.address ? "SET_PROVIDED_ADDRESS" : "GET_FROM_FILE",
            user_action: "PAY_NOW",
          },
        }),
        onApprove: async (data, actions) => {
          const d = await actions.order.capture();
          // Store PayPal orderID in localStorage for success page
          if (data.orderID) {
            localStorage.setItem('webshop_paypal_order_id', data.orderID);
          }
          _dispatch("payment:success", { orderRef, processor: "paypal", details: d, paypalOrderID: data.orderID });
        },
        onCancel: () => _dispatch("payment:cancel", { orderRef, processor: "paypal" }),
        onError: err => {
          console.error("[Payment/PayPal]", err);
          _dispatch("payment:error", { orderRef, processor: "paypal", error: err });
        },
      }).render(wrapper);
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
    async render(cart, totals, orderRef, el, formData) {
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
            metadata: {
              orderRef,
              customerEmail: formData?.email || "",
              customerName: formData ? `${formData.first_name} ${formData.last_name}`.trim() : "",
              shippingCountry: formData?.country || "",
              shippingAddress: formData?.address || "",
            },
          }),
        });
        ({ clientSecret } = await res.json());
      } catch (e) {
        console.error("[Payment/Stripe] PaymentIntent failed:", e);
        _dispatch("payment:error", { orderRef, processor: "stripe", error: e });
        return;
      }

      this._elements = this._instance.elements({ clientSecret, appearance: cfg.appearance });
      el.innerHTML = `
        <div id="stripe-pe" style="margin-bottom:14px;"></div>
        <button class="webshop-btn webshop-btn--primary webshop-btn--full" id="stripe-pay">${(window.T && window.T.ui && window.T.ui.payNow) || "Pay Now"}</button>
        <p id="stripe-err" style="color:#c0392b;font-size:0.82rem;margin-top:8px;display:none;"></p>`;
      this._elements.create("payment").mount("#stripe-pe");

      const btn = el.querySelector("#stripe-pay");
      const err = el.querySelector("#stripe-err");
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = (window.T && window.T.ui && window.T.ui.processing) || "Processing…";
        err.style.display = "none";

        const { error } = await this._instance.confirmPayment({
          elements: this._elements,
          confirmParams: {
            return_url: _resolveUrl(cfg.returnPath) + "?ref=" + orderRef,
            payment_method_data: formData ? {
              billing_details: {
                name: `${formData.first_name} ${formData.last_name}`.trim(),
                email: formData.email,
                phone: formData.phone || undefined,
                address: {
                  line1: formData.address,
                  city: formData.city,
                  postal_code: formData.postal,
                  country: formData.country,
                },
              },
            } : undefined,
          },
        });

        if (error) {
          err.textContent = error.message;
          err.style.display = "block";
          btn.disabled = false;
          btn.textContent = (window.T && window.T.ui && window.T.ui.payNow) || "Pay Now";
          _dispatch("payment:error", { orderRef, processor: "stripe", error });
        }
      });
    },
  };

  /* ── No-op adapter ───────────────────────────────────── */
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