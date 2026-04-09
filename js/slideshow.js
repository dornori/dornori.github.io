/**
 * slideshow.js - Dornori HTML-driven slideshow
 */

function buildPicture(folder, name) {
    const picture = document.createElement('picture');
    const webp = document.createElement('source');
    webp.type = 'image/webp';
    webp.srcset = `${folder}${name}.webp`;
    const img = document.createElement('img');
    img.src = `${folder}${name}.png`;
    img.alt = name.replace(/-/g, ' ');
    img.style.cssText = 'width:100%; height:100%; object-fit:inherit; display:block;';
    picture.appendChild(webp);
    picture.appendChild(img);
    return picture;
}

function mountSlideshow(root) {
    if (root.dataset.ssMounted === 'true') return;
    
    const folder = root.dataset.folder || '';
    const imagesRaw = root.dataset.images || '';
    const interval = parseInt(root.dataset.interval, 10) || 4000;
    const fit = root.dataset.fit || 'contain';
    const images = imagesRaw.split(',').map(s => s.trim()).filter(Boolean);
    
    if (!images.length) {
        root.innerHTML = '<p style="color:#888; padding:2rem; text-align:center;">No images configured</p>';
        return;
    }
    
    root.dataset.ssMounted = 'true';
    root.innerHTML = '';
    root.style.position = 'relative';
    root.style.overflow = 'hidden';
    root.style.display = 'block';
    root.style.background = '#111';
    
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
    
    if (slides.length <= 1) return;
    
    let current = 0;
    let timer = setInterval(() => {
        slides[current].style.opacity = '0';
        current = (current + 1) % slides.length;
        slides[current].style.opacity = '1';
    }, interval);
    
    root.addEventListener('mouseenter', () => clearInterval(timer));
    root.addEventListener('mouseleave', () => {
        timer = setInterval(() => {
            slides[current].style.opacity = '0';
            current = (current + 1) % slides.length;
            slides[current].style.opacity = '1';
        }, interval);
    });
    
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
            current = (diff > 0) ? (current + 1) % slides.length : (current - 1 + slides.length) % slides.length;
            slides[current].style.opacity = '1';
        }
        timer = setInterval(() => {
            slides[current].style.opacity = '0';
            current = (current + 1) % slides.length;
            slides[current].style.opacity = '1';
        }, interval);
    });
}

function initAllSlideshows() {
    document.querySelectorAll('.slideshow-root:not([data-ss-mounted])').forEach(mountSlideshow);
}

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllSlideshows);
} else {
    initAllSlideshows();
}

export { mountSlideshow, initAllSlideshows as initSlideshows };
