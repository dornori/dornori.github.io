/**
 * hero-video.js
 * Handles lazy loading of hero video elements to prevent competing with poster images
 */

(function() {
  'use strict';

  /**
   * Load hero videos after page is interactive
   * Prevents videos from competing with poster images during initial render
   */
  function initHeroVideos() {
    // Select all hero-video elements
    const heroVideos = document.querySelectorAll('.hero-video video');
    
    if (heroVideos.length === 0) return;

    // Load video when page is interactive
    if (document.readyState === 'loading') {
      window.addEventListener('load', loadHeroVideos);
    } else {
      loadHeroVideos();
    }
  }

  /**
   * Load all hero videos
   */
  function loadHeroVideos() {
    const heroVideos = document.querySelectorAll('.hero-video video');
    
    heroVideos.forEach(video => {
      if (video && video.preload !== 'auto') {
        video.load();
      }
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroVideos);
  } else {
    initHeroVideos();
  }
})();
