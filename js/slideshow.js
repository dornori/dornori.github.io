/**
 * DORNORI SLIDESHOW ENGINE
 *
 * Attributes (all optional except gallery-images):
 *   gallery-size      e.g. "800x400" or "16/9"
 *   gallery-border    "yes" | "no"
 *   gallery-shape     "rounded" | "square"
 *   gallery-images    comma-separated image names (no extension)
 *   gallery-folder    URL prefix for images
 *   gallery-interval  milliseconds between auto-advances (default 4000)
 *
 * Interactions:
 *   Desktop — click left half to go back, right half to go forward
 *   Mobile  — swipe left/right
 *   Both    — dot indicators clickable, timer resets on any interaction
 */
export function mountSlideshow(root) {
    if (root.getAttribute('ss-mounted')) return;

    const DEFAULT_INTERVAL = 4000;
    const DEFAULT_SIZE     = '16/9';

    const size     = root.getAttribute('gallery-size')     || DEFAULT_SIZE;
    const border   = root.getAttribute('gallery-border')   || 'no';
    const shape    = root.getAttribute('gallery-shape')    || 'square';
    const images   = root.getAttribute('gallery-images')   || '';
    const folder   = root.getAttribute('gallery-folder')   || '';
    const interval = parseInt(root.getAttribute('gallery-interval') || DEFAULT_INTERVAL, 10);

    const imgList = images.split(',').map(s => s.trim()).filter(Boolean);
    if (!imgList.length) return;

    // ── DIMENSIONS ───────────────────────────────────────────────────────────
    let width = '100%', height = 'auto', aspect = 'auto';
    if (size.includes('x')) {
        const [w, h] = size.split('x');
        width  = w.includes('px') ? w : `${w}px`;
        height = h.includes('px') ? h : `${h}px`;
    } else {
        aspect = size;
    }

    // ── CONTAINER ────────────────────────────────────────────────────────────
    const borderCSS = border === 'yes' ? '1px solid #333' : 'none';
    const cornerCSS = shape  === 'rounded' ? '12px' : '0px';

    root.setAttribute('ss-mounted', 'true');
    root.style.cssText += `
        position: relative; display: block; margin: 0 auto; overflow: hidden;
        width: ${width}; max-width: 100%; height: ${height}; aspect-ratio: ${aspect};
        border: ${borderCSS}; border-radius: ${cornerCSS};
        cursor: pointer; user-select: none;
    `;

    // ── SLIDES ───────────────────────────────────────────────────────────────
    const slideEls = imgList.map((name, i) => {
        const slide = document.createElement('div');
        slide.style.cssText = `
            position: absolute; inset: 0;
            opacity: ${i === 0 ? 1 : 0};
            transition: opacity 0.6s ease;
        `;
        slide.innerHTML = `
            <picture style="width:100%;height:100%;display:block;">
                <source srcset="${folder}${name}.webp" type="image/webp">
                <img src="${folder}${name}.jpg"
                     style="width:100%;height:100%;object-fit:cover;display:block;"
                     draggable="false">
            </picture>`;
        root.appendChild(slide);
        return slide;
    });

    if (slideEls.length < 2) return;

    // ── STATE ─────────────────────────────────────────────────────────────────
    let cur   = 0;
    let timer = null;

    function goTo(index) {
        slideEls[cur].style.opacity = 0;
        cur = (index + slideEls.length) % slideEls.length;
        slideEls[cur].style.opacity = 1;
        updateDots();
    }

    function next() { goTo(cur + 1); }
    function prev() { goTo(cur - 1); }

    // ── AUTO TIMER ────────────────────────────────────────────────────────────
    function startTimer() {
        clearInterval(timer);
        timer = setInterval(next, interval);
    }

    function resetTimer() {
        startTimer();
    }

    startTimer();

    // ── DOT INDICATORS ───────────────────────────────────────────────────────
    const dotsWrap = document.createElement('div');
    dotsWrap.style.cssText = `
        position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
        display: flex; gap: 6px; z-index: 10; pointer-events: auto;
    `;

    const dots = slideEls.map((_, i) => {
        const dot = document.createElement('button');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.style.cssText = `
            width: 8px; height: 8px; border-radius: 50%; border: none;
            background: ${i === 0 ? 'var(--accent, #fff)' : 'rgba(255,255,255,0.4)'};
            cursor: pointer; padding: 0; transition: background 0.3s;
        `;
        dot.addEventListener('click', e => {
            e.stopPropagation();
            goTo(i);
            resetTimer();
        });
        dotsWrap.appendChild(dot);
        return dot;
    });

    root.appendChild(dotsWrap);

    function updateDots() {
        dots.forEach((d, i) => {
            d.style.background = i === cur
                ? 'var(--accent, #fff)'
                : 'rgba(255,255,255,0.4)';
        });
    }

    // ── CLICK NAVIGATION (desktop) ───────────────────────────────────────────
    // Left half = previous, right half = next
    root.addEventListener('click', e => {
        if (dotsWrap.contains(e.target)) return;
        const rect = root.getBoundingClientRect();
        if ((e.clientX - rect.left) < rect.width / 2) {
            prev();
        } else {
            next();
        }
        resetTimer();
    });

    // Cursor hint: ← on left half, → on right half
    root.addEventListener('mousemove', e => {
        const rect = root.getBoundingClientRect();
        root.style.cursor = (e.clientX - rect.left) < rect.width / 2
            ? 'w-resize'
            : 'e-resize';
    });
    root.addEventListener('mouseleave', () => {
        root.style.cursor = 'pointer';
    });

    // ── TOUCH SWIPE (mobile) ──────────────────────────────────────────────────
    let touchStartX = null;
    let touchStartY = null;

    root.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    root.addEventListener('touchend', e => {
        if (touchStartX === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;

        // Only fire if more horizontal than vertical and at least 40px
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            dx < 0 ? next() : prev();
            resetTimer();
        }

        touchStartX = null;
        touchStartY = null;
    }, { passive: true });
}
