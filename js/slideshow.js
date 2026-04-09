/**
 * DORNORI SLIDESHOW ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW-TO FOR THE TEAM:
 * 1. Set gallery-size="200x150" (pixels) OR gallery-size="16/9" (ratio).
 * 2. Set gallery-style="border, rounded" (adds 1px border and 8px corners).
 * - Use "border" for the line.
 * - Use "rounded" for corners.
 * - Leave empty for a sharp square look.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function mountSlideshow(root) {
    if (root.dataset.ssMounted) return;

    const { 
        folder = '', 
        galleryImages = '', 
        interval = '4000', 
        fit = 'cover', 
        gallerySize = '16/9',
        galleryStyle = '' // NEW: "border, rounded"
    } = root.dataset;

    const imgList = galleryImages.split(',').map(s => s.trim()).filter(Boolean);
    if (!imgList.length) return;

    // --- LOGIC: DIMENSIONS ---
    let width = '100%', height = 'auto', aspect = 'auto';
    if (gallerySize.includes('/')) {
        aspect = gallerySize; 
    } else if (gallerySize.includes('x')) {
        const [w, h] = gallerySize.split('x');
        width = w.includes('px') ? w : `${w}px`;
        height = h.includes('px') ? h : `${h}px`;
    }

    // --- LOGIC: STYLING ---
    const hasBorder  = galleryStyle.includes('border');
    const hasRounded = galleryStyle.includes('rounded');

    root.dataset.ssMounted = 'true';
    root.style.cssText += `
        position: relative; 
        width: ${width}; 
        max-width: 100%;
        height: ${height}; 
        aspect-ratio: ${aspect};
        overflow: hidden; 
        margin: 0 auto; 
        display: block;
        border: ${hasBorder ? '1px solid var(--border, #333)' : 'none'};
        border-radius: ${hasRounded ? '12px' : '0px'};
    `;

    imgList.forEach((name, i) => {
        const slide = document.createElement('div');
        slide.style.cssText = `
            position: absolute; inset: 0; opacity: ${i === 0 ? 1 : 0};
            transition: opacity 0.8s ease;
        `;
        slide.innerHTML = `
            <picture style="width:100%;height:100%;">
                <source srcset="${folder}${name}.webp" type="image/webp">
                <img src="${folder}${name}.png" alt="${name}" 
                     style="width:100%;height:100%;object-fit:${fit};display:block;">
            </picture>`;
        root.appendChild(slide);
    });

    // Timer logic
    let cur = 0;
    const slides = root.querySelectorAll('div');
    if (slides.length > 1) {
        setInterval(() => {
            slides[cur].style.opacity = 0;
            cur = (cur + 1) % slides.length;
            slides[cur].style.opacity = 1;
        }, parseInt(interval));
    }
}
