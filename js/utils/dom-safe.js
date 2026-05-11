import ENV_CONFIG from '../env-config.js';

export function setSVGContent(element, svgString) {
    try {
        const temp = document.createElement('div');
        temp.innerHTML = svgString;
        const svg = temp.querySelector('svg');
        if (!svg) return false;
        element.innerHTML = '';
        element.appendChild(svg.cloneNode(true));
        return true;
    } catch (e) {
        if (ENV_CONFIG.DEBUG) console.warn('Failed to set SVG:', e);
        return false;
    }
}
export function setTextContent(element, text) { element.textContent = text; }
export function createFromHTML(htmlString) {
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;
    return temp.firstElementChild;
}
export function escapeHTML(text) {
    const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
export default { setSVGContent, setTextContent, createFromHTML, escapeHTML };
