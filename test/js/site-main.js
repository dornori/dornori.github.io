/**
 * site-main.js
 * ─────────────────────────────────────────────────────────────────────────────
 * ES module entry point for all HTML shell pages.
 * Previously duplicated as an inline <script type="module"> in every shell.
 *
 * Usage in HTML shells:
 *   <script type="module" src="/test/js/site-main.js"></script>
 *   (path is SITE_CONFIG.appearance.base_path + 'js/site-main.js')
 *
 * For shells that need per-page language detection (e.g. en/index.html,
 * de/bausatz/index.html) the per-language snippet still runs BEFORE this
 * module via an early inline <script>:
 *   <script>
 *     window.__PAGE_LANG__ = 'de';
 *     window.__PAGE_SLUG__ = 'kit';
 *   </script>
 * That's the only inline JavaScript needed in each shell going forward.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initI18n }         from './i18n.js';
import { initNavigation }   from './nav-loader.js';
import { initStickyBanner } from './sticky-banner.js';
import { initSocials }      from './social-loader.js';
import { initEmbedForms }   from './embed-form.js';
import { initPageLoader }   from './page-loader.js';
import { initFooter }       from './footer-loader.js';

async function init() {
    // Sync language preference on first-ever visit (no saved preference yet)
    const savedLang  = localStorage.getItem('dornori-lang');
    const pageLang   = window.__PAGE_LANG__;
    if (pageLang && !savedLang) {
        localStorage.setItem('dornori-lang', pageLang);
    }

    await initI18n();
    initNavigation();
    initStickyBanner();
    initSocials();
    initFooter();
    initEmbedForms();
    initPageLoader();
}

init().catch(err => console.error('[site-main] Init error:', err));
