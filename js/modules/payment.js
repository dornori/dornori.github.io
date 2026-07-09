const Payment = (() => {
  let _ready = false;
  let _cardFieldsInstance = null;

  const WORKER = 'https://pay.dornori-info.workers.dev';

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

  function _getActiveCurrency() {
    return (typeof Currency !== 'undefined' && Currency.getActive) ? Currency.getActive() : CONFIG.payment.paypal.currency;
  }

  // formData may be a plain object (legacy) or a getter function that always
  // returns the live, current form state. Normalize to a function so every
  // consumer reads fresh data instead of a stale snapshot taken at render time.
  function _normalizeFormData(formData) {
    return typeof formData === 'function' ? formData : () => formData;
  }

  async function _createStandardOrder(cart, formData, currency, paymentMethod) {
    const res = await fetch(`${WORKER}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart,
        countryCode: formData?.country || 'US',
        currency: currency,
        formData: formData,
        paymentMethod: paymentMethod || 'paypal'
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Order creation failed');
    }
    const result = await res.json();
    localStorage.setItem('webshop_order_ref', result.orderRef);
    localStorage.setItem('webshop_paypal_order_id', result.orderId);
    localStorage.setItem('webshop_order_snapshot', JSON.stringify({
      items: cart,
      formData: formData,
      totals: result.totals
    }));
    return result;
  }

  // meta = { orderRef, items, formData, totals, currency, providerContact }
  // providerContact (Apple/Google wallet-confirmed address) takes priority
  // over formData on the worker side — see worker.js sendOrderConfirmation.
  async function _captureOrder(orderId, meta) {
    const res = await fetch(`${WORKER}/api/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, ...(meta || {}) })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Capture failed');
    }
    return res.json();
  }

  const _paypal = {
    _loadedCurrency: null,

    async init(forceCurrency) {
      const { clientId, intent } = CONFIG.payment.paypal;
      if (!clientId) return;
      const targetCurrency = forceCurrency || _getActiveCurrency();
      if (window.paypal && this._loadedCurrency === targetCurrency) return;

      document.querySelectorAll('script[src*="paypal.com/sdk/js"]').forEach(s => s.remove());
      delete window.paypal;

      await _loadScript(
        `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${targetCurrency}&intent=${intent || "capture"}&components=buttons,card-fields,googlepay,applepay`
      );

      this._loadedCurrency = targetCurrency;

      return new Promise((resolve) => {
        const checkPayPal = () => {
          if (window.paypal) resolve();
          else setTimeout(checkPayPal, 200);
        };
        checkPayPal();
      });
    },

    async render(cart, totals, orderRef, el, formData, onBeforePay) {
      const activeCurrency = _getActiveCurrency();

      if (!window.paypal || this._loadedCurrency !== activeCurrency) {
        await this.init(activeCurrency);
      }

      if (!window.paypal) {
        el.innerHTML = `<div style="padding:20px;text-align:center;border:1px dashed var(--c-border);color:var(--c-text-3);font-size:0.85rem;">PayPal not loaded</div>`;
        return;
      }

      const getFormData = _normalizeFormData(formData);

      el.innerHTML = "";

      // No separate boxed/centered panel — flows full-width as part of the
      // surrounding checkout form, using the SAME form classes as the rest
      // of the page (webshop-form / webshop-form-row / webshop-form-group)
      // so it doesn't render as a visually distinct "form inside the form".
      const wrapper = document.createElement('div');
      el.appendChild(wrapper);

      // ── Credit Card Section ──
      const cardSection = document.createElement('div');
      cardSection.id = 'paypal-card-section';
      cardSection.className = 'webshop-form';
      cardSection.style.cssText = 'margin-bottom:20px;';
      cardSection.innerHTML = `
        <div class="webshop-form-group">
          <label>Card Number</label>
          <div id="card-number-field" class="webshop-hosted-field"></div>
        </div>
        <div class="webshop-form-row">
          <div class="webshop-form-group">
            <label>Expiration</label>
            <div id="expiry-field" class="webshop-hosted-field"></div>
          </div>
          <div class="webshop-form-group">
            <label>CVV</label>
            <div id="cvv-field" class="webshop-hosted-field"></div>
          </div>
        </div>
        <button id="paypal-card-submit" type="button" class="webshop-btn webshop-btn--primary" style="width:100%;margin-top:8px;">Pay Now</button>
        <div id="card-error-message" style="color:var(--c-error,#c0392b);font-size:0.82rem;margin-top:8px;display:none;"></div>
      `;
      wrapper.appendChild(cardSection);

      // Hosted fields render inside plain <div>s (PayPal mounts an iframe into
      // them), so they need a one-off style rule to look like the surrounding
      // <input> fields instead of default unstyled boxes. Injected once.
      if (!document.getElementById('webshop-hosted-field-style')) {
        const style = document.createElement('style');
        style.id = 'webshop-hosted-field-style';
        style.textContent = `
          .webshop-hosted-field {
            border: 1.5px solid var(--c-border, #ddd);
            border-radius: var(--radius, 8px);
            padding: 8px 12px;
            background: var(--c-surface, #fff);
            min-height: 44px;
            box-sizing: border-box;
          }
          .webshop-hosted-field.webshop-hosted-field--focus { border-color: var(--c-accent, #1a1714); }
        `;
        document.head.appendChild(style);
      }

      // ── Divider ──
      const divider = document.createElement('div');
      divider.style.cssText = 'display:flex;align-items:center;gap:12px;margin:16px 0;';
      divider.innerHTML = `
        <hr style="flex:1;border:none;border-top:1px solid var(--c-border);">
        <span style="font-size:0.78rem;color:var(--c-text-3);font-weight:500;">Or</span>
        <hr style="flex:1;border:none;border-top:1px solid var(--c-border);">
      `;
      wrapper.appendChild(divider);

      // ── PayPal Button Section ──
      const paypalSection = document.createElement('div');
      paypalSection.id = 'paypal-button-section';
      paypalSection.style.cssText = 'margin-top:4px;';
      wrapper.appendChild(paypalSection);

      await this._renderCardFields(cardSection, cart, orderRef, getFormData, activeCurrency, onBeforePay);
      await this._renderPayPalButton(paypalSection, cart, getFormData, activeCurrency, orderRef, onBeforePay);

      return wrapper;
    },

    async _renderCardFields(container, cart, orderRef, getFormData, currency, onBeforePay) {
      if (!window.paypal) { console.warn('PayPal not available'); return; }

      let attempts = 0;
      while (!window.paypal.CardFields && attempts < 20) {
        await new Promise(r => setTimeout(r, 300));
        attempts++;
      }

      if (!window.paypal.CardFields) {
        console.warn('PayPal CardFields not available');
        const numField = container.querySelector('#card-number-field');
        if (numField) numField.innerHTML = '<div style="padding:10px;color:var(--c-text-3);font-size:0.85rem;">Card payments not available. Please use PayPal.</div>';
        const submitBtn = container.querySelector('#paypal-card-submit');
        if (submitBtn) submitBtn.style.display = 'none';
        return;
      }

      try {
        // Standard PayPal Advanced Card Payments flow: createOrder returns an
        // orderId, hosted fields collect card data inside PayPal's own iframes
        // (raw PAN never touches our code), .submit() tokenizes + authorizes,
        // and onApprove fires once PayPal has approved the order.
        let _lastOrder = null;
        _cardFieldsInstance = await window.paypal.CardFields({
          style: {
            input: {
              'font-size': '16px',
              'font-family': 'system-ui, sans-serif',
              'color': '#1a1714',
              'background-color': 'transparent',
              'padding': '8px 0',
            },
            '.valid':   { 'border-color': '#4a7c59' },
            '.invalid': { 'border-color': '#9b3a3a' }
          },
          createOrder: async () => {
            const result = await _createStandardOrder(cart, getFormData(), currency, 'card');
            _lastOrder = { orderRef: result.orderRef, items: cart, formData: getFormData(), totals: result.totals, currency };
            return result.orderId;
          },
          onApprove: async (data) => {
            const submitBtn = container.querySelector('#paypal-card-submit');
            try {
              const captureResult = await _captureOrder(data.orderID, _lastOrder);
              localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult.paypalData));
              _dispatch('payment:success', {
                orderRef: localStorage.getItem('webshop_order_ref') || orderRef,
                processor: 'card',
                result: captureResult
              });
            } catch (err) {
              console.error('Card capture error:', err);
              const errorMsg = container.querySelector('#card-error-message');
              if (errorMsg) { errorMsg.textContent = err.message || 'Payment failed. Please try again.'; errorMsg.style.display = 'block'; }
              if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Pay Now'; }
              _dispatch('payment:error', { orderRef, processor: 'card', error: err });
            }
          },
          onError: (err) => {
            console.error('Card fields error:', err);
            const errorMsg = container.querySelector('#card-error-message');
            if (errorMsg) { errorMsg.textContent = 'Payment failed. Please check your card details.'; errorMsg.style.display = 'block'; }
            const submitBtn = container.querySelector('#paypal-card-submit');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Pay Now'; }
            _dispatch('payment:error', { orderRef, processor: 'card', error: err });
          }
        });

        const numberField = _cardFieldsInstance.NumberField({ placeholder: '1234 5678 9012 3456' });
        numberField.render('#card-number-field');

        const expiryField = _cardFieldsInstance.ExpiryField({ placeholder: 'MM/YY' });
        expiryField.render('#expiry-field');

        const cvvField = _cardFieldsInstance.CVVField({ placeholder: '123' });
        cvvField.render('#cvv-field');

        const submitBtn = container.querySelector('#paypal-card-submit');
        const errorMsg = container.querySelector('#card-error-message');
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

        newSubmitBtn.addEventListener('click', async function() {
          errorMsg.style.display = 'none';
          if (onBeforePay) {
            const ok = await onBeforePay();
            if (!ok) return;
          }
          this.disabled = true;
          this.textContent = 'Processing...';
          try {
            if (!_cardFieldsInstance) throw new Error('Card fields not initialized');
            // .submit() triggers createOrder -> PayPal tokenization/3DS -> onApprove.
            // Do NOT read raw field values ourselves; hosted fields never expose the PAN.
            await _cardFieldsInstance.submit();
          } catch (err) {
            console.error('Card submit error:', err);
            errorMsg.textContent = err.message || 'Please check your card details and try again.';
            errorMsg.style.display = 'block';
            this.disabled = false;
            this.textContent = 'Pay Now';
          }
        });
      } catch (e) {
        console.warn('Card fields error:', e);
        const numField = container.querySelector('#card-number-field');
        if (numField) numField.innerHTML = '<div style="padding:10px;color:var(--c-text-3);font-size:0.85rem;">Card payments not available. Please use PayPal.</div>';
        const submitBtn = container.querySelector('#paypal-card-submit');
        if (submitBtn) submitBtn.style.display = 'none';
      }
    },

    async _renderPayPalButton(container, cart, getFormData, currency, orderRef, onBeforePay) {
      if (!window.paypal) return;

      let _lastOrder = null;
      await window.paypal.Buttons({
        style: {
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "paypal",
          height: 48
        },
        onClick: async (data, actions) => {
          if (onBeforePay) {
            const ok = await onBeforePay();
            if (!ok) return actions.reject();
          }
          return actions.resolve();
        },
        createOrder: async () => {
          const result = await _createStandardOrder(cart, getFormData(), currency, 'paypal');
          _lastOrder = { orderRef: result.orderRef, items: cart, formData: getFormData(), totals: result.totals, currency };
          return result.orderId;
        },
        onApprove: async (data) => {
          try {
            const captureResult = await _captureOrder(data.orderID, _lastOrder);
            localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult.paypalData));
            _dispatch("payment:success", { orderRef: localStorage.getItem('webshop_order_ref') || orderRef, processor: "paypal", result: captureResult });
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
      }).render(container);
    }
  };

  // ── Google Pay — via PayPal's own Googlepay() SDK component. ──
  // This reuses the same create-order / capture-order endpoints as the PayPal
  // button. No raw card data is ever extracted from the Google Pay token; the
  // token is handed straight to paypal.Googlepay().confirmOrder().
  // Guards against overlapping render() calls on the same container (e.g. if
  // loadAlternativePayments() were ever triggered twice in quick succession)
  // appending two buttons — whichever render started last wins.
  const _renderTokens = new WeakMap();

  const _googlepay = {
    async isAvailable() {
      return typeof window.paypal !== 'undefined' && typeof window.paypal.Googlepay === 'function';
    },
    async render(container, cart, formData, onBeforePay) {
      if (!container) return;
      const myToken = (_renderTokens.get(container) || 0) + 1;
      _renderTokens.set(container, myToken);
      container.innerHTML = '';
      const getFormData = _normalizeFormData(formData);
      if (!_ready) await init();
      if (_renderTokens.get(container) !== myToken) return;
      if (!(await this.isAvailable())) { container.style.display = 'none'; return; }

      try {
        if (typeof google === 'undefined' || !google.payments || !google.payments.api) {
          await _loadScript('https://pay.google.com/gp/p/js/pay.js');
        }
        const gpayConfig = await window.paypal.Googlepay().config();
        const paymentsClient = new google.payments.api.PaymentsClient({ environment: gpayConfig.environment || 'TEST' });

        const readyRes = await paymentsClient.isReadyToPay({
          apiVersion: 2, apiVersionMinor: 0,
          allowedPaymentMethods: gpayConfig.allowedPaymentMethods
        });
        if (!readyRes.result) { container.style.display = 'none'; return; }
        if (_renderTokens.get(container) !== myToken) return;

        const button = paymentsClient.createButton({
          buttonColor: 'black',
          buttonType: 'pay',
          buttonSizeMode: 'fill',
          onClick: async () => {
            if (onBeforePay) {
              const ok = await onBeforePay();
              if (!ok) return;
            }
            try {
              const currency = _getActiveCurrency();
              const order = await _createStandardOrder(cart, getFormData(), currency, 'paypal');
              // Ask Google Pay for the wallet's own billing/shipping contact,
              // not just a payment token, so we don't have to rely solely on
              // whatever is (or isn't) filled into the on-page form.
              const allowedPaymentMethods = (gpayConfig.allowedPaymentMethods || []).map(m => ({
                ...m,
                parameters: {
                  ...m.parameters,
                  billingAddressRequired: true,
                  billingAddressParameters: { format: 'FULL', phoneNumberRequired: true }
                }
              }));
              const paymentDataRequest = {
                apiVersion: 2, apiVersionMinor: 0,
                allowedPaymentMethods,
                merchantInfo: gpayConfig.merchantInfo,
                emailRequired: true,
                shippingAddressRequired: true,
                shippingAddressParameters: { phoneNumberRequired: true },
                transactionInfo: {
                  totalPriceStatus: 'FINAL',
                  totalPrice: Number(order.totals.total).toFixed(2),
                  currencyCode: currency,
                  countryCode: gpayConfig.countryCode || 'NL'
                }
              };
              const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
              const confirmResult = await window.paypal.Googlepay().confirmOrder({
                orderId: order.orderId,
                paymentMethodData: paymentData.paymentMethodData
              });
              if (confirmResult.status === 'DECLINED') throw new Error('Payment declined');

              const providerContact = {
                email: paymentData.email || null,
                billingAddress: paymentData.paymentMethodData?.info?.billingAddress || null,
                shippingAddress: paymentData.shippingAddress || null
              };
              const captureResult = await _captureOrder(order.orderId, {
                orderRef: order.orderRef, items: cart, formData: getFormData(), totals: order.totals, currency, providerContact
              });
              localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult.paypalData));
              _dispatch('payment:success', { orderRef: order.orderRef, processor: 'googlepay', result: captureResult });
            } catch (err) {
              if (err && err.statusCode === 'CANCELED') return;
              console.error('Google Pay error:', err);
              _dispatch('payment:error', { processor: 'googlepay', error: err });
            }
          }
        });
        container.appendChild(button);
      } catch (e) {
        console.warn('Google Pay unavailable:', e);
        container.style.display = 'none';
      }
    }
  };

  // ── Apple Pay — via PayPal's own Applepay() SDK component. ──
  const _applepay = {
    async isAvailable() {
      return typeof window.ApplePaySession !== 'undefined' &&
             ApplePaySession.canMakePayments() &&
             typeof window.paypal !== 'undefined' &&
             typeof window.paypal.Applepay === 'function';
    },
    async render(container, cart, formData, onBeforePay) {
      if (!container) return;
      const myToken = (_renderTokens.get(container) || 0) + 1;
      _renderTokens.set(container, myToken);
      container.innerHTML = '';
      const getFormData = _normalizeFormData(formData);
      if (!_ready) await init();
      if (_renderTokens.get(container) !== myToken) return;
      if (!(await this.isAvailable())) { container.style.display = 'none'; return; }

      let applepay, config;
      try {
        applepay = window.paypal.Applepay();
        config = await applepay.config();
      } catch (e) {
        console.warn('Apple Pay unavailable:', e);
        container.style.display = 'none';
        return;
      }
      if (_renderTokens.get(container) !== myToken) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Pay with Apple Pay');
      btn.style.cssText = '-webkit-appearance:-apple-pay-button;-apple-pay-button-type:pay;-apple-pay-button-style:black;width:100%;height:48px;border-radius:8px;border:none;cursor:pointer;';

      btn.addEventListener('click', async () => {
        if (onBeforePay) {
          const ok = await onBeforePay();
          if (!ok) return;
        }
        try {
          const currency = _getActiveCurrency();
          const order = await _createStandardOrder(cart, getFormData(), currency, 'paypal');

          const paymentRequest = {
            countryCode: config.countryCode,
            currencyCode: currency,
            merchantCapabilities: config.merchantCapabilities,
            supportedNetworks: config.supportedNetworks,
            requiredBillingContactFields: ['postalAddress', 'name', 'email', 'phone'],
            requiredShippingContactFields: ['postalAddress', 'name', 'email', 'phone'],
            total: { label: 'Dornori', amount: Number(order.totals.total).toFixed(2) }
          };

          const session = new ApplePaySession(4, paymentRequest);

          session.onvalidatemerchant = (event) => {
            applepay.validateMerchant({ validationUrl: event.validationURL })
              .then((payload) => session.completeMerchantValidation(payload.merchantSession))
              .catch((err) => {
                console.error('Apple Pay merchant validation failed:', err);
                session.abort();
                _dispatch('payment:error', { processor: 'applepay', error: err });
              });
          };

          session.onpaymentauthorized = async (event) => {
            try {
              const confirmResult = await applepay.confirmOrder({
                orderId: order.orderId,
                token: event.payment.token,
                billingContact: event.payment.billingContact,
                shippingContact: event.payment.shippingContact
              });
              if (confirmResult.approveApplePayPayment) {
                // Apple's own wallet-confirmed contact — sent alongside the
                // browser form so the ticket can prefer it as the source of truth.
                const providerContact = {
                  shippingContact: event.payment.shippingContact || null,
                  billingContact: event.payment.billingContact || null
                };
                const captureResult = await _captureOrder(order.orderId, {
                  orderRef: order.orderRef, items: cart, formData: getFormData(), totals: order.totals, currency, providerContact
                });
                localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult.paypalData));
                session.completePayment(ApplePaySession.STATUS_SUCCESS);
                _dispatch('payment:success', { orderRef: order.orderRef, processor: 'applepay', result: captureResult });
              } else {
                session.completePayment(ApplePaySession.STATUS_FAILURE);
                _dispatch('payment:error', { processor: 'applepay', error: new Error('Payment not approved') });
              }
            } catch (err) {
              console.error('Apple Pay confirm error:', err);
              session.completePayment(ApplePaySession.STATUS_FAILURE);
              _dispatch('payment:error', { processor: 'applepay', error: err });
            }
          };

          session.oncancel = () => {};
          session.begin();
        } catch (err) {
          console.error('Apple Pay init error:', err);
          _dispatch('payment:error', { processor: 'applepay', error: err });
        }
      });

      container.appendChild(btn);
    }
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
      el.innerHTML = `<div style="padding:20px;text-align:center;color:var(--c-text-3);font-size:0.85rem;">Stripe integration coming soon</div>`;
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

  async function render(cart, totals, orderRef, mountEl, formData, onBeforePay) {
    if (!_ready) await init();
    const el = typeof mountEl === "string" ? document.querySelector(mountEl) : mountEl;
    if (!el) return;
    await _adapters[CONFIG.payment.activeProcessor || "none"].render(cart, totals, orderRef, el, formData, onBeforePay);
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

  // container: DOM element or selector string.
  // cart: cart items array.
  // formData: object OR getter function returning the live form state.
  // onBeforePay: optional async () => boolean, run (e.g. form validation) before charging.
  async function renderGooglePay(container, cart, formData, onBeforePay) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    await _googlepay.render(el, cart, formData, onBeforePay);
  }

  async function renderApplePay(container, cart, formData, onBeforePay) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    await _applepay.render(el, cart, formData, onBeforePay);
  }

  function isApplePayAvailable() {
    return typeof window.ApplePaySession !== 'undefined' && ApplePaySession.canMakePayments();
  }

  return {
    init,
    render,
    switchProcessor,
    getActive: () => CONFIG.payment.activeProcessor,
    adapters: _adapters,
    renderGooglePay,
    renderApplePay,
    isApplePayAvailable
  };
})();
window.Payment = Payment;
