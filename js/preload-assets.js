// preload-assets.js
// Preloads critical assets (video posters + product images) on home page load
// Easy to add/remove assets by editing arrays below

const preloadConfig = {
  // Home page video posters
  videoPosterImages: [
    '/assets/images/video-posters/dornori-hero.webp',
    '/assets/images/video-posters/dornori_star-a_picknick.webp',
    '/assets/images/video-posters/dornori_star-a_ufo_web.webp',
    '/assets/images/video-posters/dornori_star-a_3d-printer.webp',
  ],

  // UFO and Mushroom product images (add colorways/variants as needed)
  productImages: [
    '/assets/images/products/ufo-spaceblue.webp',
    '/assets/images/products/ufo-spacered.webp',
    '/assets/images/products/ufo-forestgreen.webp',
    '/assets/images/products/ufo-sunsetgold.webp',
    '/assets/images/products/mushroom-spaceblue.webp',
    '/assets/images/products/mushroom-spacered.webp',
    '/assets/images/products/mushroom-forestgreen.webp',
    '/assets/images/products/mushroom-sunsetgold.webp',
  ],
};

/**
 * Preload images by injecting <link rel="preload"> into <head>
 * @param {string[]} assetPaths - Array of image paths to preload
 * @param {string} asType - 'image' for images, 'video' for videos
 */
function preloadAssets(assetPaths, asType = 'image') {
  if (!Array.isArray(assetPaths)) return;

  assetPaths.forEach(path => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = asType;
    link.href = path;
    
    // Detect format and set type
    if (path.endsWith('.webp')) {
      link.type = 'image/webp';
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      link.type = 'image/jpeg';
    } else if (path.endsWith('.png')) {
      link.type = 'image/png';
    } else if (path.endsWith('.mp4')) {
      link.type = 'video/mp4';
    }
    
    document.head.appendChild(link);
  });
}

/**
 * Initialize preloading when home page is ready
 */
function initPreloadAssets() {
  // Preload video posters
  preloadAssets(preloadConfig.videoPosterImages, 'image');
  
  // Preload product images (lower priority than video posters)
  // Delay slightly so critical posters load first
  setTimeout(() => {
    preloadAssets(preloadConfig.productImages, 'image');
  }, 100);
}

// Hook into home page ready event
document.addEventListener('home:ready', initPreloadAssets);

// Also initialize on first load if home is already shown
if (document.getElementById('home-view') && !document.getElementById('home-view').classList.contains('hidden')) {
  initPreloadAssets();
}
