/**
 * slideshow-config.js — Dornori slideshow configurations
 * ─────────────────────────────────────────────────────────────────────────────
 * Each entry in this array controls one slideshow on the page.
 * The `target` selector must match a .slideshow-root div in the HTML.
 *
 * FIELDS
 * ──────
 * target    {string}   CSS selector for the .slideshow-root container
 * folder    {string}   Path to image folder — must end with /
 * images    {string[]} Filenames WITHOUT extension (webp tried first, png fallback)
 * interval  {number}   Milliseconds between slides (default: 4000)
 * fit       {string}   CSS object-fit — 'cover' (fills box) or 'contain' (shows whole image)
 * height    {string}   CSS height of the slideshow box (default: '420px')
 *
 * HOW TO USE ON A PAGE
 * ─────────────────────
 * 1. Add a .slideshow-root div with a unique id or class to your content HTML:
 *       <div class="slideshow-root" id="gallery-main"></div>
 *
 * 2. Add a config entry here with target: '#gallery-main'
 *
 * 3. In your page's <script type="module">:
 *       import { initSlideshows }  from './js/slideshow.js';
 *       import SLIDESHOW_CONFIGS   from './js/slideshow-config.js';
 *       initSlideshows(SLIDESHOW_CONFIGS);
 *    Or if you only want the slideshows for that page, import a filtered subset.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SLIDESHOW_CONFIGS = [

    /* ── Example: classroom gallery on the about-us page ────────────────── */
    {
        target:   '#slideshow-about',
        folder:   'assets/images/gallery-about/',
        images:   [
            'teens-sitting-outside-on-the-beach',
            'friends-diy-in-the-backyard',
            'man-working-in-garden',
            'kids-playing-in-backyard',
        ],
        interval: 4000,        // 4 seconds
        fit:      'cover',
        height:   '420px',
    },

    /* ── Example: product detail shots on the assembly kit page ─────────── */
    {
        target:   '#slideshow-kit',
        folder:   'assets/images/gallery-kit/',
        images:   [
            'parts-view-01',
            'exploded-view',
            'stl-preview',
        ],
        interval: 6000,        // 6 seconds — give people time to look
        fit:      'cover',
        height:   '360px',
    },

    /* ── Add more entries below as needed ────────────────────────────────── */

];

export default SLIDESHOW_CONFIGS;
