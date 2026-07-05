const CartWorker = (() => {
  const WORKER_URL = 'https://pay.dornori-info.workers.dev';

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

  async function createOrder(items, countryCode, currency, formData) {
    const res = await fetch(`${WORKER_URL}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, countryCode, currency, formData })
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

  return { validateCart, createOrder, captureOrder };
})();
