/**
 * slideshow.js — Pure HTML-driven slideshow
 * No config files needed. Define everything in HTML data attributes.
 * Scales perfectly on any device.
 */

function buildPicture(folder, name) {
    const picture = document.createElement('picture');
    
    const webp = document.createElement('source');
    webp.type = 'image/webp';
    webp.srcset = `${folder}${name}.webp`;
    
    const img = document.createElement('img');
    img.src = `${folder}${name}.png`;
    img.alt = name.replace(/-/g, ' ');
    img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: inherit;
        display: block;
    `;
    
    picture.appendChild(webp);
    picture.appendChild(img);
    return picture;
}

function mountSlideshow(root) {
    // Read config from data attributes
    const folder = root.dataset.folder || '';
    const imagesRaw = root.dataset.images || '';
    const interval = parseInt(root.dataset.interval, 10) || 4000;
    const fit = root.dataset.fit || 'contain';  // 'contain' = no distortion
    const images = imagesRaw.split(',').map(s => s.trim()).filter(Boolean);
    
    if (!images.length) {
        root.innerHTML = '<p style="color:#888; padding:2rem; text-align:center;">No images configured</p>';
        return;
    }
    
    // Mark as mounted
    root.dataset.ssMounted = 'true';
    
    // Set container styles
    root.style.position = 'relative';
    root.style.overflow = 'hidden';
    root.style.display = 'block';
    root.style.background = '#111';
    
    // Build slides
    const slides = images.map((name, i) => {
        const slide = document.createElement('div');
        slide.style.cssText = `
            position: absolute;
            inset: 0;
            opacity: ${i === 0 ? '1' : '0'};
            transition: opacity 0.7s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const picture = buildPicture(folder, name);
        const img = picture.querySelector('img');
        if (img) img.style.objectFit = fit;
        
        slide.appendChild(picture);
        root.appendChild(slide);
        return slide;
    });
    
    // No slideshow if only 1 image
    if (slides.length <= 1) return;
    
    // Auto-rotate
    let current = 0;
    let timer = setInterval(() => {
        slides[current].style.opacity = '0';
        current = (current + 1) % slides.length;
        slides[current].style.opacity = '1';
    }, interval);
    
    // Pause on hover (desktop)
    root.addEventListener('mouseenter', () => clearInterval(timer));
    root.addEventListener('mouseleave', () => {
        timer = setInterval(() => {
            slides[current].style.opacity = '0';
            current = (current + 1) % slides.length;
            slides[current].style.opacity = '1';
        }, interval);
    });
    
    // Touch swipe (mobile)
    let touchStart = 0;
    root.addEventListener('touchstart', (e) => {
        touchStart = e.touches[0].clientX;
        clearInterval(timer);
    }, { passive: true });
    
    root.addEventListener('touchend', (e) => {
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStart - touchEnd;
        
        if (Math.abs(diff) > 40) {
            slides[current].style.opacity = '0';
            if (diff > 0) {
                current = (current + 1) % slides.length;
            } else {
                current = (current - 1 + slides.length) % slides.length;
            }
            slides[current].style.opacity = '1';
        }
        
        // Restart timer
        timer = setInterval(() => {
            slides[current].style.opacity = '0';
            current = (current + 1) % slides.length;
            slides[current].style.opacity = '1';
        }, interval);
    });
}

// Auto-initialize when DOM loads
function initAllSlideshows() {
    document.querySelectorAll('.slideshow-root:not([data-ss-mounted])').forEach(root => {
        // Skip if already has data-ss-mounted (prevents double init)
        if (root.hasAttribute('data-ss-mounted')) return;
        mountSlideshow(root);
    });
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllSlideshows);
} else {
    initAllSlideshows();
}

// Export for page-loader (if needed)
export { initAllSlideshows as initSlideshows };

// Listen for dynamically added slideshows (from page-loader)
document.addEventListener('slideshow-init', (e) => {
    if (e.detail && e.detail.root && !e.detail.root.hasAttribute('data-ss-mounted')) {
        mountSlideshow(e.detail.root);
    }
});

// Also watch for DOM changes (optional, catches everything)
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
                if (node.matches && node.matches('.slideshow-root:not([data-ss-mounted])')) {
                    mountSlideshow(node);
                }
                if (node.querySelectorAll) {
                    node.querySelectorAll('.slideshow-root:not([data-ss-mounted])').forEach(mountSlideshow);
                }
            }
        });
    });
});
observer.observe(document.body, { childList: true, subtree: true });
