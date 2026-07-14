// config-hybrid.js - Supports loading from config.json with JS fallback
// MUST be loaded FIRST before any other application scripts
// Load order: config.js → edgedeskconfig.js → shared.js → page-specific scripts

// Default constants (used if config.json unavailable)
window.EDGEDESK_CONSTANTS = {
    // ─── APPLICATION META ───────────────────────────────────────
    VERSION: '1.1.0',
    
    // ─── API CONFIGURATION ──────────────────────────────────────
    API_BASE: 'https://dornori-ticketing.dornori-info.workers.dev',
    
    // ─── PRODUCT DATA URLS ──────────────────────────────────────
    PRODUCTS_DATA_BASE_URL: 'https://cdn.example.com/data',
    PRODUCTS_IMAGES_BASE_URL: 'https://cdn.example.com/products',
    
    // ─── UI TIMING (milliseconds) ───────────────────────────────
    TOAST_DURATION_MS: 3500,
    TOAST_WARNING_DURATION_MS: 8000,
    
    // ─── WEBSOCKET CONFIGURATION ────────────────────────────────
    WS_RECONNECT_DELAY_MS: 5000,
    WS_PING_INTERVAL_MS: 30000,
    
    // ─── AUTHENTICATION & SESSION (seconds) ─────────────────────
    TOKEN_EXPIRY_SECONDS: 86400,
    LOGIN_TIMEOUT_MINUTES: 30,
    SESSION_TIMEOUT_MINUTES: 60,
    
    // ─── RATE LIMITING ──────────────────────────────────────────
    MAX_FAILED_LOGINS: 5,
    LOGIN_LOCKOUT_MINUTES: 15,
    
    // ─── TICKET LOCKING (milliseconds) ──────────────────────────
    LOCK_STALE_WRITE_MS: 45000,
    LOCK_STALE_READ_MS: 30000,
    LOCK_CLEANUP_THRESHOLD_MS: 15000,
    
    // ─── CORS CONFIGURATION ─────────────────────────────────────
    CORS_ORIGINS: [
        'https://dornori.com',
        'https://www.dornori.com',
        'https://dornori.github.io',
        'https://dornori-ticketing.dornori-info.workers.dev'
    ],
    
    // ─── DATE/TIME FORMATTING ───────────────────────────────────
    DATE_FORMAT_OPTIONS: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    },
    
    // ─── CATEGORY COLORS ────────────────────────────────────────
    CATEGORY_COLORS: [
        '#5aa9ff', '#ffb347', '#a78bfa', '#34d399', '#f87171',
        '#fbbf24', '#60a5fa', '#4ade80', '#fb923c', '#c084fc'
    ]
};

// ─── LOAD CONFIG FROM JSON (optional async fallback) ─────────
async function loadConfigFromJson() {
    try {
        const response = await fetch('config.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        // Merge JSON config into constants (JSON values override defaults)
        Object.assign(window.EDGEDESK_CONSTANTS, json);
        console.log('✓ Config loaded from JSON');
    } catch (err) {
        console.warn('⚠ Config.json unavailable, using defaults:', err.message);
    }
}

// Attempt to load JSON config immediately
loadConfigFromJson();

// ─── HELPER FUNCTIONS FOR CONFIGURATION ─────────────────────
// Allow environment variable overrides (for deployment flexibility)
function getConfigValue(key, defaultValue) {
    const envKey = `EDGEDESK_${key}`;
    const envVal = window[envKey] || undefined;
    
    if (envVal !== undefined) {
        // Try to parse as JSON first (for arrays/objects)
        try {
            return JSON.parse(envVal);
        } catch {
            // Fall back to string/number
            return envVal;
        }
    }
    
    // Fall back to constant value
    const constVal = window.EDGEDESK_CONSTANTS[key];
    if (constVal !== undefined) {
        return constVal;
    }
    
    return defaultValue;
}

// Make helper globally available
window.getConfigValue = getConfigValue;

// ─── EXPORT FOR NODE.JS/BUNDLERS (Optional) ──────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.EDGEDESK_CONSTANTS;
}
