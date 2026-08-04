const CartWorker = (() => {
  const WORKER_URL = (typeof CONFIG !== 'undefined' && CONFIG.endpoints && CONFIG.endpoints.payWorker) || '';

  async function validateCart(items, countryCode, currency) {
    const res = await fetch(`${WORKER_URL}/api/validate-cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, countryCode, currency })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Validation failed');
    }
    return res.json();
  }

  async function createOrder(items, countryCode, currency, formData, paymentMethod = 'paypal', cardData = null) {
    const body = { 
      items, 
      countryCode, 
      currency, 
      formData,
      paymentMethod 
    };
    
    if (paymentMethod === 'card' && cardData) {
      body.cardData = cardData;
    }
    
    const res = await fetch(`${WORKER_URL}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Order creation failed');
    }
    return res.json();
  }

  async function captureOrder(orderId) {
    const res = await fetch(`${WORKER_URL}/api/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Capture failed');
    }
    return res.json();
  }

  async function processGooglePay(paymentToken, orderData, orderRef) {
    const res = await fetch(`${WORKER_URL}/api/process-google-pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        paymentToken, 
        orderData,
        orderRef
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Google Pay processing failed');
    }
    return res.json();
  }

  async function processApplePay(paymentData, orderData, orderRef) {
    const res = await fetch(`${WORKER_URL}/api/process-apple-pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        paymentData, 
        orderData,
        orderRef
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Apple Pay processing failed');
    }
    return res.json();
  }

  return { 
    validateCart, 
    createOrder, 
    captureOrder, 
    processGooglePay,
    processApplePay
  };
})();
window.CartWorker = CartWorker;