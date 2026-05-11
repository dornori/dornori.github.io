import { loadScript } from './utils/script-loader.js';
import ENV_CONFIG from './env-config.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => {
    if (ENV_CONFIG.DEBUG) console.warn('SW registration failed:', err);
  });
}

// Determine correct path to site-main.js - works from root or subdirectories
const path = window.location.pathname;
const parts = path.split('/').filter(p => p);
const isSubdirectory = parts.length > 0 && ['en', 'de', 'nl', 'no', 'fr', 'es', 'it', 'pt', 'cs'].includes(parts[0]);
const siteMainPath = isSubdirectory ? '../js/site-main.js' : 'js/site-main.js';

await loadScript(siteMainPath, { type: 'module' });
