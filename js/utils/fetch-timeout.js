/**
 * fetch-timeout.js
 * Wrapper around fetch with timeout support using AbortController
 * Prevents indefinite hanging on network requests
 */

export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const err = new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
      err.isTimeout = true;
      throw err;
    }
    throw error;
  }
}

/**
 * Recommended timeouts by request type:
 * - Language files: 8000ms
 * - Product data: 10000ms
 * - Page content: 10000ms
 * - Payment: 30000ms
 */
