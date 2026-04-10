/**
 * DORNORI MASTER ENGINE
 */
export function mountSlideshow(root) {
    // Check if already mounted to prevent double-loading
    if (root.getAttribute('ss-mounted')) return;

    // --- MASTER DEFAULTS ---
    // If the team leaves a setting out, these take over.
    const DEFAULT_INTERVAL = 4000;
    const DEFAULT_SIZE = '16/9';

    // --- LOGIC: PULLING VALUES FROM HTML ---
    // We use getAttribute to ensure we find the exact names the team typed.
    const size     = root.getAttribute('gallery-size')   || DEFAULT_SIZE;
    const border   = root.getAttribute('gallery-border') || 'no';
    const shape    = root.getAttribute('gallery-shape')  || 'square';
    const images   = root.getAttribute('gallery-images') || '';
    const folder   = root.getAttribute('gallery-folder') || '';
    const interval = root.getAttribute('gallery-interval') || DEFAULT_INTERVAL;

    const imgList = images.split(',').map(s => s.trim()).filter(Boolean);
    if (!imgList.length) return;

    // --- LOGIC: DIMENSIONS (Scaling) ---
    let width = '100%', height = 'auto', aspect = 'auto';

    if (size.includes('x')) {
        const [w, h] = size.split('x');
        width = w.includes('px') ? w : `${w}px`;
        height = h.includes('px') ? h : `${h}px`;
    } else {
        aspect = size;
    }

    // --- LOGIC: STYLE (Border & Shape) ---
    const borderCSS = (border === 'yes') ? '1px solid #333' : 'none';
    const cornerCSS = (shape === 'rounded') ? '12px' : '0px';

    // Mark as mounted
    root.setAttribute('ss-mounted', 'true');
    
    // Applying CSS
    root.style.cssText += `
        position: relative; display: block; margin: 0 auto; overflow: hidden;
        width: ${width}; max-width: 100%; height: ${height}; aspect-ratio: ${aspect};
        border: ${borderCSS}; border-radius: ${cornerCSS};
    `;

    // Injecting Slides
    imgList.forEach((name, i) => {
        const slide = document.createElement('div');
        slide.style.cssText = `position:absolute;inset:0;opacity:${i===0?1:0};transition:opacity 0.8s ease;`;
        
        // Background logic: Webp for speed, PNG as fallback
        slide.innerHTML = `
            <picture style="width:100%;height:100%;">
                <source srcset="${folder}${name}.webp" type="image/webp">
                <img src="${folder}${name}.png" style="width:100%;height:100%;object-fit:cover;display:block;">
            </picture>`;
        root.appendChild(slide);
    });

    // Rotation Timer Logic
    const slides = root.querySelectorAll('div');
    if (slides.length > 1) {
        let cur = 0;
        setInterval(() => {
            slides[cur].style.opacity = 0;
            cur = (cur + 1) % slides.length;
            slides[cur].style.opacity = 1;
        }, parseInt(interval));
    }
}
