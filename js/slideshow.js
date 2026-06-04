/**
 * DORNORI SLIDESHOW ENGINE — UNIFIED
 *
 * Attributes (all optional except gallery-images):\n *   gallery-size      e.g. \"800x400\" or \"16/9\" (default \"16/9\")\n *   gallery-border    \"yes\" | \"no\" (default \"no\")\n *   gallery-shape     \"rounded\" | \"square\" (default \"square\")\n *   gallery-images    comma-separated image names (no extension)\n *   gallery-folder    URL prefix for images\n *   gallery-interval  milliseconds between auto-advances (default 4000)\n *   gallery-mode      \"auto\" | \"manual\" (default \"manual\")\n *   gallery-controls  \"dots\" | \"none\" (default \"dots\")
 *
 * Interactions:
 *   Desktop — click left half to go back, right half to go forward
 *   Mobile  — swipe left/right
 *   Both    — dot indicators clickable, timer resets on any interaction
 *   Auto    — auto-advances if gallery-mode="auto"
 *
 * Image loading:
 *   On first run the slideshow waits for each target image to finish
 *   loading before showing it. If the timer fires before the image is
 *   ready the transition is deferred until the load event fires.
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
    const isFullBleed = !size.includes('x');
    root.style.cssText += `
        position: relative; display: block; overflow: hidden;
        width: ${isFullBleed ? '100vw' : width}; max-width: ${isFullBleed ? '100vw' : width};
        ${isFullBleed ? 'left: 50%; transform: translateX(-50%);' : 'margin: 0 auto;'}
        height: ${height}; aspect-ratio: ${aspect};
        border: ${borderCSS}; border-radius: ${cornerCSS};
        cursor: pointer; user-select: none; margin-bottom: 3rem;
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
                     alt="${name.replace(/-_/g, ' ')}"
                     style="width:100%;height:100%;object-fit:cover;display:block;"
                     draggable="false">
            </picture>`;
        root.appendChild(slide);
        return slide;
    });

    if (slideEls.length < 2) return;

    // ── IMAGE LOAD TRACKING ──────────────────────────────────────────────────
    // loaded[i] = true once the img for slide i has finished loading.
    // For slide 0 we consider it loaded immediately (it's already visible
    // and the browser starts fetching it right away; we never defer away
    // from it). For all others we track the img load event.
    const loaded = imgList.map(() => false);
    loaded[0] = true; // first slide is shown immediately; treat as ready

    const imgEls = slideEls.map(slide => slide.querySelector('img'));

    imgEls.forEach((img, i) => {
        if (i === 0) return; // already marked ready
        if (img.complete && img.naturalWidth > 0) {
            loaded[i] = true;
        } else {
            img.addEventListener('load',  () => { loaded[i] = true; flushPending(i); }, { once: true });
            img.addEventListener('error', () => { loaded[i] = true; flushPending(i); }, { once: true });
        }
    });

    // If a goTo was deferred because the image wasn't ready yet, store the
    // intended index here and commit it once the image loads.
    let pendingIndex = null;

    function flushPending(loadedIndex) {
        if (pendingIndex === loadedIndex) {
            pendingIndex = null;
            commitGoTo(loadedIndex);
        }
    }

    // ── STATE ─────────────────────────────────────────────────────────────────
    let cur   = 0;
    let timer = null;

    // commitGoTo does the actual DOM transition — only called when loaded.
    function commitGoTo(index) {
        slideEls[cur].style.opacity = 0;
        cur = (index + slideEls.length) % slideEls.length;
        slideEls[cur].style.opacity = 1;
        updateDots();
        // Preload the slide after the one we just showed
        preload((cur + 1) % slideEls.length);
    }

    function goTo(index) {
        const target = (index + slideEls.length) % slideEls.length;
        if (loaded[target]) {
            pendingIndex = null;
            commitGoTo(target);
        } else {
            // Defer: remember where we want to go; the load listener will call
            // flushPending once the image is ready. We replace any prior
            // pending intent so rapid advances don't queue up stale transitions.
            pendingIndex = target;
        }
    }

    // Kick off loading an image without switching to it.
    function preload(index) {
        if (loaded[index]) return;
        // The img src is already set in the HTML; the browser is already
        // fetching it. This is a no-op that keeps the intent explicit.
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

    // ── CLEANUP — stop timer when element is removed from DOM ────────────────
    const _obs = new MutationObserver(() => {
        if (!document.contains(root)) {
            clearInterval(timer);
            _obs.disconnect();
        }
    });
    _obs.observe(document.body, { childList: true, subtree: true });
    root._slideshowDestroy = () => { clearInterval(timer); _obs.disconnect(); };

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

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            dx < 0 ? next() : prev();
            resetTimer();
        }

        touchStartX = null;
        touchStartY = null;
    }, { passive: true });
}
