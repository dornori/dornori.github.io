// config.js - Centralized configuration for all hardcoded values
// MUST be loaded FIRST before any other application scripts
// Load order: config.js → edgedeskconfig.js → shared.js → page-specific scripts

window.EDGEDESK_CONSTANTS = {
    // ─── APPLICATION META ───────────────────────────────────────
    APP_NAME: 'EdgeDesk',
    VERSION: '1.1.0',
    
    // ─── API CONFIGURATION ──────────────────────────────────────
    API_BASE: 'https://dornori-ticketing.dornori-info.workers.dev',
    
    // ─── UI TIMING (milliseconds) ───────────────────────────────
    TOAST_DURATION_MS: 3500,           // Default toast display time
    TOAST_WARNING_DURATION_MS: 8000,   // Warning toasts show longer
    
    // ─── WEBSOCKET CONFIGURATION ────────────────────────────────
    WS_RECONNECT_DELAY_MS: 5000,       // Initial reconnect delay
    WS_MAX_RECONNECT_DELAY_MS: 30000,  // Max backoff delay
    WS_PING_INTERVAL_MS: 30000,        // Send ping every 30s to keep connection alive
    WS_MAX_RECONNECT_ATTEMPTS: 5,      // Max attempts before giving up
    WS_EXPONENTIAL_BACKOFF_ENABLED: true, // Enable exponential backoff
    
    // ─── AUTHENTICATION & SESSION (seconds) ─────────────────────
    TOKEN_EXPIRY_SECONDS: 86400,       // 24 hours
    LOGIN_TIMEOUT_MINUTES: 30,         // Login form timeout
    SESSION_TIMEOUT_MINUTES: 60,       // Session inactivity timeout
    
    // ─── RATE LIMITING ──────────────────────────────────────────
    MAX_FAILED_LOGINS: 5,              // Max login attempts before lockout
    LOGIN_LOCKOUT_MINUTES: 15,         // Lock account for this duration
    RATE_LIMIT_WINDOW_MS: 60000,       // Rate limit window (1 minute)
    
    // ─── TICKET LOCKING (milliseconds) ──────────────────────────
    // Note: These control when locks are considered stale (expired)
    LOCK_STALE_WRITE_MS: 45000,        // Lock stale timeout for write operations
    LOCK_STALE_READ_MS: 30000,         // Lock stale timeout for read operations
    LOCK_CLEANUP_THRESHOLD_MS: 15000,  // Check for stale locks interval
    
    // ─── CACHING (seconds) ──────────────────────────────────────
    CACHE_TTL_SECONDS: 86400,          // 24 hours cache TTL
    CACHE_TICKET_TTL_SECONDS: 86400,   // Ticket cache expiry
    CACHE_USER_TTL_SECONDS: 3600,      // User cache expiry (1 hour)
    CACHE_CONFIG_TTL_SECONDS: 1800,    // Config cache expiry (30 mins)
    
    // ─── PAGINATION & LIMITS ────────────────────────────────────
    DEFAULT_PAGE_SIZE: 25,
    MAX_PAGE_SIZE: 100,
    MAX_BULK_OPERATIONS: 100,
    
    // ─── TICKET ASSIGNMENT ──────────────────────────────────────
    // IMPORTANT: Agents should ONLY be auto-assigned when they MODIFY a ticket
    // Not on mere viewing. Manual assignment only when:
    // - Agent explicitly assigns (themselves or others if privileged)
    // - TL/Manager/Admin assigns the ticket
    AUTO_ASSIGN_ON_MODIFY: true,       // Auto-assign self when agent makes updates
    AUTO_ASSIGN_ON_VIEW: false,        // DO NOT auto-assign on view-only access
    
    // ─── CORS CONFIGURATION (fallback if DB unavailable) ────────
    // These are used only if database is unreachable; normally from DB
    CORS_ORIGINS: [
        'https://dornori.com',
        'https://www.dornori.com',
        'https://dornori.github.io',
        'https://dornori-ticketing.dornori-info.workers.dev'
    ],
    
    // ─── DURABLE OBJECT ENDPOINTS (Service Binding URLs) ────────
    // Note: These are NOT real HTTP URLs—they use Durable Objects
    // The worker runtime intercepts these for local service communication
    DO_TICKET_CACHE_URL: 'https://cache/ticket-list',
    DO_RATE_LIMIT_CHECK: 'https://ticket-hub/rl-check',
    DO_RATE_LIMIT_FAIL: 'https://ticket-hub/rl-fail',
    DO_RATE_LIMIT_CLEAR: 'https://ticket-hub/rl-clear',
    DO_BROADCAST: 'https://ticket-hub/broadcast',
    DO_CONNECT: 'https://ticket-hub/connect',
    DO_USER_LOCKS: 'https://ticket-hub/user-locks',
    DO_LOCK: 'https://ticket-hub/lock',
    DO_CHECK_LOCK: 'https://ticket-hub/check-lock',
    DO_RELEASE: 'https://ticket-hub/release',
    
    // ─── SLA CONFIGURATION ──────────────────────────────────────
    SLA_WARNING_THRESHOLD_PERCENT: 80,  // Mark as at-risk at 80% of SLA time
    SLA_CRITICAL_THRESHOLD_PERCENT: 95, // Mark as critical at 95% of SLA time
    
    // ─── NOTIFICATION CONFIGURATION ────────────────────────────
    NOTIFICATION_REQUEST_DELAY_MS: 1000, // Delay before requesting notification permission
    
    // ─── DATE/TIME FORMATTING ───────────────────────────────────
    DATE_FORMAT_OPTIONS: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    },
    
    // ─── CATEGORY COLORS (for visual categorization) ────────────
    CATEGORY_COLORS: [
        '#5aa9ff', '#ffb347', '#a78bfa', '#34d399', '#f87171',
        '#fbbf24', '#60a5fa', '#4ade80', '#fb923c', '#c084fc'
    ]
};

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
