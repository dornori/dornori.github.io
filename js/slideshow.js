/**
 * slideshow.js — Dornori image slideshow engine
 * ─────────────────────────────────────────────────────────────────────────────
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
    const height = root.dataset.height || '420px';
    const aspect = root.dataset.aspect || 'auto'; // Added for auto-scaling

    if (!images.length) return;

    root.dataset.ssMounted = 'true';

    // Flexible layout: Use aspect-ratio for auto-scaling, or fallback to fixed height
    root.style.cssText = `
        position: relative;
        width: 100%;
        height: ${aspect !== 'auto' ? 'auto' : height};
        aspect-ratio: ${aspect};
        overflow: hidden;
        background: var(--glass);
        border: 1px solid var(--border);
        object-fit: ${fit};
    `;

    const slides = images.map((name, i) => {
        const slide = document.createElement('div');
        slide.className = 'ss-slide';
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

    if (slides.length > 1) {
        setupControls(root, slides, interval);
    }
}

function setupControls(root, slides, interval) {
    const dots = document.createElement('div');
    dots.style.cssText = 'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:2;';

    let current = 0;
    const dotEls = slides.map((_, i) => {
        const d = document.createElement('span');
        d.style.cssText = `width:6px;height:6px;border-radius:50%;background:var(--accent);opacity:${i === 0 ? 1 : 0.3};transition:opacity 0.3s;cursor:pointer;`;
        d.addEventListener('click', () => goTo(i));
        dots.appendChild(d);
        return d;
    });
    root.appendChild(dots);

    const goTo = (next) => {
        slides[current].style.opacity = 0;
        dotEls[current].style.opacity = 0.3;
        current = (next + slides.length) % slides.length;
        slides[current].style.opacity = 1;
        dotEls[current].style.opacity = 1;
    };

    let timer = setInterval(() => goTo(current + 1), interval);
    root.addEventListener('mouseenter', () => clearInterval(timer));
    root.addEventListener('mouseleave', () => timer = setInterval(() => goTo(current + 1), interval));

    let touchStartX = 0;
    root.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', e => {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
    });
}
