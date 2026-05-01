/**
 * queue-sender.js  –  js/modules/queue-sender.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for posting to the Dornori edge email-queue API.
 * All other form modules import from here — nothing else calls the API directly.
 *
 * @param {string}  category  e.g. "newsletter" | "ticket" | "order-pre-payment" | "order-post-payment"
 * @param {object}  data      Any fields: { email, name, message, order_ref, … }
 * @param {boolean} [isTest]  If true, bypasses rate limit and sends instantly
 * @returns {Promise<{status:string}|{error:string}>}
 */

const API_URL = 'https://edge-form-handler-api.dornori-info.workers.dev';

export async function sendToQueue(category, data, isTest = false) {
    const payload = { category, ...data };
    if (isTest) payload.test = true;
    const response = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
    });
    return response.json();
}

export default sendToQueue;
