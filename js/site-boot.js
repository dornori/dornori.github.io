import { loadScript } from './utils/script-loader.js';
import ENV_CONFIG from './env-config.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => {
    if (ENV_CONFIG.DEBUG) console.warn('SW registration failed:', err);
  });
}

await loadScript('./site-main.js', { type: 'module' });
