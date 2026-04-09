/**
 * slideshow.js — Dornori image slideshow engine
 */

function buildPicture(folder, name, alt = '') {
    const picture = document.createElement('picture');
    const webp = document.createElement('source');
    webp.type = 'image/webp';
    webp.srcset = `${folder}${name}.webp`;

    const img = document.createElement('img');
    img.src = `${folder}${name}.png`;
    img.alt = alt;
    img.style.cssText = 'width:100%;height:100%;object-fit:inherit;display:block;';

    picture.appendChild(webp);
    picture.appendChild(img);
    return picture;
}

export function mountSlideshow(root) {
    if (root.dataset.ssMounted) return;

    const folder = root.dataset.folder || '';
    const images = (root.dataset.images || '').split(',').map(s => s.trim()).filter(Boolean);
    const interval = parseInt(root.dataset.interval, 10) || 4000;
    const fit = root.dataset.fit || 'cover';
    
    // --- RESPONSIVE SIZE LOGIC ---
    const aspect = root.dataset.aspect || 'auto';
    let width = '100%';
    let height = 'auto';

    if (root.dataset.size && aspect === 'auto') {
        const [w, h] = root.dataset.size.split('x');
        width = w.match(/[a-z%]/) ? w : `${w}px`; // handle '800' or '800px'
        height = h.match(/[a-z%]/) ? h : `${h}px`;
    }

    if (!images.length) return;
    root.dataset.ssMounted = 'true';

    // Apply the container styles
    root.style.cssText = `
        position: relative;
        width: ${width};
        max-width: 100%; 
        height: ${aspect !== 'auto' ? 'auto' : height};
        aspect-ratio: ${aspect};
        overflow: hidden;
        background: #111;
        border-radius: 8px;
        margin: 0 auto;
    `;

    const slides = images.map((name, i) => {
        const slide = document.createElement('div');
        slide.style.cssText = `
            position: absolute;
            inset: 0;
            opacity: ${i === 0 ? 1 : 0};
            transition: opacity 0.8s ease;
            object-fit: ${fit};
        `;
        slide.appendChild(buildPicture(folder, name, name.replace(/-/g, ' ')));
        root.appendChild(slide);
        return slide;
    });

    if (slides.length > 1) setupControls(root, slides, interval);
}

function setupControls(root, slides, interval) {
    const dots = document.createElement('div');
    dots.style.cssText = 'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:2;';

    let current = 0;
    const dotEls = slides.map((_, i) => {
        const d = document.createElement('span');
        d.style.cssText = `width:6px;height:6px;border-radius:50%;background:#fff;opacity:${i===0?1:0.3};cursor:pointer;`;
        d.onclick = () => {
            slides[current].style.opacity = 0;
            dotEls[current].style.opacity = 0.3;
            current = i;
            slides[current].style.opacity = 1;
            dotEls[current].style.opacity = 1;
        };
        dots.appendChild(d);
        return d;
    });
    root.appendChild(dots);

    setInterval(() => {
        slides[current].style.opacity = 0;
        dotEls[current].style.opacity = 0.3;
        current = (current + 1) % slides.length;
        slides[current].style.opacity = 1;
        dotEls[current].style.opacity = 1;
    }, interval);
}
