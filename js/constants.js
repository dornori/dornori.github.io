/**
 * constants.js
 * Centralized constants to replace hardcoded magic numbers
 * Single point to adjust timeouts, cache TTL, keys, etc.
 */

export const CACHE_TTL = {
  COUNTRIES: 7 * 24 * 60 * 60 * 1000,  // 7 days
  PRODUCTS: 1 * 24 * 60 * 60 * 1000,   // 1 day
  PAGES: 1 * 60 * 60 * 1000,            // 1 hour
};

export const TIMEOUTS = {
  FETCH_DEFAULT: 10000,      // 10 seconds for most requests
  FETCH_LANGUAGE: 8000,      // 8 seconds for language files
  FETCH_PAYMENT: 30000,      // 30 seconds for payment processing
  FETCH_CONTENT: 10000,      // 10 seconds for page content
  SKELETON_DISPLAY: 4000,    // 4 seconds before removing skeleton screen
};

export const STORAGE_KEYS = {
  LANGUAGE: 'dornori-lang',
  COUNTRIES_CACHE: 'dornori-countries-cache',
  CACHE_TIMESTAMP: 'dornori-cache-timestamp',
  CART: 'dornori-cart',
  CURRENCY: 'dornori-currency',
  SHIPPING: 'dornori-shipping',
};

export const BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 1024,
  DESKTOP: 1440,
};

export const SHOP = {
  GRID_COLUMNS_DESKTOP: 4,
  GRID_COLUMNS_TABLET: 2,
  GRID_COLUMNS_MOBILE: 1,
};

export const DOM_SELECTORS = {
  PAGE_VIEW: '#page-view',
  HOME_VIEW: '#home-view',
  CART_ICON: '.cart-icon-slot',
  PRODUCT_CARD: '.webshop-product-card',
  VARIANT_BTN: '.webshop-variant-btn',
};

export const CURRENCY = {
  DECIMALS: 2,
  MAJOR_UNIT: 100,
};
