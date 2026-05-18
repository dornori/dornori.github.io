/**
 * js/utils/event-manager.js
 * Manages event listeners to prevent memory leaks in SPA
 * Automatically cleans up listeners when pages change
 */

export class EventManager {
  constructor() {
    this.listeners = [];
    this.documentListeners = [];
    this.windowListeners = [];
  }

  /**
   * Add listener to specific element
   * @param {Element} element - DOM element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {object} options - addEventListener options
   */
  on(element, event, handler, options = false) {
    if (!element) return;

    element.addEventListener(event, handler, options);
    this.listeners.push({
      element,
      event,
      handler,
      options
    });
  }

  /**
   * Add listener to document
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {object} options - addEventListener options
   */
  onDocument(event, handler, options = false) {
    document.addEventListener(event, handler, options);
    this.documentListeners.push({
      event,
      handler,
      options
    });
  }

  /**
   * Add listener to window
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {object} options - addEventListener options
   */
  onWindow(event, handler, options = false) {
    window.addEventListener(event, handler, options);
    this.windowListeners.push({
      event,
      handler,
      options
    });
  }

  /**
   * Remove specific listener
   * @param {Element} element - DOM element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(element, event, handler) {
    if (!element) return;

    element.removeEventListener(event, handler);
    this.listeners = this.listeners.filter(
      l => !(l.element === element && l.event === event && l.handler === handler)
    );
  }

  /**
   * Remove all registered listeners
   * Call this when switching pages to prevent memory leaks
   */
  cleanup() {
    // Remove element listeners
    this.listeners.forEach(({ element, event, handler, options }) => {
      if (element && typeof element.removeEventListener === 'function') {
        element.removeEventListener(event, handler, options);
      }
    });
    this.listeners = [];

    // Remove document listeners
    this.documentListeners.forEach(({ event, handler, options }) => {
      document.removeEventListener(event, handler, options);
    });
    this.documentListeners = [];

    // Remove window listeners
    this.windowListeners.forEach(({ event, handler, options }) => {
      window.removeEventListener(event, handler, options);
    });
    this.windowListeners = [];
  }

  /**
   * Get count of active listeners (for debugging)
   */
  getCount() {
    return {
      elements: this.listeners.length,
      document: this.documentListeners.length,
      window: this.windowListeners.length,
      total: this.listeners.length + this.documentListeners.length + this.windowListeners.length
    };
  }
}

// Create global instance for easy access
if (typeof window !== 'undefined') {
  window.__EventManager__ = new EventManager();
}

export default EventManager;
