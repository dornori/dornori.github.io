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

/**
 * Load dynamic configuration from data files
 * - Languages from countries.json (active countries with siteLang)
 * - Profiles from profiles.json
 */
async function loadDynamicConfig() {
    const basePath = SITE_CONFIG.appearance.base_path;
    
    // Load countries and extract languages
    try {
        const countriesRes = await fetch(basePath + SITE_CONFIG.paths.countries_file);
        const countries = await countriesRes.json();
        
        // Extract unique languages from active countries with siteLang
        const languagesMap = new Map();
        const languageLabels = {
            'en': { label: 'English', flag: '🇬🇧' },
            'de': { label: 'Deutsch', flag: '🇩🇪' },
            'nl': { label: 'Nederlands', flag: '🇳🇱' },
            'fr': { label: 'Français', flag: '🇫🇷' },
            'es': { label: 'Español', flag: '🇪🇸' },
            'pt': { label: 'Português', flag: '🇵🇹' }
        };
        
        countries.forEach(country => {
            if (country.active && country.siteLang) {
                const langCode = country.siteLang;
                if (!languagesMap.has(langCode)) {
                    const langInfo = languageLabels[langCode] || { label: langCode.toUpperCase(), flag: '🏳️' };
                    languagesMap.set(langCode, {
                        code: langCode,
                        hreflang: country.hreflang ? country.hreflang.split('-')[0] : langCode,
                        label: langInfo.label,
                        flag: langInfo.flag
                    });
                }
            }
        });
        
        // Convert to array and sort (English first, then alphabetically)
        SITE_CONFIG.languages = Array.from(languagesMap.values()).sort((a, b) => 
            a.code === 'en' ? -1 : b.code === 'en' ? 1 : a.code.localeCompare(b.code)
        );
    } catch (e) {
        console.error('[site-main] Failed to load languages from countries.json:', e);
        // Fallback to default languages
        SITE_CONFIG.languages = [
            { code: 'en', hreflang: 'en', label: 'English', flag: '🇬🇧' },
            { code: 'de', hreflang: 'de', label: 'Deutsch', flag: '🇩🇪' },
            { code: 'nl', hreflang: 'nl', label: 'Nederlands', flag: '🇳🇱' },
            { code: 'fr', hreflang: 'fr', label: 'Français', flag: '🇫🇷' },
        ];
    }
    
    // Load profiles
    try {
        const profilesRes = await fetch(basePath + SITE_CONFIG.paths.profiles_file);
        SITE_CONFIG.profiles = await profilesRes.json();
    } catch (e) {
        console.error('[site-main] Failed to load profiles.json:', e);
        // Fallback to default profiles
        SITE_CONFIG.profiles = ['dark', 'light', 'cutting-mat', 'cutting-blue'];
    }
}

async function init() {
    // Load dynamic configuration first
    await loadDynamicConfig();
    
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
