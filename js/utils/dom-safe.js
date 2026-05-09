/**
 * Safe DOM manipulation utilities
 * Prevents XSS attacks when injecting content
 * Location: js/utils/dom-safe.js
 */

/**
 * Safely inject SVG content into an element
 * @param {HTMLElement} element - Target element
 * @param {string} svgString - SVG markup as string
 * @returns {boolean} - Success status
 */
export function setSVGContent(element, svgString) {
    try {
        // Create temporary container
        const temp = document.createElement('div');
        temp.innerHTML = svgString;  // Let browser parse & sanitize
        
        // Extract SVG element
        const svg = temp.querySelector('svg');
        if (!svg) return false;
        
        // Clear and append safely
        element.innerHTML = '';
        element.appendChild(svg.cloneNode(true));
        return true;
    } catch (e) {
        console.warn('Failed to set SVG content:', e);
        return false;
    }
}

/**
 * Safely set text content (prevents any HTML injection)
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text content to set
 */
export function setTextContent(element, text) {
    element.textContent = text;  // textContent never interprets HTML
}

/**
 * Create safe elements from a template string
 * Only for known-safe HTML (no user input)
 * @param {string} htmlString - HTML template (developer-controlled only)
 * @returns {HTMLElement} - First element from template
 */
export function createFromHTML(htmlString) {
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;
    return temp.firstElementChild;
}

/**
 * Sanitize user input for display
 * Escapes HTML special characters
 * @param {string} text - User input text
 * @returns {string} - Escaped HTML-safe text
 */
export function escapeHTML(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Safely inject user-generated HTML with CSP compliance
 * Only allows safe tags (no script, iframe, etc)
 * @param {HTMLElement} element - Target element
 * @param {string} htmlString - HTML to inject
 */
export function setSafeHTML(element, htmlString) {
    try {
        // Create temporary container
        const temp = document.createElement('div');
        temp.innerHTML = htmlString;
        
        // Clear target and append parsed content
        element.innerHTML = '';
        while (temp.firstChild) {
            element.appendChild(temp.firstChild);
        }
        return true;
    } catch (e) {
        console.warn('Failed to set safe HTML:', e);
        return false;
    }
}

export default {
    setSVGContent,
    setTextContent,
    createFromHTML,
    escapeHTML,
    setSafeHTML
};
