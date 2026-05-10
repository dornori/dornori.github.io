const ENV_CONFIG = {
  API_ENDPOINT: globalThis.__ENV_API_ENDPOINT__ || 'https://edge-form-handler-api.dornori-info.workers.dev',
  GEO_API: globalThis.__ENV_GEO_API__ || 'https://ipapi.co/json/',
  ROOT_URL: globalThis.__ENV_ROOT_URL__ || 'https://dornori.com',
  TURNSTILE_KEY: globalThis.__ENV_TURNSTILE_KEY__ || '0x4AAAAAACxsga5y-bJ_qkzC',
  PAYPAL_CLIENT_ID: globalThis.__ENV_PAYPAL_CLIENT_ID__ || '',
  STRIPE_KEY: globalThis.__ENV_STRIPE_KEY__ || 'pk_test_SAMPLE_STRIPE_PUBLISHABLE_KEY',
  DEBUG: globalThis.__ENV_DEBUG__ || false,
};
export default ENV_CONFIG;