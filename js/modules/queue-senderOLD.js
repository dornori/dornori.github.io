import ENV_CONFIG from '../env-config.js';

export async function sendToQueue(category, data, isTest = false) {
    const payload = { category, ...data };
    if (isTest) payload.test = true;
    const response = await fetch(ENV_CONFIG.API_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
    });
    await response.text();
    return response.ok;
}