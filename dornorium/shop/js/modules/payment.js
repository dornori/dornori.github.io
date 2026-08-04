/* =========================================================
   PAYMENT MODULE  –  payment.js  (FIXED - Worker Validation)
   =========================================================
   FIX: Validates cart with worker BEFORE creating order
   This ensures frontend prices match worker prices exactly
   ========================================================= */

const Payment = (() => {
  let _ready = false;
  let _cardFieldsInstance = null;

  const WORKER = CONFIG.endpoints.payWorker;

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

  function _convert(amount) {
    return (typeof Currency !== 'undefined' && Currency.convert) ? Currency.convert(amount) : amount;
  }

  function _convertRounded(amount) {
    return (typeof Currency !== 'undefined' && Currency.convertRounded) ? Currency.convertRounded(amount) : Math.ceil(amount);
  }

  function _getActiveLanguage() {
    return (typeof window !== 'undefined' && window.LANG) || 
           localStorage.getItem('app-lang') || 
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

  /* ═══════════════════════════════════════════════════════
     FIX: VALIDATE CART WITH WORKER BEFORE CREATING ORDER
     This ensures frontend prices match worker prices
  ═══════════════════════════════════════════════════════ */
  async function _validateWithWorker(cart, countryCode, currency) {
    const payload = { 
      items: cart.map(item => ({ 
        id: item.id, 
        qty: item.qty,
      })), 
      countryCode: countryCode || 'US', 
      currency: currency 
    };
    console.log('[WORKER VALIDATION] Payload:', payload);
    const url = `${WORKER}/api/validate-cart`;
    console.log('[WORKER VALIDATION] Calling:', url);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('[WORKER VALIDATION] Response status:', res.status);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[WORKER VALIDATION ERROR] Response:', err);
        throw new Error(err.error || `HTTP ${res.status}: Validation failed`);
      }
      const result = await res.json();
      console.log('[WORKER VALIDATION] Success:', result);
      return result;
    } catch (e) {
      console.error('[WORKER VALIDATION CATCH] Error:', e.message);
      throw e;
    }
  }

  /* ═══════════════════════════════════════════════════════
     FIX: CREATE ORDER WITH VALIDATED CART
  ═══════════════════════════════════════════════════════ */
  async function _createStandardOrder(cart, formData, currency, paymentMethod) {
    const cleanFormData = _collectFormData(formData);
    const countryCode = cleanFormData.country || 'US';
    
    // STEP 1: Validate cart with worker to get CORRECT prices
    console.log('🔵 Validating cart with worker...');
    const validation = await _validateWithWorker(cart, countryCode, currency);
    
    if (!validation.success) {
      throw new Error(validation.error || 'Cart validation failed');
    }
    
    console.log('🟢 Worker validation result:', validation);
    
    // STEP 2: Build validated cart with worker's prices
    const validatedCart = cart.map(item => {
      const validated = validation.items.find(v => v.id === item.id);
      if (validated) {
        return {
          ...item,
          price: validated.price,              // ← WORKER'S PRICE
          unitPriceOriginal: validated.unitPriceOriginal || validated.price,
          originalPrice: validated.originalPrice || null,
          discount: validated.discount || 0,
          _workerValidated: true
        };
      }
      // Fallback: keep original price if not found
      console.warn('⚠️ Product not found in validation:', item.id);
      return item;
    });
    
    // STEP 3: Store validated totals for later use
    const validatedTotals = {
      subtotal: validation.subtotal,
      itemTotal: validation.itemTotal,
      totalDiscount: validation.totalDiscount,
      shipping: validation.shipping,
      tax: validation.tax,
      total: validation.total,
      currency: validation.currencyInfo?.code || currency,
      decimals: validation.currencyInfo?.decimals || 2,
      items: validation.items,
      isFreeShipping: validation.isFreeShipping || false,
      totalWeight: validation.totalWeight || 0
    };
    
    // STEP 4: Create order with validated cart
    const res = await fetch(`${WORKER}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: validatedCart,
        countryCode: countryCode,
        currency: currency,
        formData: cleanFormData,
        paymentMethod: paymentMethod || 'paypal',
        // Pass validated totals to avoid recalculation
        _validatedTotals: validatedTotals
      })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Order creation failed');
    }
    
    const result = await res.json();
    
    // Store validated totals with order
    result._validatedTotals = validatedTotals;
    result._formData = cleanFormData;
    
    localStorage.setItem('webshop_order_ref', result.orderRef);
    localStorage.setItem('webshop_paypal_order_id', result.orderId);
    localStorage.setItem('webshop_order_snapshot', JSON.stringify({
      items: validatedCart,
      formData: cleanFormData,
      totals: validatedTotals,
      currency: currency
    }));
    
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

  /* ═══════════════════════════════════════════════════════
     GOOGLE PAY - with worker validation
  ═══════════════════════════════════════════════════════ */
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
        const paymentsClient = new google.payments.api.PaymentsClient({
          environment: gpayConfig.environment || 'TEST',
          paymentDataCallbacks: {
            onPaymentDataChanged: function(intermediatePaymentData) {
              return new Promise(function(resolve) {
                const selectedCountry = intermediatePaymentData.shippingAddress?.countryCode || null;
                const liveTotals = (typeof Shop !== 'undefined') ? Shop.calculateTotals(cart, false, selectedCountry) : null;
                const liveSubtotal = liveTotals ? liveTotals.subtotal : _convertRounded(cart.reduce((s, i) => s + (parseFloat(i.price) || 0) * i.qty, 0));
                const liveShipping = liveTotals ? (liveTotals.isFreeShipping ? 0 : liveTotals.shipping) : 0;
                const liveTax = liveTotals ? liveTotals.tax : 0;
                const liveTotal = liveSubtotal + liveShipping + liveTax;
                resolve({
                  newTransactionInfo: {
                    totalPriceStatus: 'FINAL',
                    totalPrice: liveTotal.toFixed(2),
                    totalPriceLabel: 'Total',
                    displayItems: [
                      { label: 'Subtotal', type: 'SUBTOTAL', price: liveSubtotal.toFixed(0) },
                      { label: 'Shipping', type: 'LINE_ITEM', price: liveShipping.toFixed(0) },
                      { label: 'Tax', type: 'TAX', price: liveTax.toFixed(2) }
                    ],
                    currencyCode: _getActiveCurrency(),
                    countryCode: selectedCountry || (gpayConfig.countryCode || 'NL')
                  }
                });
              });
            }
          }
        });

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
              
              const localTotals = (typeof Shop !== 'undefined') ? Shop.calculateTotals(cart, false, null) : null;
              const rawSubtotal = localTotals ? localTotals.subtotal : _convertRounded(cart.reduce((s, i) => s + (parseFloat(i.price) || 0) * i.qty, 0));
              const rawShipping = localTotals ? (localTotals.isFreeShipping ? 0 : localTotals.shipping) : 0;
              const rawTax = localTotals ? localTotals.tax : 0;

              const subtotal = rawSubtotal;
              const shipping = rawShipping;
              const tax = rawTax;
              const displayTotal = subtotal + shipping + tax;

              const displayItems = [
                { label: 'Subtotal', type: 'SUBTOTAL', price: subtotal.toFixed(0) },
                { label: 'Shipping', type: 'LINE_ITEM', price: shipping.toFixed(0) },
                { label: 'Tax', type: 'TAX', price: tax.toFixed(2) }
              ];

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
                callbackIntents: ['SHIPPING_ADDRESS'],
                transactionInfo: {
                  totalPriceStatus: 'FINAL',
                  totalPrice: displayTotal.toFixed(2),
                  totalPriceLabel: 'Total',
                  displayItems: displayItems,
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

              const gpayCountry = gpayAddr.countryCode || null;
              const liveTotals = (typeof Shop !== 'undefined') ? Shop.calculateTotals(cart, false, gpayCountry) : localTotals;
              const liveSubtotal = liveTotals ? liveTotals.subtotal : rawSubtotal;
              const liveShipping = liveTotals ? (liveTotals.isFreeShipping ? 0 : liveTotals.shipping) : rawShipping;
              const liveTax = liveTotals ? liveTotals.tax : rawTax;

              // FIX: Use validated cart
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

              // Use validated totals from order creation
              const validatedTotals = realOrder._validatedTotals || realOrder.totals;
              const gpayFallback = {
                email: gpayEmail,
                phone: gpayPhone,
                amount: validatedTotals?.total != null ? Number(validatedTotals.total).toFixed(2) : null,
                itemTotal: validatedTotals?.itemTotal != null ? Number(validatedTotals.itemTotal).toFixed(2) : null,
                discount: validatedTotals?.totalDiscount != null ? Number(validatedTotals.totalDiscount).toFixed(2) : null,
                subtotal: validatedTotals?.subtotal != null ? Number(validatedTotals.subtotal).toFixed(2) : null,
                shipping: validatedTotals?.shipping != null ? Number(validatedTotals.shipping).toFixed(2) : null,
                tax: validatedTotals?.tax != null ? Number(validatedTotals.tax).toFixed(2) : null,
                currency: currency
              };

              const captureResult = await _captureOrder(realOrder.orderId, realOrder.orderRef, language, gpayFallback, realOrder._formData);
              
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
                result: captureResult,
                totals: validatedTotals  // ← PASS WORKER'S TOTALS
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

  /* ═══════════════════════════════════════════════════════
     APPLE PAY - with worker validation
  ═══════════════════════════════════════════════════════ */
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
          
          const localTotals = (typeof Shop !== 'undefined') ? Shop.calculateTotals(cart, false, null) : null;
          const rawSubtotal = localTotals ? localTotals.subtotal : _convertRounded(cart.reduce((s, i) => s + (parseFloat(i.price) || 0) * i.qty, 0));
          const rawShipping = localTotals ? (localTotals.isFreeShipping ? 0 : localTotals.shipping) : 0;
          const rawTax = localTotals ? localTotals.tax : 0;

          const subtotal = rawSubtotal;
          const shipping = rawShipping;
          const tax = rawTax;
          const displayTotal = subtotal + shipping + tax;

          const buildLineItems = (sub, ship, tx) => [
            { label: 'Subtotal', amount: sub.toFixed(0) },
            { label: 'Shipping', amount: ship.toFixed(0) },
            { label: 'Tax', amount: tx.toFixed(2) }
          ];

          const paymentRequest = {
            countryCode: config.countryCode || 'NL',
            currencyCode: currency,
            merchantCapabilities: config.merchantCapabilities || ['supports3DS'],
            supportedNetworks: config.supportedNetworks || ['visa', 'masterCard', 'amex', 'discover'],
            requiredBillingContactFields: ['postalAddress', 'name', 'email', 'phone'],
            requiredShippingContactFields: ['postalAddress', 'name', 'email', 'phone'],
            lineItems: buildLineItems(subtotal, shipping, tax),
            total: { label: 'Dornori', amount: displayTotal.toFixed(2) }
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
            const country = event.shippingContact?.countryCode || null;
            const liveTotals = (typeof Shop !== 'undefined') ? Shop.calculateTotals(cart, false, country) : localTotals;
            const liveSubtotal = liveTotals ? liveTotals.subtotal : rawSubtotal;
            const liveShipping = liveTotals ? (liveTotals.isFreeShipping ? 0 : liveTotals.shipping) : rawShipping;
            const liveTax = liveTotals ? liveTotals.tax : rawTax;
            const liveTotal = liveSubtotal + liveShipping + liveTax;

            session.completeShippingContactSelection(
              ApplePaySession.STATUS_SUCCESS,
              [],
              { label: 'Dornori', amount: liveTotal.toFixed(2) },
              buildLineItems(liveSubtotal, liveShipping, liveTax)
            );
          };

          session.onpaymentauthorized = async (event) => {
            try {
              const billing = event.payment.billingContact || {};
              const shipping = event.payment.shippingContact || {};
              const apayEmail = billing.emailAddress || shipping.emailAddress || '';
              const apayPhone = billing.phoneNumber || shipping.phoneNumber || '';

              // FIX: Use validated cart
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
                const validatedTotals = realOrder._validatedTotals || realOrder.totals;
                const apayFallback = {
                  email: apayEmail || null,
                  phone: apayPhone || null,
                  amount: validatedTotals?.total != null ? Number(validatedTotals.total).toFixed(2) : null,
                  itemTotal: validatedTotals?.itemTotal != null ? Number(validatedTotals.itemTotal).toFixed(2) : null,
                  discount: validatedTotals?.totalDiscount != null ? Number(validatedTotals.totalDiscount).toFixed(2) : null,
                  subtotal: validatedTotals?.subtotal != null ? Number(validatedTotals.subtotal).toFixed(2) : null,
                  shipping: validatedTotals?.shipping != null ? Number(validatedTotals.shipping).toFixed(2) : null,
                  tax: validatedTotals?.tax != null ? Number(validatedTotals.tax).toFixed(2) : null,
                  currency: currency
                };
                const captureResult = await _captureOrder(realOrder.orderId, realOrder.orderRef, language, apayFallback, realOrder._formData);
                
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
                  result: captureResult,
                  totals: validatedTotals  // ← PASS WORKER'S TOTALS
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

  /* ═══════════════════════════════════════════════════════
     PAYPAL - with worker validation
  ═══════════════════════════════════════════════════════ */
  const _paypal = {
    _loadedCurrency: null,

    async init(forceCurrency) {
      const { clientId, intent } = CONFIG.payment.paypal;
      console.log('[PayPal INIT] clientId:', clientId ? 'exists' : 'MISSING', 'intent:', intent);
      if (!clientId) {
        console.error('[PayPal INIT ERROR] No clientId in CONFIG.payment.paypal');
        return;
      }
      const targetCurrency = forceCurrency || _getActiveCurrency();
      if (window.paypal && this._loadedCurrency === targetCurrency) {
        console.log('[PayPal INIT] Already loaded for', targetCurrency);
        return;
      }

      document.querySelectorAll('script[src*="paypal.com/sdk/js"]').forEach(s => s.remove());
      delete window.paypal;

      const sdkUrl = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${targetCurrency}&intent=${intent || "capture"}&components=buttons,card-fields,googlepay,applepay`;
      console.log('[PayPal INIT] Loading SDK from:', sdkUrl);
      await _loadScript(sdkUrl);

      this._loadedCurrency = targetCurrency;

      return new Promise((resolve) => {
        let attempts = 0;
        const checkPayPal = () => {
          attempts++;
          if (window.paypal) {
            console.log('[PayPal INIT] SDK loaded successfully');
            resolve();
          } else if (attempts > 50) {
            console.error('[PayPal INIT] Timeout waiting for window.paypal');
            resolve();
          } else {
            setTimeout(checkPayPal, 200);
          }
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

      const paymentBox = document.createElement('div');
      paymentBox.className = 'payment-card-box';
      el.appendChild(paymentBox);

      const cardSection = document.createElement('div');
      cardSection.id = 'paypal-card-section';
      cardSection.className = 'paypal-card-section';
      
      cardSection.innerHTML = `
        <div class="webshop-form-group">
          <label style="font-weight:600;font-size:0.95rem;">Cardholder Name</label>
          <input type="text" id="cardholder-name-${uid}" name="cardholderName" placeholder="Full name on card" required>
        </div>
        <div style="margin-top:16px;">
          <label style="font-weight:600;font-size:0.95rem;margin-bottom:8px;display:block;">Card Number</label>
          <div class="card-fields-box">
            <div id="card-number-field-${uid}" class="paypal-hosted-field"></div>
            <div class="card-fields-divider-h"></div>
            <div class="card-fields-row">
              <div style="flex:1;">
                <label style="font-size:0.85rem;color:var(--c-text-2);display:block;margin-bottom:6px;">Expiry Date</label>
                <div id="expiry-field-${uid}" class="paypal-hosted-field"></div>
              </div>
              <div class="card-fields-divider-v"></div>
              <div style="flex:1;">
                <label style="font-size:0.85rem;color:var(--c-text-2);display:block;margin-bottom:6px;">CVC</label>
                <div id="cvv-field-${uid}" class="paypal-hosted-field"></div>
              </div>
            </div>
          </div>
        </div>
        <button id="paypal-card-submit-${uid}" type="button" class="webshop-btn webshop-btn--primary" style="width:100%;margin-top:12px;">
          Pay Now
        </button>
        <div id="card-error-message-${uid}" class="webshop-form-error" style="display:none;margin-top:8px;"></div>
      `;
      
      paymentBox.appendChild(cardSection);

      await this._renderCardFields(cardSection, cart, orderRef, getFormData, activeCurrency, onBeforePay, el, myToken, uid);

      return el;
    },

    async renderButtonOnly(cart, orderRef, el, formData, onBeforePay) {
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

      await this._renderPayPalButton(el, cart, getFormData, activeCurrency, orderRef, onBeforePay, el, myToken);

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
              'padding': '8px 0'
            },
            '.valid': { 
              'color': '#4a7c59'
            },
            '.invalid': { 
              'color': '#9b3a3a'
            }
          },
          createOrder: async () => {
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
            
            // FIX: Use validated cart
            const result = await _createStandardOrder(cart, formData, currency, 'card');
            _lastOrder = { orderRef: result.orderRef, items: cart, formData: formData, totals: result.totals, currency };
            _lastOrder._savedForm = result._formData || formData;
            _lastOrder._validatedTotals = result._validatedTotals || result.totals;
            return result.orderId;
          },
          onApprove: async (data) => {
            const submitBtn = container.querySelector('#paypal-card-submit-' + uid);
            try {
              const language = _getActiveLanguage();
              const validatedTotals = _lastOrder?._validatedTotals || _lastOrder?.totals;
              const cardFallback = {
                amount: validatedTotals?.total != null ? Number(validatedTotals.total).toFixed(2) : null,
                itemTotal: validatedTotals?.itemTotal != null ? Number(validatedTotals.itemTotal).toFixed(2) : null,
                discount: validatedTotals?.totalDiscount != null ? Number(validatedTotals.totalDiscount).toFixed(2) : null,
                subtotal: validatedTotals?.subtotal != null ? Number(validatedTotals.subtotal).toFixed(2) : null,
                shipping: validatedTotals?.shipping != null ? Number(validatedTotals.shipping).toFixed(2) : null,
                tax: validatedTotals?.tax != null ? Number(validatedTotals.tax).toFixed(2) : null,
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
                result: captureResult,
                totals: validatedTotals  // ← PASS WORKER'S TOTALS
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
          const cardholderInput = container.querySelector('#cardholder-name-' + uid);
          if (!cardholderInput || !cardholderInput.value.trim()) {
            errorMsg.textContent = 'Please enter the cardholder name.';
            errorMsg.style.display = 'block';
            return;
          }
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
          height: 46
        },
        onClick: async (data, actions) => {
          if (onBeforePay) {
            const ok = await onBeforePay();
            if (!ok) return actions.reject();
          }
          return actions.resolve();
        },
        createOrder: async () => {
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
          
          // FIX: Use validated cart
          const result = await _createStandardOrder(cart, formData, currency, 'paypal');
          _lastOrder = { orderRef: result.orderRef, items: cart, formData: formData, totals: result.totals, currency };
          _lastOrder._savedForm = result._formData || formData;
          _lastOrder._validatedTotals = result._validatedTotals || result.totals;
          return result.orderId;
        },
        onApprove: async (data) => {
          try {
            const language = _getActiveLanguage();
            const validatedTotals = _lastOrder?._validatedTotals || _lastOrder?.totals;
            const paypalFallback = {
              amount: validatedTotals?.total != null ? Number(validatedTotals.total).toFixed(2) : null,
              itemTotal: validatedTotals?.itemTotal != null ? Number(validatedTotals.itemTotal).toFixed(2) : null,
              discount: validatedTotals?.totalDiscount != null ? Number(validatedTotals.totalDiscount).toFixed(2) : null,
              subtotal: validatedTotals?.subtotal != null ? Number(validatedTotals.subtotal).toFixed(2) : null,
              shipping: validatedTotals?.shipping != null ? Number(validatedTotals.shipping).toFixed(2) : null,
              tax: validatedTotals?.tax != null ? Number(validatedTotals.tax).toFixed(2) : null,
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
              result: captureResult,
              totals: validatedTotals  // ← PASS WORKER'S TOTALS
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

  async function renderPayPalButton(cart, orderRef, mountEl, formData, onBeforePay) {
    const el = typeof mountEl === "string" ? document.querySelector(mountEl) : mountEl;
    console.log('[PayPal DEBUG] Mounting button. El:', el, 'Cart:', cart, 'OrderRef:', orderRef);
    if (!el) {
      console.error('[PayPal ERROR] No element found for mounting');
      return;
    }
    if (!window.paypal) console.warn('[PayPal WARN] window.paypal not loaded yet');
    if (!_paypal._loadedCurrency) {
      console.log('[PayPal DEBUG] Initializing PayPal with currency:', _getActiveCurrency());
      await _paypal.init(_getActiveCurrency());
    }
    console.log('[PayPal DEBUG] About to call renderButtonOnly');
    await _paypal.renderButtonOnly(cart, orderRef, el, formData, onBeforePay);
    console.log('[PayPal DEBUG] renderButtonOnly completed');
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
    renderPayPalButton,
    switchProcessor,
    getActive: () => CONFIG.payment.activeProcessor,
    adapters: _adapters,
    renderGooglePay,
    renderApplePay,
    isApplePayAvailable
  };
})();
window.Payment = Payment;