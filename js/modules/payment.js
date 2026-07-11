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

  function _getActiveLanguage() {
    return (typeof window !== 'undefined' && window.LANG) || 
           localStorage.getItem('dornori-lang') || 
           'en';
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
      totals: result.totals,
      currency: currency
    }));
    // Attach formData to result so callers can pass it to capture
    result._formData = cleanFormData;
    return result;
  }

  async function _captureOrder(orderId, orderRef, language, fallback, savedForm) {
    const res = await fetch(`${WORKER}/api/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, orderRef, language, fallback: fallback || {}, formData: savedForm || {} })
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

        const allowedPaymentMethods = (gpayConfig.allowedPaymentMethods || []).map(m => ({
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
              const language = _getActiveLanguage();
              
              const order = await _createStandardOrder(cart, {}, currency, 'paypal');
              
              const paymentDataRequest = {
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: allowedPaymentMethods,
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
                }
              };

              const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);

              const gpayEmail = paymentData.email || null;
              const gpayPhone = paymentData.shippingAddress?.phoneNumber ||
                       paymentData.paymentMethodData?.info?.billingAddress?.phoneNumber || null;
              const gpayName = paymentData.paymentMethodData?.info?.billingAddress?.name ||
                       paymentData.shippingAddress?.name || '';
              const [gpayFirst, ...gpayLastParts] = gpayName.split(' ').filter(Boolean);
              const gpayAddr = paymentData.shippingAddress || paymentData.paymentMethodData?.info?.billingAddress || {};

              // Create the real order now that we have the wallet's contact info,
              // so it can be attached to the order (email/phone can only be set
              // at order creation, not patched in afterward).
              const realOrder = await _createStandardOrder(cart, {
                email: gpayEmail || '',
                phone: gpayPhone || '',
                first_name: gpayFirst || '',
                last_name: gpayLastParts.join(' ') || '',
                address: gpayAddr.address1 || '',
                city: gpayAddr.locality || '',
                postal: gpayAddr.postalCode || '',
                country: gpayAddr.countryCode || ''
              }, currency, 'paypal');

              const confirmResult = await window.paypal.Googlepay().confirmOrder({
                orderId: realOrder.orderId,
                paymentMethodData: paymentData.paymentMethodData
              });
              
              if (confirmResult.status === 'DECLINED') throw new Error('Payment declined');

              const gpayFallback = {
                email: gpayEmail,
                phone: gpayPhone,
                amount: realOrder.totals?.total != null ? Number(realOrder.totals.total).toFixed(2) : null,
                currency: currency
              };

              const captureResult = await _captureOrder(realOrder.orderId, realOrder.orderRef, language, gpayFallback);
              
              if (captureResult.success && captureResult.customer) {
                localStorage.setItem('webshop_paypal_customer', JSON.stringify(captureResult.customer));
                localStorage.setItem('webshop_paypal_order_id', captureResult.paypalOrderId);
                localStorage.setItem('webshop_paypal_transaction_id', captureResult.transactionId);
                localStorage.setItem('webshop_dor_reference', captureResult.dorReference);
                localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult));
              }
              
              _dispatch('payment:success', { 
                orderRef: realOrder.orderRef, 
                processor: 'googlepay', 
                result: captureResult
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
          const language = _getActiveLanguage();
          
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
              const billing = event.payment.billingContact || {};
              const shipping = event.payment.shippingContact || {};
              const apayEmail = billing.emailAddress || shipping.emailAddress || '';
              const apayPhone = billing.phoneNumber || shipping.phoneNumber || '';

              // Create the real order now that we have the wallet's contact info,
              // so it can be attached to the order (email/phone can only be set
              // at order creation, not patched in afterward).
              const realOrder = await _createStandardOrder(cart, {
                email: apayEmail,
                phone: apayPhone,
                first_name: billing.givenName || shipping.givenName || '',
                last_name: billing.familyName || shipping.familyName || '',
                address: (shipping.addressLines || billing.addressLines || [])[0] || '',
                city: shipping.locality || billing.locality || '',
                postal: shipping.postalCode || billing.postalCode || '',
                country: shipping.countryCode || billing.countryCode || ''
              }, currency, 'paypal');

              const confirmResult = await applepay.confirmOrder({
                orderId: realOrder.orderId,
                token: event.payment.token,
                billingContact: event.payment.billingContact,
                shippingContact: event.payment.shippingContact
              });
              
              if (confirmResult.approveApplePayPayment) {
                const apayFallback = {
                  email: apayEmail || null,
                  phone: apayPhone || null,
                  amount: realOrder.totals?.total != null ? Number(realOrder.totals.total).toFixed(2) : null,
                  currency: currency
                };
                const captureResult = await _captureOrder(realOrder.orderId, realOrder.orderRef, language, apayFallback);
                
                if (captureResult.success && captureResult.customer) {
                  localStorage.setItem('webshop_paypal_customer', JSON.stringify(captureResult.customer));
                  localStorage.setItem('webshop_paypal_order_id', captureResult.paypalOrderId);
                  localStorage.setItem('webshop_paypal_transaction_id', captureResult.transactionId);
                  localStorage.setItem('webshop_dor_reference', captureResult.dorReference);
                  localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult));
                }
                
                session.completePayment(ApplePaySession.STATUS_SUCCESS);
                _dispatch('payment:success', { 
                  orderRef: realOrder.orderRef, 
                  processor: 'applepay', 
                  result: captureResult
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
      const myToken = (_renderTokens.get(el) || 0) + 1;
      _renderTokens.set(el, myToken);

      const activeCurrency = _getActiveCurrency();

      if (!window.paypal || this._loadedCurrency !== activeCurrency) {
        await this.init(activeCurrency);
      }

      if (_renderTokens.get(el) !== myToken) return;

      if (!window.paypal) {
        el.innerHTML = `<div class="webshop-text-muted" style="padding:20px;text-align:center;">PayPal not loaded</div>`;
        return;
      }

      const getFormData = _normalizeFormData(formData);
      el.innerHTML = "";
      if (_renderTokens.get(el) !== myToken) return;

      const uid = 'pf' + myToken + '_' + Date.now();

      // ── Credit Card Section ──
      const cardSection = document.createElement('div');
      cardSection.id = 'paypal-card-section';
      cardSection.className = 'paypal-card-section';
      
      cardSection.innerHTML = `
        <div class="webshop-form" style="padding:0;">
          <div class="webshop-form-group">
            <label class="webshop-form-label">Card Number</label>
            <div id="card-number-field-${uid}" class="paypal-hosted-field"></div>
          </div>
          <div class="webshop-form-row">
            <div class="webshop-form-group">
              <label class="webshop-form-label">Expiration</label>
              <div id="expiry-field-${uid}" class="paypal-hosted-field"></div>
            </div>
            <div class="webshop-form-group">
              <label class="webshop-form-label">CVV</label>
              <div id="cvv-field-${uid}" class="paypal-hosted-field"></div>
            </div>
          </div>
        </div>
        <button id="paypal-card-submit-${uid}" type="button" class="webshop-btn webshop-btn--primary" style="width:100%;margin-top:12px;">
          Pay Now
        </button>
        <div id="card-error-message-${uid}" class="webshop-form-error" style="display:none;margin-top:8px;"></div>
      `;
      
      el.appendChild(cardSection);

      // ── Divider ──
      const divider = document.createElement('div');
      divider.className = 'paypal-divider';
      divider.style.cssText = 'display:flex;align-items:center;gap:12px;margin:16px 0;';
      divider.innerHTML = `
        <hr style="flex:1;border:none;border-top:1px solid var(--c-border);">
        <span style="font-size:0.78rem;color:var(--c-text-3);font-weight:500;text-transform:uppercase;letter-spacing:0.06em;">Or</span>
        <hr style="flex:1;border:none;border-top:1px solid var(--c-border);">
      `;
      el.appendChild(divider);

      // ── PayPal Button Section — plain white box, PayPal owns everything inside it ──
      const paypalBox = document.createElement('div');
      paypalBox.className = 'paypal-button-box';
      const paypalSection = document.createElement('div');
      paypalSection.id = 'paypal-button-section-' + uid;
      paypalBox.appendChild(paypalSection);
      el.appendChild(paypalBox);

      await this._renderCardFields(cardSection, cart, orderRef, getFormData, activeCurrency, onBeforePay, el, myToken, uid);
      if (_renderTokens.get(el) !== myToken) return;
      await this._renderPayPalButton(paypalSection, cart, getFormData, activeCurrency, orderRef, onBeforePay, el, myToken);

      return el;
    },

    async _renderCardFields(container, cart, orderRef, getFormData, currency, onBeforePay, el, myToken, uid) {
      if (!window.paypal) { console.warn('PayPal not available'); return; }

      let attempts = 0;
      while (!window.paypal.CardFields && attempts < 20) {
        await new Promise(r => setTimeout(r, 300));
        attempts++;
      }

      if (el && _renderTokens.get(el) !== myToken) return;

      if (!window.paypal.CardFields) {
        console.warn('PayPal CardFields not available');
        const numField = container.querySelector('#card-number-field-' + uid);
        if (numField) {
          numField.innerHTML = '<div class="webshop-text-muted" style="padding:10px;color:var(--c-text-3);">Card payments not available. Please use PayPal.</div>';
        }
        const submitBtn = container.querySelector('#paypal-card-submit-' + uid);
        if (submitBtn) submitBtn.style.display = 'none';
        return;
      }

      try {
        let _lastOrder = null;
        _cardFieldsInstance = await window.paypal.CardFields({
          style: {
            input: {
              'font-size': '15px',
              'font-family': 'system-ui, sans-serif',
              'color': '#1a1714',
              'background-color': 'transparent',
              'padding': '0',
            },
            '.valid':   { 'color': '#4a7c59' },
            '.invalid': { 'color': '#9b3a3a' }
          },
          createOrder: async () => {
            // Read form data DIRECTLY from DOM
            const formData = {
              first_name: document.getElementById('cart-first-name')?.value || '',
              last_name: document.getElementById('cart-last-name')?.value || '',
              email: document.getElementById('cart-email')?.value || '',
              phone: document.getElementById('cart-phone')?.value || '',
              address: document.getElementById('cart-address')?.value || '',
              city: document.getElementById('cart-city')?.value || '',
              postal: document.getElementById('cart-postal')?.value || '',
              country: document.getElementById('cart-country')?.value || '',
              billingChoice: document.querySelector('input[name="cart_billing_choice"]:checked')?.value || 'same',
              billing_first_name: document.getElementById('cart-billing-first-name')?.value || '',
              billing_last_name: document.getElementById('cart-billing-last-name')?.value || '',
              billing_address: document.getElementById('cart-billing-address')?.value || '',
              billing_city: document.getElementById('cart-billing-city')?.value || '',
              billing_postal: document.getElementById('cart-billing-postal')?.value || '',
              billing_country: document.getElementById('cart-billing-country')?.value || ''
            };
            
            const result = await _createStandardOrder(cart, formData, currency, 'card');
            _lastOrder = { orderRef: result.orderRef, items: cart, formData: formData, totals: result.totals, currency };
            _lastOrder._savedForm = result._formData || formData;
            return result.orderId;
          },
          onApprove: async (data) => {
            const submitBtn = container.querySelector('#paypal-card-submit-' + uid);
            try {
              const language = _getActiveLanguage();
              const cardFallback = {
                amount: _lastOrder?.totals?.total != null ? Number(_lastOrder.totals.total).toFixed(2) : null,
                currency: _lastOrder?.currency || null
              };
              const captureResult = await _captureOrder(data.orderID, _lastOrder?.orderRef || orderRef, language, cardFallback, _lastOrder?._savedForm || _lastOrder?.formData);
              
              if (captureResult.success && captureResult.customer) {
                localStorage.setItem('webshop_paypal_customer', JSON.stringify(captureResult.customer));
                localStorage.setItem('webshop_paypal_order_id', captureResult.paypalOrderId);
                localStorage.setItem('webshop_paypal_transaction_id', captureResult.transactionId);
                localStorage.setItem('webshop_dor_reference', captureResult.dorReference);
                localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult));
              }
              
              _dispatch('payment:success', {
                orderRef: localStorage.getItem('webshop_order_ref') || orderRef,
                processor: 'card',
                result: captureResult
              });
            } catch (err) {
              console.error('Card capture error:', err);
              const errorMsg = container.querySelector('#card-error-message-' + uid);
              if (errorMsg) { 
                errorMsg.textContent = err.message || 'Payment failed. Please try again.'; 
                errorMsg.style.display = 'block'; 
              }
              if (submitBtn) { 
                submitBtn.disabled = false; 
                submitBtn.textContent = 'Pay Now'; 
              }
              _dispatch('payment:error', { orderRef, processor: 'card', error: err });
            }
          },
          onError: (err) => {
            console.error('Card fields error:', err);
            const errorMsg = container.querySelector('#card-error-message-' + uid);
            if (errorMsg) { 
              errorMsg.textContent = 'Payment failed. Please check your card details.'; 
              errorMsg.style.display = 'block'; 
            }
            const submitBtn = container.querySelector('#paypal-card-submit-' + uid);
            if (submitBtn) { 
              submitBtn.disabled = false; 
              submitBtn.textContent = 'Pay Now'; 
            }
            _dispatch('payment:error', { orderRef, processor: 'card', error: err });
          }
        });

        const numberField = _cardFieldsInstance.NumberField({ placeholder: '1234 5678 9012 3456' });
        const expiryField = _cardFieldsInstance.ExpiryField({ placeholder: 'MM/YY' });
        const cvvField = _cardFieldsInstance.CVVField({ placeholder: '123' });

        if (el && _renderTokens.get(el) !== myToken) return;

        numberField.render('#card-number-field-' + uid);
        expiryField.render('#expiry-field-' + uid);
        cvvField.render('#cvv-field-' + uid);

        const submitBtn = container.querySelector('#paypal-card-submit-' + uid);
        const errorMsg = container.querySelector('#card-error-message-' + uid);
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
        const numField = container.querySelector('#card-number-field-' + uid);
        if (numField) {
          numField.innerHTML = '<div class="webshop-text-muted" style="padding:10px;color:var(--c-text-3);">Card payments not available. Please use PayPal.</div>';
        }
        const submitBtn = container.querySelector('#paypal-card-submit-' + uid);
        if (submitBtn) submitBtn.style.display = 'none';
      }
    },

    async _renderPayPalButton(container, cart, getFormData, currency, orderRef, onBeforePay, el, myToken) {
      if (!window.paypal) return;
      if (el && _renderTokens.get(el) !== myToken) return;

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
          // Read form data DIRECTLY from DOM elements
          const formData = {
            first_name: document.getElementById('cart-first-name')?.value || '',
            last_name: document.getElementById('cart-last-name')?.value || '',
            email: document.getElementById('cart-email')?.value || '',
            phone: document.getElementById('cart-phone')?.value || '',
            address: document.getElementById('cart-address')?.value || '',
            city: document.getElementById('cart-city')?.value || '',
            postal: document.getElementById('cart-postal')?.value || '',
            country: document.getElementById('cart-country')?.value || '',
            billingChoice: document.querySelector('input[name="cart_billing_choice"]:checked')?.value || 'same',
            billing_first_name: document.getElementById('cart-billing-first-name')?.value || '',
            billing_last_name: document.getElementById('cart-billing-last-name')?.value || '',
            billing_address: document.getElementById('cart-billing-address')?.value || '',
            billing_city: document.getElementById('cart-billing-city')?.value || '',
            billing_postal: document.getElementById('cart-billing-postal')?.value || '',
            billing_country: document.getElementById('cart-billing-country')?.value || ''
          };
          
          console.log('🔴 PayPal Button - Form Data:', formData);
          
          const result = await _createStandardOrder(cart, formData, currency, 'paypal');
          _lastOrder = { orderRef: result.orderRef, items: cart, formData: formData, totals: result.totals, currency };
          _lastOrder._savedForm = result._formData || formData;
          return result.orderId;
        },
        onApprove: async (data) => {
          try {
            const language = _getActiveLanguage();
            const paypalFallback = {
              amount: _lastOrder?.totals?.total != null ? Number(_lastOrder.totals.total).toFixed(2) : null,
              currency: _lastOrder?.currency || null
            };
            const captureResult = await _captureOrder(data.orderID, _lastOrder?.orderRef || orderRef, language, paypalFallback, _lastOrder?._savedForm || _lastOrder?.formData);
            
            if (captureResult.success && captureResult.customer) {
              localStorage.setItem('webshop_paypal_customer', JSON.stringify(captureResult.customer));
              localStorage.setItem('webshop_paypal_order_id', captureResult.paypalOrderId);
              localStorage.setItem('webshop_paypal_transaction_id', captureResult.transactionId);
              localStorage.setItem('webshop_dor_reference', captureResult.dorReference);
              localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult));
            }
            
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
          localStorage.removeItem('webshop_paypal_customer');
          localStorage.removeItem('webshop_paypal_transaction_id');
          localStorage.removeItem('webshop_dor_reference');
          localStorage.removeItem('webshop_paypal_result');
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