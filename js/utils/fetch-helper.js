/**
 * js/utils/fetch-helper.js
 * Safe fetch wrapper with error handling, timeouts, and request cancellation
 * Prevents silent failures and improves error debugging
 */

export class FetchError extends Error {
  constructor(message, statusCode = null, response = null) {
    super(message);
    this.name = 'FetchError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Fetch JSON with proper error handling
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} options.timeout - Request timeout in milliseconds (default: 30000)
 * @param {Function} options.onError - Custom error handler
 * @returns {Promise} - JSON response
 */
export async function fetchJSON(url, options = {}) {
  const {
    timeout = 30000,
    onError = null,
    signal = null,
    ...fetchOptions
  } = options;

  // Create timeout controller if needed
  let controller = signal ? null : new AbortController();
  let timeoutId = null;

  try {
    // Set up timeout
    if (!signal && timeout > 0) {
      timeoutId = setTimeout(() => {
        if (controller) controller.abort();
      }, timeout);
    }

    // Perform fetch
    const finalOptions = {
      ...fetchOptions,
      signal: signal || (controller?.signal)
    };

    const response = await fetch(url, finalOptions);

    // Validate response status
    if (!response.ok) {
      const error = new FetchError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response
      );

      if (onError && typeof onError === 'function') {
        onError(error);
      }

      throw error;
    }

    // Parse JSON
    const data = await response.json();
    return data;
  } catch (error) {
    // Handle abort errors
    if (error.name === 'AbortError') {
      const timeoutError = new FetchError(
        `Request timeout after ${timeout}ms`,
        null,
        null
      );
      timeoutError.name = 'TimeoutError';

      if (onError && typeof onError === 'function') {
        onError(timeoutError);
      }

      throw timeoutError;
    }

    // Re-throw fetch errors
    if (error instanceof FetchError) {
      throw error;
    }

    // Handle network errors
    const networkError = new FetchError(
      `Network error: ${error.message}`,
      null,
      null
    );

    if (onError && typeof onError === 'function') {
      onError(networkError);
    }

    throw networkError;
  } finally {
    // Clean up timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Create an AbortController with timeout
 * @param {number} timeout - Timeout in milliseconds
 * @returns {AbortController}
 */
export function createTimeoutController(timeout = 30000) {
  const controller = new AbortController();
  if (timeout > 0) {
    setTimeout(() => controller.abort(), timeout);
  }
  return controller;
}

/**
 * Fetch with retry logic
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise} - JSON response
 */
export async function fetchJSONWithRetry(url, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchJSON(url, fetchOptions);
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Don't retry on timeout if it's the last attempt
      if (error.name === 'TimeoutError' && attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

export default fetchJSON;
