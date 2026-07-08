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
        `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${targetCurrency}&intent=${intent || "capture"}&components=buttons,card-fields`
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

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'max-width:480px;margin:0 auto;background:var(--c-surface);padding:24px;border-radius:var(--radius,8px);border:1px solid var(--c-border);';
      el.appendChild(wrapper);

      // Tabs
      const tabs = document.createElement('div');
      tabs.style.cssText = 'display:flex;gap:0;border-bottom:1px solid var(--c-border);margin-bottom:16px;';
      tabs.innerHTML = `
        <button class="paypal-tab-btn" data-tab="paypal" style="flex:1;padding:10px 16px;background:none;border:none;border-bottom:2px solid var(--c-accent);cursor:pointer;font-weight:600;color:var(--c-text);font-size:0.85rem;">PayPal</button>
        <button class="paypal-tab-btn" data-tab="card" style="flex:1;padding:10px 16px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-weight:400;color:var(--c-text-3);font-size:0.85rem;">Credit Card</button>
      `;
      wrapper.appendChild(tabs);

      // PayPal container
      const paypalContainer = document.createElement('div');
      paypalContainer.id = 'paypal-login-container';
      paypalContainer.style.cssText = 'min-height:120px;';
      wrapper.appendChild(paypalContainer);

      // Card container
      const cardContainer = document.createElement('div');
      cardContainer.id = 'paypal-card-container';
      cardContainer.style.cssText = 'display:none;min-height:200px;';
      wrapper.appendChild(cardContainer);

      // Tab switching
      tabs.querySelectorAll('.paypal-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          tabs.querySelectorAll('.paypal-tab-btn').forEach(b => {
            b.style.borderBottom = '2px solid transparent';
            b.style.fontWeight = '400';
            b.style.color = 'var(--c-text-3)';
          });
          this.style.borderBottom = '2px solid var(--c-accent)';
          this.style.fontWeight = '600';
          this.style.color = 'var(--c-text)';
          
          const tab = this.dataset.tab;
          if (tab === 'paypal') {
            paypalContainer.style.display = 'block';
            cardContainer.style.display = 'none';
          } else {
            paypalContainer.style.display = 'none';
            cardContainer.style.display = 'block';
          }
        });
      });

      // Render PayPal button
      await window.paypal.Buttons({
        style: { layout: "vertical", color: "black", shape: "rect", label: "pay", height: 48 },
        createOrder: async (data, actions) => {
          try {
            const workerRes = await fetch('https://pay.dornori-info.workers.dev/api/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: cart,
                countryCode: formData?.country || 'US',
                currency: activeCurrency,
                formData: formData,
                paymentMethod: 'paypal'
              })
            });
            
            if (!workerRes.ok) {
              const err = await workerRes.json();
              throw new Error(err.error || 'Order creation failed');
            }

            const result = await workerRes.json();
            
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
            localStorage.setItem('webshop_paypal_result', JSON.stringify(captureResult.paypalData));
            _dispatch("payment:success", { orderRef, processor: "paypal", result: captureResult });
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
      }).render(paypalContainer);

      // Render card fields
      await this._renderCardFields(cardContainer, cart, totals, orderRef, formData, activeCurrency);

      return wrapper;
    },

    async _renderCardFields(container, cart, totals, orderRef, formData, currency) {
      if (!window.paypal) return;

      const fieldsHtml = `
        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:0.78rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--c-text-3);margin-bottom:4px;">Card Number</label>
          <div id="card-number-field" style="border:1.5px solid var(--c-border);border-radius:var(--radius);padding:8px 12px;background:var(--c-surface);"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--c-text-3);margin-bottom:4px;">Expiration</label>
            <div id="expiry-field" style="border:1.5px solid var(--c-border);border-radius:var(--radius);padding:8px 12px;background:var(--c-surface);"></div>
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--c-text-3);margin-bottom:4px;">CVV</label>
            <div id="cvv-field" style="border:1.5px solid var(--c-border);border-radius:var(--radius);padding:8px 12px;background:var(--c-surface);"></div>
          </div>
        </div>
        <button id="paypal-card-submit" style="width:100%;padding:14px;background:var(--c-btn-bg);color:var(--c-btn-text);border:none;border-radius:var(--radius);font-size:1rem;font-weight:600;cursor:pointer;transition:all var(--transition);">Pay Now</button>
        <div id="card-error-message" style="color:var(--c-error);font-size:0.82rem;margin-top:8px;display:none;"></div>
      `;
      container.innerHTML = fieldsHtml;

      try {
        const cardFields = window.paypal.CardFields ? await window.paypal.CardFields({
          style: {
            input: {
              'font-size': '16px',
              'font-family': 'system-ui, sans-serif',
              'color': '#1a1714',
            }
          }
        }) : null;

        if (cardFields) {
          const cardNumberField = cardFields.NumberField({ 
            placeholder: '1234 5678 9012 3456',
            style: { input: { 'font-size': '16px' } }
          });
          cardNumberField.render('#card-number-field');

          const expiryField = cardFields.ExpiryField({ 
            placeholder: 'MM/YY',
            style: { input: { 'font-size': '16px' } }
          });
          expiryField.render('#expiry-field');

          const cvvField = cardFields.CVVField({ 
            placeholder: '123',
            style: { input: { 'font-size': '16px' } }
          });
          cvvField.render('#cvv-field');
        }

        const submitBtn = container.querySelector('#paypal-card-submit');
        const errorMsg = container.querySelector('#card-error-message');

        submitBtn.addEventListener('click', async function() {
          errorMsg.style.display = 'none';
          submitBtn.disabled = true;
          submitBtn.textContent = 'Processing...';

          try {
            const cardNumber = document.querySelector('#card-number-field iframe')?.contentDocument?.querySelector('input')?.value || '';
            const expiry = document.querySelector('#expiry-field iframe')?.contentDocument?.querySelector('input')?.value || '';
            const cvv = document.querySelector('#cvv-field iframe')?.contentDocument?.querySelector('input')?.value || '';

            const res = await fetch('https://pay.dornori-info.workers.dev/api/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: cart,
                countryCode: formData?.country || 'US',
                currency: currency,
                formData: formData,
                paymentMethod: 'card',
                cardData: {
                  number: cardNumber.replace(/\s/g, ''),
                  expiry: expiry,
                  cvv: cvv
                }
              })
            });

            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Payment failed');
            }

            const result = await res.json();
            
            if (result.orderId) {
              const captureRes = await fetch('https://pay.dornori-info.workers.dev/api/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: result.orderId })
              });

              if (!captureRes.ok) {
                const err = await captureRes.json();
                throw new Error(err.error || 'Capture failed');
              }

              const captureResult = await captureRes.json();
              localStorage.setItem('webshop_order_ref', result.orderRef);
              localStorage.setItem('webshop_paypal_order_id', result.orderId);
              localStorage.setItem('webshop_order_snapshot', JSON.stringify({
                items: cart,
                formData: formData,
                totals: totals
              }));
              _dispatch("payment:success", { orderRef: result.orderRef, processor: "card", result: captureResult });
            }
          } catch (err) {
            console.error('Card payment error:', err);
            errorMsg.textContent = err.message || 'Payment failed. Please try again.';
            errorMsg.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Pay Now';
          }
        });
      } catch (e) {
        console.warn('Card fields not supported:', e);
        container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--c-text-3);font-size:0.85rem;">Card payments not available. Please use PayPal.</div>`;
      }
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

  // Google Pay
  async function initGooglePay(cart, formData) {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.payments || !google.payments.api) {
        const script = document.createElement('script');
        script.src = 'https://pay.google.com/gp/p/js/pay.js';
        script.onload = () => {
          try {
            const result = _createGooglePayClient(cart, formData);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        };
        script.onerror = () => reject(new Error('Failed to load Google Pay'));
        document.head.appendChild(script);
      } else {
        try {
          const result = _createGooglePayClient(cart, formData);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  function _createGooglePayClient(cart, formData) {
    const paymentsClient = new google.payments.api.PaymentsClient({
      environment: window.CONFIG?.payment?.googlePay?.environment || 'TEST'
    });

    const currency = (typeof Currency !== 'undefined' && Currency.getActive) ? Currency.getActive() : 'EUR';
    const t = typeof Shop !== 'undefined' ? Shop.calculateTotals(cart, false, formData?.country) : { total: 0 };

    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA']
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            'gateway': 'paypal',
            'gatewayMerchantId': window.CONFIG?.payment?.paypal?.clientId || ''
          }
        }
      }],
      merchantInfo: {
        merchantId: window.CONFIG?.payment?.googlePay?.merchantId || 'BCR2DN4TQIZPLAVW',
        merchantName: window.CONFIG?.payment?.googlePay?.merchantName || 'Dornori'
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: (t.total || 0).toFixed(2),
        currencyCode: currency,
        countryCode: formData?.country || 'NL'
      }
    };

    return { paymentsClient, paymentDataRequest };
  }

  function isApplePayAvailable() {
    return typeof window.ApplePaySession !== 'undefined' && 
           ApplePaySession.canMakePayments();
  }

  return { 
    init, 
    render, 
    switchProcessor, 
    getActive: () => CONFIG.payment.activeProcessor, 
    adapters: _adapters,
    initGooglePay,
    isApplePayAvailable
  };
})();
window.Payment = Payment;