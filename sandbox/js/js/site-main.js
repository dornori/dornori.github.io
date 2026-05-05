/**
 * site-main.js — ES module entry point for all HTML shell pages.
 */

import SITE_CONFIG          from './config.js';
import { initI18n, loadCountries } from './i18n.js';
import { initNavigation }   from './nav-loader.js';
import { initStickyBanner } from './sticky-banner.js';
import { initSocials }      from './social-loader.js';
import { initEmbedForms }   from './embed-form.js';
import { initPageLoader }   from './page-loader.js';
import { initFooter }       from './footer-loader.js';

async function init() {
    // Persist page language before anything else (prevents flash)
    const savedLang = localStorage.getItem(SITE_CONFIG.storageKeys.lang);
    const pageLang  = window.__PAGE_LANG__;
    if (pageLang && !savedLang) {
        localStorage.setItem(SITE_CONFIG.storageKeys.lang, pageLang);
    }

    // Expose language list globally for nav-loader and any other consumers
    window.__languages = SITE_CONFIG.languages;

    // Load country data and expose globally (used by geo-popup)
    try {
        window.__countries = await loadCountries();
    } catch (e) {
        console.warn('[site-main] Could not load countries:', e);
        window.__countries = [];
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
