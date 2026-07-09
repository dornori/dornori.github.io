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

  function _normalizeFormData(formData) {
    return typeof formData === 'function' ? formData : () => formData;
  }

  function _collectFormData(formData) {
    const fd = typeof formData === 'function' ? formData() : formData || {};
    return {
      first_name: fd.first_name || '',
      last_name: fd.last_name || '',
      email: fd.email || '',
      phone: fd.phone || '',
      address: fd.address || '',
      city: fd.city || '',
      postal: fd.postal || '',
      country: fd.country || '',
      billingChoice: fd.billingChoice || 'same',
      billing_first_name: fd.billing_first_name || '',
      billing_last_name: fd.billing_last_name || '',
      billing_address: fd.billing_address || '',
      billing_city: fd.billing_city || '',
      billing_postal: fd.billing_postal || '',
      billing_country: fd.billing_country || ''
    };
  }

  async function _createStandardOrder(cart, formData, currency, paymentMethod) {
    const cleanFormData = _collectFormData(formData);
    
    const res = await fetch(`${WORKER}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart,
        countryCode: cleanFormData.country || 'US',
        currency: currency,
        formData: cleanFormData,
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
      formData: cleanFormData,
      totals: result.totals
    }));
    return result;
  }

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

  const _renderTokens = new WeakMap();

  // ── GOOGLE PAY ──
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

        const basePaymentMethods = (gpayConfig.allowedPaymentMethods || []).map(m => ({
          ...m,
          parameters: {
            ...m.parameters,
            billingAddressRequired: true,
            billingAddressParameters: { 
              format: 'FULL', 
              phoneNumberRequired: true 
            }
          }
        }));

        const button = paymentsClient.createButton({
          buttonColor: 'black',
          buttonType: 'pay',
          buttonSizeMode: 'fill',
          onClick: async () => {
            try {
              const currency = _getActiveCurrency();
              const order = await _createStandardOrder(cart, {}, currency, 'paypal');
              
              const paymentDataRequest = {
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: basePaymentMethods,
                merchantInfo: gpayConfig.merchantInfo,
                emailRequired: true,
                shippingAddressRequired: true,
                shippingAddressParameters: { 
                  phoneNumberRequired: true 
                },
                transactionInfo: {
                  totalPriceStatus: 'FINAL',
                  totalPrice: Number(order.totals.total).toFixed(2),
                  currencyCode: currency,
                  countryCode: gpayConfig.countryCode || 'NL'
                },
                callbackIntents: ['SHIPPING_ADDRESS', 'PAYMENT_AUTHORIZATION']
              };

              const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
              
              const confirmResult = await window.paypal.Googlepay().confirmOrder({
                orderId: order.orderId,
                paymentMethodData: paymentData.paymentMethodData
              });
              
              if (confirmResult.status === 'DECLINED') throw new Error('Payment declined');

              const shippingAddress = paymentData.shippingAddress || {};
              const billingAddress = paymentData.paymentMethodData?.info?.billingAddress || {};
              
              const walletFormData = {
                first_name: shippingAddress.name || '',
                last_name: '',
                email: paymentData.email || '',
                phone: shippingAddress.phoneNumber || '',
                address: shippingAddress.address1 || shippingAddress.addressLine1 || '',
                city: shippingAddress.locality || '',
                postal: shippingAddress.postalCode || '',
                country: shippingAddress.countryCode || '',
                billingChoice: 'same',
                billing_first_name: billingAddress.name || shippingAddress.name || '',
                billing_last_name: '',
                billing_address: billingAddress.address1 || billingAddress.addressLine1 || shippingAddress.address1 || '',
                billing_city: billingAddress.locality || shippingAddress.locality || '',
                billing_postal: billingAddress.postalCode || shippingAddress.postalCode || '',
                billing_country: billingAddress.countryCode || shippingAddress.countryCode || ''
              };

              if (shippingAddress.address2) {
                walletFormData.address += ', ' + shippingAddress.address2;
              }
              if (billingAddress.address2) {
                walletFormData.billing_address += ', ' + billingAddress.address2;
              }

              const providerContact = {
                email: paymentData.email || '',
                billingAddress: billingAddress,
                shippingAddress: shippingAddress
              };
              
              const captureResult = await _captureOrder(order.orderId, {
                orderRef: order.orderRef, 
                items: cart, 
                formData: walletFormData,
                totals: order.totals, 
                currency, 
                providerContact
              });
              
              localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult.paypalData));
              _dispatch('payment:success', { 
                orderRef: order.orderRef, 
                processor: 'googlepay', 
                result: captureResult,
                address: walletFormData
              });
            } catch (err) {
              if (err && err.statusCode === 'CANCELED') {
                _dispatch('payment:cancel', { processor: 'googlepay' });
                return;
              }
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

  // ── APPLE PAY ──
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
      btn.className = 'apple-pay-button';
      btn.style.cssText = '-webkit-appearance:-apple-pay-button;-apple-pay-button-type:pay;-apple-pay-button-style:black;width:100%;height:48px;border-radius:8px;border:none;cursor:pointer;';

      btn.addEventListener('click', async () => {
        try {
          const currency = _getActiveCurrency();
          const order = await _createStandardOrder(cart, {}, currency, 'paypal');

          const paymentRequest = {
            countryCode: config.countryCode || 'NL',
            currencyCode: currency,
            merchantCapabilities: config.merchantCapabilities || ['supports3DS'],
            supportedNetworks: config.supportedNetworks || ['visa', 'masterCard', 'amex', 'discover'],
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

          session.onshippingcontactselected = (event) => {
            session.completeShippingContactSelection(
              ApplePaySession.STATUS_SUCCESS,
              [],
              { label: 'Dornori', amount: Number(order.totals.total).toFixed(2) }
            );
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
                const shippingContact = event.payment.shippingContact || {};
                const billingContact = event.payment.billingContact || {};
                
                const walletFormData = {
                  first_name: shippingContact.givenName || shippingContact.name || '',
                  last_name: shippingContact.familyName || '',
                  email: shippingContact.emailAddress || billingContact.emailAddress || '',
                  phone: shippingContact.phoneNumber || '',
                  address: (shippingContact.addressLines || []).join(', ') || '',
                  city: shippingContact.locality || '',
                  postal: shippingContact.postalCode || '',
                  country: shippingContact.countryCode || '',
                  billingChoice: 'same',
                  billing_first_name: billingContact.givenName || shippingContact.givenName || '',
                  billing_last_name: billingContact.familyName || '',
                  billing_address: (billingContact.addressLines || []).join(', ') || (shippingContact.addressLines || []).join(', ') || '',
                  billing_city: billingContact.locality || shippingContact.locality || '',
                  billing_postal: billingContact.postalCode || shippingContact.postalCode || '',
                  billing_country: billingContact.countryCode || shippingContact.countryCode || ''
                };

                const providerContact = {
                  shippingContact: shippingContact,
                  billingContact: billingContact,
                  email: walletFormData.email
                };
                
                const captureResult = await _captureOrder(order.orderId, {
                  orderRef: order.orderRef, 
                  items: cart, 
                  formData: walletFormData,
                  totals: order.totals, 
                  currency, 
                  providerContact
                });
                
                localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult.paypalData));
                session.completePayment(ApplePaySession.STATUS_SUCCESS);
                _dispatch('payment:success', { 
                  orderRef: order.orderRef, 
                  processor: 'applepay', 
                  result: captureResult,
                  address: walletFormData
                });
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

          session.oncancel = () => {
            _dispatch('payment:cancel', { processor: 'applepay' });
          };
          
          session.begin();
        } catch (err) {
          console.error('Apple Pay init error:', err);
          _dispatch('payment:error', { processor: 'applepay', error: err });
        }
      });

      container.appendChild(btn);
    }
  };

  // ── PAYPAL ──
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
        el.innerHTML = `<div class="webshop-payment-error">PayPal not loaded</div>`;
        return;
      }

      const getFormData = _normalizeFormData(formData);
      el.innerHTML = "";

      // ── Credit Card Section ──
      const cardSection = document.createElement('div');
      cardSection.id = 'paypal-card-section';
      cardSection.className = 'paypal-card-section';
      
      // Use existing webshop form classes
      cardSection.innerHTML = `
        <div class="webshop-form">
          <div class="webshop-form-group">
            <label for="card-number-field" class="webshop-form-label">Card Number</label>
            <div id="card-number-field" class="webshop-form-input paypal-hosted-field"></div>
          </div>
          <div class="webshop-form-row">
            <div class="webshop-form-group">
              <label for="expiry-field" class="webshop-form-label">Expiration</label>
              <div id="expiry-field" class="webshop-form-input paypal-hosted-field"></div>
            </div>
            <div class="webshop-form-group">
              <label for="cvv-field" class="webshop-form-label">CVV</label>
              <div id="cvv-field" class="webshop-form-input paypal-hosted-field"></div>
            </div>
          </div>
        </div>
        <button id="paypal-card-submit" type="button" class="webshop-btn webshop-btn--primary webshop-btn--full" style="margin-top: 8px;">
          Pay Now
        </button>
        <div id="card-error-message" class="webshop-form-error" style="display:none;margin-top:8px;"></div>
      `;
      
      el.appendChild(cardSection);

      // ── Divider ──
      const divider = document.createElement('div');
      divider.className = 'paypal-divider';
      divider.innerHTML = `
        <hr class="paypal-divider-line">
        <span class="paypal-divider-text">Or</span>
        <hr class="paypal-divider-line">
      `;
      el.appendChild(divider);

      // ── PayPal Button Section ──
      const paypalSection = document.createElement('div');
      paypalSection.id = 'paypal-button-section';
      paypalSection.className = 'paypal-button-section';
      el.appendChild(paypalSection);

      await this._renderCardFields(cardSection, cart, orderRef, getFormData, activeCurrency, onBeforePay);
      await this._renderPayPalButton(paypalSection, cart, getFormData, activeCurrency, orderRef, onBeforePay);

      return el;
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
        if (numField) numField.innerHTML = '<div class="webshop-text-muted">Card payments not available. Please use PayPal.</div>';
        const submitBtn = container.querySelector('#paypal-card-submit');
        if (submitBtn) submitBtn.style.display = 'none';
        return;
      }

      try {
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
            const freshFormData = typeof getFormData === 'function' ? getFormData() : getFormData || {};
            const result = await _createStandardOrder(cart, freshFormData, currency, 'card');
            _lastOrder = { orderRef: result.orderRef, items: cart, formData: freshFormData, totals: result.totals, currency };
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
        if (numField) numField.innerHTML = '<div class="webshop-text-muted">Card payments not available. Please use PayPal.</div>';
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
          const freshFormData = typeof getFormData === 'function' ? getFormData() : getFormData || {};
          const result = await _createStandardOrder(cart, freshFormData, currency, 'paypal');
          _lastOrder = { orderRef: result.orderRef, items: cart, formData: freshFormData, totals: result.totals, currency };
          return result.orderId;
        },
        onApprove: async (data) => {
          try {
            const captureResult = await _captureOrder(data.orderID, _lastOrder);
            localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult.paypalData));
            _dispatch("payment:success", { 
              orderRef: localStorage.getItem('webshop_order_ref') || orderRef, 
              processor: "paypal", 
              result: captureResult 
            });
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

  const _stripe = {
    _instance: null,
    _elements: null,
    async init() {
      await _loadScript("https://js.stripe.com/v3/");
      this._instance = window.Stripe(CONFIG.payment.stripe.publishableKey);
    },
    async render(cart, totals, orderRef, el, formData) {
      if (!this._instance) throw new Error("[Payment/Stripe] Not initialized");
      el.innerHTML = `<div class="webshop-text-muted" style="padding:20px;text-align:center;">Stripe integration coming soon</div>`;
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