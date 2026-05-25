/**
 * site-main.js — ES module entry point for all HTML shell pages.
 */

import SITE_CONFIG          from './config.js';
import ENV_CONFIG           from './env-config.js';
import { initI18n } from './i18n.js';
import { initNavigation }   from './nav-loader.js';
import { initSocials }      from './social-loader.js';
import { initPageLoader }   from './page-loader.js';
import { initFooter }       from './footer-loader.js';

/**
 * FIX #5: Load and cache countries.json (single source of truth)
 * Fetches once per 7 days (cached in localStorage), extracts languages on-the-fly
 * No second fetch by i18n.js or geo-popup.js
 */
async function loadAndCacheCountries() {
    const basePath = SITE_CONFIG.appearance.base_path;
    
    // FIX #5 & #8: Check localStorage cache first (instant, no network)
    try {
        const cached = localStorage.getItem('dornori-countries-cache');
        const timestamp = localStorage.getItem('dornori-cache-timestamp');
        const now = Date.now();
        const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (cached && timestamp && (now - parseInt(timestamp)) < CACHE_TTL) {
            // Cache is valid - use it
            const countries = JSON.parse(cached);
            window.__countriesCache = countries;
            return countries;
        }
    } catch (e) {
        // Cache read failed, will fetch from network
    }
    
    // Cache miss or stale - fetch from network
    try {
        const res = await fetch(basePath + SITE_CONFIG.paths.countries_file);
        const countries = await res.json();
        
        // Store in window for immediate use by other modules
        window.__countriesCache = countries;
        
        // FIX #5 & #8: Cache to localStorage for next load
        try {
            localStorage.setItem('dornori-countries-cache', JSON.stringify(countries));
            localStorage.setItem('dornori-cache-timestamp', Date.now().toString());
        } catch (e) {
            // localStorage full or unavailable, continue anyway
        }
        
        return countries;
    } catch (e) {
        if (ENV_CONFIG.DEBUG) console.error('[site-main] Failed to load countries.json:', e);
        return [];
    }
}

/**
 * Extract unique active languages from countries data.
 * Labels and flags come from language_label / language_flag fields on the
 * canonical country entry in countries.json — zero hardcoding here.
 * To add or rename a language: edit countries.json only.
 */
function extractLanguages(countries) {
    const languagesMap = new Map();

    // First pass: collect label/flag from canonical country entries
    const langMeta = {};
    countries.forEach(country => {
        if (country.language_label && country.language_flag && country.language) {
            langMeta[country.language] = {
                label: country.language_label,
                flag:  country.language_flag,
            };
        }
    });

    // Second pass: build language list from active countries
    countries.forEach(country => {
        if (country.active && country.language) {
            const langCode = country.language;
            if (!languagesMap.has(langCode)) {
                const meta = langMeta[langCode] || { label: langCode.toUpperCase(), flag: '🏳️' };
                languagesMap.set(langCode, {
                    code:     langCode,
                    hreflang: country.hreflang ? country.hreflang.split('-')[0] : langCode,
                    label:    meta.label,
                    flag:     meta.flag,
                });
            }
        }
    });

    // Sort: English first, then alphabetically
    return Array.from(languagesMap.values()).sort((a, b) =>
        a.code === 'en' ? -1 : b.code === 'en' ? 1 : a.code.localeCompare(b.code)
    );
}

/**
 * Load dynamic configuration from data files
 */
async function loadDynamicConfig() {
    const basePath = SITE_CONFIG.appearance.base_path;
    
    // FIX #5: Load countries once, extract languages from cache
    const countries = await loadAndCacheCountries();
    SITE_CONFIG.languages = extractLanguages(countries);
    
    // Load profiles
    try {
        const profilesRes = await fetch(basePath + SITE_CONFIG.paths.profiles_file);
        SITE_CONFIG.profiles = await profilesRes.json();
    } catch (e) {
        if (ENV_CONFIG.DEBUG) console.error('[site-main] Failed to load profiles.json:', e);
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

    // Countries already fetched and cached by loadAndCacheCountries() above — no second fetch needed
    window.__countries = window.__countriesCache || [];
    // Signal geo-popup.js that countries data is ready
    document.dispatchEvent(new CustomEvent('countries:ready'));

    await initI18n();
    initNavigation();
    initSocials();
    initFooter();
    initPageLoader();
}

init().catch(err => {
    if (ENV_CONFIG.DEBUG) console.error('[site-main] Init error:', err);
});
