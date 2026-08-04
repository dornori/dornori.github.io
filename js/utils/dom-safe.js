
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
        if (CONFIG.debug) console.warn('Failed to set SVG:', e);
        return false;
    }
}

