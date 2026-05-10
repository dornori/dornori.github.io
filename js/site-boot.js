import { loadScript } from './utils/script-loader.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => {
    console.warn('SW registration failed:', err);
  });
}

await loadScript('js/site-main.js', { type: 'module' });