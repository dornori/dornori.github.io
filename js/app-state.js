/**
 * js/app-state.js
 * Centralized application state management
 * Replaces scattered window.* globals with a single source of truth
 */

/**
 * Global application state object
 * Access: window.AppState or import { AppState } from './app-state.js'
 */
export const AppState = {
  // Configuration loaded from server
  config: {
    basePath: typeof window !== 'undefined' && window.__BASE_PATH__ ? window.__BASE_PATH__ : '/',
    debug: false,
    version: '1.0.0',
  },

  // UI state
  ui: {
    currentLanguage: 'en',
    currentPage: 'home',
    currentTheme: 'default',
    isLoading: false,
    isMobile: false,
    navOpen: false,
  },

  // Data cache
  cache: {
    countries: null,
    products: null,
    profilesData: null,
    shippingData: null,
    geoData: null,
    languages: null,
    countriesLastUpdated: null,
  },

  // Shop state
  shop: {
    isReady: false,
    isInitialized: false,
    cartCount: 0,
    selectedCurrency: 'USD',
    cartItems: [],
  },

  // Translations
  translations: {
    current: {},
    available: []
  },

  // Methods for state management
  methods: {
    /**
     * Update language
     */
    setLanguage: (lang) => {
      AppState.ui.currentLanguage = lang;
      if (typeof window !== 'undefined' && window.__Logger__) {
        window.__Logger__.info('AppState', `Language changed to ${lang}`);
      }
    },

    /**
     * Update current page
     */
    setPage: (page) => {
      AppState.ui.currentPage = page;
    },

    /**
     * Update theme
     */
    setTheme: (theme) => {
      AppState.ui.currentTheme = theme;
    },

    /**
     * Set loading state
     */
    setLoading: (isLoading) => {
      AppState.ui.isLoading = isLoading;
    },

    /**
     * Update cart count
     */
    setCartCount: (count) => {
      AppState.shop.cartCount = Math.max(0, count);
    },

    /**
     * Cache data with TTL
     */
    setCacheData: (key, value, ttlMinutes = 60) => {
      if (!AppState.cache.hasOwnProperty(key)) {
        console.warn(`[AppState] Unknown cache key: ${key}`);
      }
      AppState.cache[key] = value;
      AppState.cache[`${key}LastUpdated`] = Date.now();

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(`dornori-cache-${key}`, JSON.stringify(value));
          localStorage.setItem(`dornori-cache-${key}-ttl`, String(Date.now() + (ttlMinutes * 60 * 1000)));
        } catch (e) {
          console.warn('[AppState] localStorage write failed:', e);
        }
      }
    },

    /**
     * Get cached data
     */
    getCacheData: (key) => {
      return AppState.cache[key] || null;
    },

    /**
     * Clear all cache
     */
    clearCache: () => {
      Object.keys(AppState.cache).forEach(key => {
        AppState.cache[key] = null;
      });
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('dornori-cache-')) {
            localStorage.removeItem(key);
          }
        });
      }
    },

    /**
     * Update translations
     */
    setTranslations: (translations) => {
      AppState.translations.current = translations;
    },

    /**
     * Get translation (helper)
     */
    t: (key, fallback = '') => {
      return AppState.translations.current[key] || fallback;
    },

    /**
     * Merge state updates
     */
    update: (updates) => {
      Object.keys(updates).forEach(section => {
        if (AppState.hasOwnProperty(section) && typeof AppState[section] === 'object') {
          Object.assign(AppState[section], updates[section]);
        }
      });
    },

    /**
     * Reset state to defaults
     */
    reset: () => {
      AppState.ui.currentPage = 'home';
      AppState.ui.isLoading = false;
      AppState.shop.cartCount = 0;
      AppState.clearCache();
    },

    /**
     * Get state snapshot (for debugging)
     */
    getSnapshot: () => {
      return JSON.parse(JSON.stringify({
        ui: AppState.ui,
        shop: AppState.shop,
        config: AppState.config,
        translations: { available: AppState.translations.available }
      }));
    }
  }
};

// Expose globally for backward compatibility
if (typeof window !== 'undefined') {
  window.AppState = AppState;
}

export default AppState;
