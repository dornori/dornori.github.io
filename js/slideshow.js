/**
 * DORNORI MASTER ENGINE
 */
export function mountSlideshow(root) {
    if (root.dataset.ssMounted) return;

    // --- MASTER DEFAULTS ---
    // If the team leaves a setting out of the HTML, these defaults take over.
    const MASTER_DEFAULT_INTERVAL = '4000'; 
    const MASTER_DEFAULT_SIZE = '16/9';

    // --- OVERRIDE LOGIC ---
    // The code checks the HTML. If 'data-interval="2000"' exists, it overrides the Master.
    const { 
        folder = '', 
        galleryImages = '', 
        interval = MASTER_DEFAULT_INTERVAL, 
        fit = 'cover',
        gallerySize = MASTER_DEFAULT_SIZE,
        galleryBorder = 'no',
        galleryShape = 'square' 
    } = root.dataset;

    const imgList = galleryImages.split(',').map(s => s.trim()).filter(Boolean);
    if (!imgList.length) return;

    // --- DIMENSION LOGIC ---
    let width = '100%', height = 'auto', aspect = 'auto';

    if (gallerySize.includes('x')) {
        const [w, h] = gallerySize.split('x');
        width = w.includes('px') ? w : `${w}px`;
        height = h.includes('px') ? h : `${h}px`;
    } else {
        aspect = gallerySize;
    }

    // --- STYLE LOGIC ---
    const borderCSS = (galleryBorder === 'yes') ? '1px solid #333' : 'none';
    const cornerCSS = (galleryShape === 'rounded') ? '12px' : '0px';

    root.dataset.ssMounted = 'true';
    
    // Applying CSS: 'max-width: 100%' ensures the 200x150 box scales on mobile.
    root.style.cssText += `
        position: relative; display: block; margin: 0 auto; overflow: hidden;
        width: ${width}; max-width: 100%; height: ${height}; aspect-ratio: ${aspect};
        border: ${borderCSS}; border-radius: ${cornerCSS};
    `;

    // Injecting Slides
    imgList.forEach((name, i) => {
        const slide = document.createElement('div');
        slide.style.cssText = `position:absolute;inset:0;opacity:${i===0?1:0};transition:opacity 0.8s ease;`;
        slide.innerHTML = `
            <picture style="width:100%;height:100%;">
                <source srcset="${folder}${name}.webp" type="image/webp">
                <img src="${folder}${name}.png" style="width:100%;height:100%;object-fit:${fit};display:block;">
            </picture>`;
        root.appendChild(slide);
    });

    // Rotation Timer
    let cur = 0;
    const slides = root.querySelectorAll('div');
    if (slides.length > 1) {
        setInterval(() => {
            slides[cur].style.opacity = 0;
            cur = (cur + 1) % slides.length;
            slides[cur].style.opacity = 1;
        }, parseInt(interval)); // Uses the final chosen number (Override or Master)
    }
}
