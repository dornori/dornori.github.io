import ENV_CONFIG from './env-config.js';
import { sendToQueue } from './modules/queue-sender.js';

const CONFIG = {
  shopName: "Dornori",
  tagline:  "Curated lighting for modern spaces",
  
  queue: {
    endpoint: ENV_CONFIG.API_ENDPOINT,
  },
  
  turnstile: {
    sitekey: ENV_CONFIG.TURNSTILE_KEY,
  },
  
  payment: {
    activeProcessor: "paypal",
    paypal: {
      clientId: ENV_CONFIG.PAYPAL_CLIENT_ID,
      currency: "USD",
      intent: "capture",
    },
    stripe: {
      publishableKey: ENV_CONFIG.STRIPE_KEY,
      intentEndpoint: "",
    },
  },
};

window.CONFIG = CONFIG;
window.sendToQueue = sendToQueue;
export default CONFIG;
export { sendToQueue };