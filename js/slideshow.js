/**
 * slideshow.js — Dornori image slideshow engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders an auto-cycling image slideshow into any .slideshow-root element.
 * Config is provided per-instance via data attributes or by calling
 * initSlideshows() after importing slideshow-config.js.
 *
 * USAGE — simplest, driven by data attributes:
 *
 *   <div class="slideshow-root"
 *        data-images="assets/images/gallery/shot1,shot2,shot3"
 *        data-interval="4000"
 *        data-folder="assets/images/gallery/">
 *   </div>
 *   <script type="module" src="./js/slideshow.js"></script>
 *
 * USAGE — config-driven (recommended, supports multiple instances):
 *
 *   import { initSlideshows } from './js/slideshow.js';
 *   import SLIDESHOW_CONFIGS   from './js/slideshow-config.js';
 *   initSlideshows(SLIDESHOW_CONFIGS);
 *
 * CONFIG SHAPE (one entry per slideshow-root):
 *   {
 *     target:   '.slideshow-root',   // CSS selector — must be unique per instance
 *     folder:   'assets/images/gallery/',
 *     images:   ['shot1', 'shot2'],  // filenames without extension
 *     interval: 4000,                // ms between transitions
 *     fit:      'cover',             // CSS object-fit: 'cover' | 'contain' (default: cover)
 *     height:   '420px',             // CSS height of the slideshow box (default: 420px)
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── Build a single <picture> element with webp + png fallback ─────────────── */
function buildPicture(folder, name, alt = '') {
    const picture = document.createElement('picture');

    const webp = document.createElement('source');
    webp.type   = 'image/webp';
    webp.srcset = `${folder}${name}.webp`;

    const img = document.createElement('img');
    img.src   = `${folder}${name}.png`;
    img.alt   = alt;
    img.style.cssText = 'width:100%;height:100%;object-fit:inherit;display:block;';

    picture.appendChild(webp);
    picture.appendChild(img);
    return picture;
}

/* ── Mount one slideshow into a root element ───────────────────────────────── */
function mountSlideshow(root, config) {
    const {
        folder   = '',
        images   = [],
        interval = 4000,
        fit      = 'cover',
        height   = '420px',
    } = config;

    if (!images.length) {
        root.innerHTML = '<p style="color:var(--text-muted);font-family:var(--font-mono);font-size:.75rem;">No images configured.</p>';
        return;
    }

    /* Mark as mounted so page-loader doesn't init twice */
    root.dataset.ssMounted = 'true';

    /* Container */
    root.style.cssText = `
        position: relative;
        width: 100%;
        height: ${height};
        overflow: hidden;
        background: var(--glass);
        border: 1px solid var(--border);
        object-fit: ${fit};
    `;

    /* Build all slides */
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

    /* Dot indicators */
    if (slides.length > 1) {
        const dots = document.createElement('div');
        dots.style.cssText = `
            position: absolute;
            bottom: 12px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 6px;
            z-index: 2;
        `;

        const dotEls = slides.map((_, i) => {
            const d = document.createElement('span');
            d.style.cssText = `
                width: 6px; height: 6px;
                border-radius: 50%;
                background: var(--accent);
                opacity: ${i === 0 ? 1 : 0.3};
                transition: opacity 0.3s;
                cursor: pointer;
            `;
            d.addEventListener('click', () => goTo(i));
            dots.appendChild(d);
            return d;
        });

        root.appendChild(dots);

        let current = 0;

        const goTo = (next) => {
            slides[current].style.opacity = 0;
            dotEls[current].style.opacity = 0.3;
            current = (next + slides.length) % slides.length;
            slides[current].style.opacity = 1;
            dotEls[current].style.opacity = 1;
        };

        /* Auto-cycle */
        let timer = setInterval(() => goTo(current + 1), interval);

        /* Pause on hover */
        root.addEventListener('mouseenter', () => clearInterval(timer));
        root.addEventListener('mouseleave', () => {
            timer = setInterval(() => goTo(current + 1), interval);
        });

        /* Touch swipe */
        let touchStartX = 0;
        root.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
        root.addEventListener('touchend',   e => {
            const diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
        });
    }
}

/* ── Public API ────────────────────────────────────────────────────────────── */

/**
 * initSlideshows(configs)
 *
 * Pass an array of config objects (from slideshow-config.js).
 * Each config needs either:
 *   target {string}  — CSS selector for the .slideshow-root element
 *   _el    {Element} — direct DOM element reference (used by page-loader for
 *                      data-attribute driven slideshows inside injected content)
 */
export function initSlideshows(configs = []) {
    configs.forEach(config => {
        const root = config._el || document.querySelector(config.target);
        if (!root) return;
        if (root.dataset.ssMounted) return; // never double-mount
        mountSlideshow(root, config);
    });
}

/**
 * Auto-init for any .slideshow-root elements that use data attributes
 * instead of a config file. Runs when the script is loaded directly.
 */
function autoInit() {
    document.querySelectorAll('.slideshow-root[data-images]').forEach(root => {
        const folder   = root.dataset.folder   || '';
        const interval = parseInt(root.dataset.interval, 10) || 4000;
        const fit      = root.dataset.fit      || 'cover';
        const height   = root.dataset.height   || '420px';
        const images   = root.dataset.images.split(',').map(s => s.trim()).filter(Boolean);
        mountSlideshow(root, { folder, images, interval, fit, height });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
} else {
    autoInit();
}
