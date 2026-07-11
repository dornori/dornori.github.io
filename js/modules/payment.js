// PayPal Payment Adapter - v3
// Renders payment method buttons (Google Pay, Apple Pay, Credit Card, PayPal) at top
// Credit Card shows shipping form + card fields when selected

const _paypal = {
  _loadedCurrency: null,

  async init(targetCurrency) {
    await this._loadScript();
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
      el.innerHTML = `<div style="padding:20px;text-align:center;opacity:.6;">PayPal not available</div>`;
      return;
    }

    el.innerHTML = '';
    const getFormData = _normalizeFormData(formData);
    const uid = 'pf_' + Date.now();

    // ── Render all payment methods ──
    await this._renderPaymentMethods(el, cart, orderRef, getFormData, activeCurrency, onBeforePay, uid);
  },

  async _renderPaymentMethods(el, cart, orderRef, getFormData, currency, onBeforePay, uid) {
    const primaryContainer = document.getElementById('payment-primary-methods');
    const altContainer = document.getElementById('payment-alt-methods');
    const paymentFormSection = document.getElementById('payment-form-section');
    const shippingFormSection = document.getElementById('shipping-form-section');

    if (!primaryContainer) return;

    // Clear containers
    primaryContainer.innerHTML = '';
    altContainer.innerHTML = '';

    // ── Google Pay Button ──
    const googleBtn = document.createElement('button');
    googleBtn.type = 'button';
    googleBtn.className = 'webshop-btn';
    googleBtn.style.cssText = 'width:100%;padding:14px 16px;background:transparent;border:1.5px solid var(--c-border);color:var(--c-text);';
    googleBtn.textContent = 'Google Pay';
    googleBtn.addEventListener('click', () => {
      console.log('Google Pay selected');
      // TODO: Implement Google Pay logic
    });
    primaryContainer.appendChild(googleBtn);

    // ── Apple Pay Button ──
    const appleBtn = document.createElement('button');
    appleBtn.type = 'button';
    appleBtn.className = 'webshop-btn';
    appleBtn.style.cssText = 'width:100%;padding:14px 16px;background:transparent;border:1.5px solid var(--c-border);color:var(--c-text);';
    appleBtn.textContent = 'Apple Pay';
    appleBtn.addEventListener('click', () => {
      console.log('Apple Pay selected');
      // TODO: Implement Apple Pay logic
    });
    primaryContainer.appendChild(appleBtn);

    // ── Credit Card Button ──
    const cardBtn = document.createElement('button');
    cardBtn.type = 'button';
    cardBtn.className = 'webshop-btn webshop-btn--primary';
    cardBtn.style.cssText = 'width:100%;padding:14px 16px;';
    cardBtn.textContent = '💳 Credit Card';
    cardBtn.addEventListener('click', () => {
      shippingFormSection.style.display = 'block';
      paymentFormSection.style.display = 'block';
      primaryContainer.style.display = 'none';
      altContainer.style.display = 'none';
      
      // Initialize card fields if not already done
      this._ensureCardFieldsRendered(paymentFormSection, cart, orderRef, getFormData, currency, onBeforePay, uid);
    });
    primaryContainer.appendChild(cardBtn);

    // ── PayPal Button ──
    const paypalBtnContainer = document.createElement('div');
    paypalBtnContainer.id = 'paypal-btn-container-' + uid;
    primaryContainer.appendChild(paypalBtnContainer);

    // ── Render alternative payment methods (country-dependent) ──
    this._renderAltMethods(altContainer, getFormData);

    // Initialize PayPal buttons
    await this._renderPayPalButtons(paypalBtnContainer, cart, getFormData, currency, orderRef, onBeforePay);
  },

  async _ensureCardFieldsRendered(container, cart, orderRef, getFormData, currency, onBeforePay, uid) {
    // Only render once
    if (container.querySelector('[data-card-fields-rendered]')) return;

    const cardFieldsContainer = document.createElement('div');
    cardFieldsContainer.setAttribute('data-card-fields-rendered', 'true');
    cardFieldsContainer.id = 'credit-card-fields-' + uid;
    cardFieldsContainer.style.marginTop = '24px';

    const shippingForm = document.getElementById('cart-shipping-form');
    if (shippingForm) {
      shippingForm.parentElement.insertBefore(cardFieldsContainer, shippingForm.nextElementSibling);
    } else {
      container.appendChild(cardFieldsContainer);
    }

    // Render card fields
    await this._renderCardFields(cardFieldsContainer, cart, orderRef, getFormData, currency, onBeforePay, uid);
  },

  async _renderCardFields(container, cart, orderRef, getFormData, currency, onBeforePay, uid) {
    if (!window.paypal?.CardFields) {
      let attempts = 0;
      while (!window.paypal?.CardFields && attempts < 20) {
        await new Promise(r => setTimeout(r, 300));
        attempts++;
      }
    }

    if (!window.paypal?.CardFields) {
      container.innerHTML = '<div style="color:var(--c-error);">Card Fields not available</div>';
      return;
    }

    container.innerHTML = `
      <div class="webshop-form-group">
        <label style="font-weight:600;font-size:0.95rem;">Cardholder Name</label>
        <input type="text" id="cardholder-name-${uid}" placeholder="Full name on card" required>
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
      <button id="pay-button-${uid}" type="button" class="webshop-btn webshop-btn--primary" style="width:100%;margin-top:12px;">Pay Now</button>
      <div id="card-error-${uid}" class="webshop-form-error" style="display:none;margin-top:8px;"></div>
    `;

    try {
      const cardFields = await window.paypal.CardFields({
        style: {
          input: {
            'font-size': '15px',
            'font-family': 'system-ui, sans-serif',
            'color': '#1a1714',
            'background-color': 'transparent',
            'padding': '8px 0'
          },
          '.valid': { 'color': '#4a7c59' },
          '.invalid': { 'color': '#9b3a3a' }
        },
        fields: {
          number: { selector: '#card-number-' + uid },
          expirationDate: { selector: '#expiry-field-' + uid },
          cvv: { selector: '#cvv-field-' + uid }
        }
      });

      const numField = await cardFields.NumberField({ placeholder: '4111 1111 1111 1111' });
      const expField = await cardFields.ExpiryField({ placeholder: 'MM/YY' });
      const cvvField = await cardFields.CVVField({ placeholder: '123' });

      await numField.render('#card-number-field-' + uid);
      await expField.render('#expiry-field-' + uid);
      await cvvField.render('#cvv-field-' + uid);

      // Pay button handler
      const payBtn = container.querySelector('#pay-button-' + uid);
      const errorDiv = container.querySelector('#card-error-' + uid);
      const cardholderInput = container.querySelector('#cardholder-name-' + uid);

      payBtn.addEventListener('click', async () => {
        errorDiv.style.display = 'none';
        
        if (!cardholderInput.value.trim()) {
          errorDiv.textContent = 'Please enter cardholder name';
          errorDiv.style.display = 'block';
          return;
        }

        if (onBeforePay) {
          const ok = await onBeforePay();
          if (!ok) return;
        }

        payBtn.disabled = true;
        payBtn.textContent = 'Processing...';

        try {
          await cardFields.submit();
        } catch (err) {
          errorDiv.textContent = err.message || 'Payment failed';
          errorDiv.style.display = 'block';
          payBtn.disabled = false;
          payBtn.textContent = 'Pay Now';
        }
      });
    } catch (e) {
      container.innerHTML = '<div style="color:var(--c-error);">Error loading card fields: ' + e.message + '</div>';
    }
  },

  async _renderPayPalButtons(container, cart, getFormData, currency, orderRef, onBeforePay) {
    if (!window.paypal?.Buttons) return;

    try {
      const buttons = await window.paypal.Buttons({
        createOrder: async () => {
          console.log('Creating PayPal order');
          const formData = getFormData ? getFormData() : {};
          // Return order ID from your backend
          return orderRef || 'ORDER_ID';
        },
        onApprove: async (data) => {
          console.log('PayPal approved:', data);
          // Handle approval
        },
        onError: (err) => {
          console.error('PayPal error:', err);
        }
      });

      buttons.render(container);
    } catch (e) {
      console.error('PayPal buttons error:', e);
    }
  },

  _renderAltMethods(container, getFormData) {
    try {
      const formData = getFormData ? getFormData() : {};
      const country = formData.country || '';

      const altMethods = {
        'DE': [{ name: 'SEPA', label: 'SEPA Direct Debit' }],
        'NL': [{ name: 'iDEAL', label: 'iDEAL' }],
        'BE': [{ name: 'Bancontact', label: 'Bancontact' }],
        'AT': [{ name: 'eps', label: 'eps' }],
        'FR': [{ name: 'Giropay', label: 'Giropay' }],
        'IT': [{ name: 'Sofort', label: 'Sofortüberweisung' }],
        'ES': [{ name: 'Sofort', label: 'Sofortüberweisung' }]
      };

      const methods = altMethods[country] || [];
      if (methods.length === 0) return;

      container.style.display = 'grid';
      methods.forEach(method => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'webshop-btn';
        btn.style.cssText = 'width:100%;padding:14px 16px;background:transparent;border:1.5px solid var(--c-border);color:var(--c-text);';
        btn.textContent = method.label;
        btn.addEventListener('click', () => console.log(method.name + ' selected'));
        container.appendChild(btn);
      });
    } catch (e) {
      console.error('Alt methods error:', e);
    }
  },

  async _loadScript() {
    if (window.paypal) return;
    const script = document.createElement('script');
    script.src = 'https://www.paypal.com/sdk/js?client-id=' + (CONFIG?.payment?.paypal?.clientId || '') + '&components=buttons,card-fields';
    script.async = true;
    document.head.appendChild(script);
  }
};

// Attach to window
window._paypalAdapter = _paypal;
