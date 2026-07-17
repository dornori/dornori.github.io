// shared.js - Common functions for all pages
// REQUIRES: config.js must be loaded first
const API_BASE = getConfigValue('API_BASE', 'https://dornori-ticketing.dornori-info.workers.dev');

// ─── PERMISSION SERVICE ──────────────────────────────────────────
function hasAccess(page, action = 'view') {
    const user = getCurrentUser();
    if (!user?.effective_permissions) return false;
    const perms = user.effective_permissions[page];
    if (!perms) return false;
    return perms[action] === true;
}

function getCurrentUser() {
    try {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    } catch { return null; }
}

function getToken() {
    return localStorage.getItem('token');
}

function isAuthenticated() {
    return !!getToken() && !!getCurrentUser();
}

// ─── API HELPERS ────────────────────────────────────────────────
async function apiCall(path, options = {}) {
    const token = getToken();
    const headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    
    const response = await fetch(API_BASE + path, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'dashboard.html';
        throw new Error('Unauthorized');
    }
    
    if (response.status === 403) {
        throw new Error('Permission denied');
    }
    
    return response.json();
}

// ─── TOAST SYSTEM ───────────────────────────────────────────────
let toastTimer;

// Default durations from config
const TOAST_DEFAULTS = {
    success: () => getConfigValue('TOAST_DURATION_MS', 3500),
    error: () => getConfigValue('TOAST_DURATION_MS', 3500),
    warning: () => getConfigValue('TOAST_WARNING_DURATION_MS', 8000),
    info: () => getConfigValue('TOAST_DURATION_MS', 3500)
};

function showToast(message, type = 'success', duration = null) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    // Use default duration for type if not specified
    const finalDuration = duration ?? (TOAST_DEFAULTS[type] ? TOAST_DEFAULTS[type]() : TOAST_DEFAULTS.success());
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = message;
    
    const colors = {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const textColors = {
        success: '#166534',
        error: '#991b1b',
        warning: '#92400e',
        info: '#1e40af'
    };
    
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; padding: 12px 20px;
        border-radius: 8px; font-size: 14px; font-weight: 600; z-index: 9999;
        background: var(--bg-secondary); box-shadow: 0 4px 20px var(--shadow);
        border-left: 4px solid ${colors[type] || colors.info};
        color: ${textColors[type] || textColors.info};
        max-width: 420px;
        animation: slideUp 0.3s ease;
        pointer-events: auto;
    `;
    
    // Add close button for warning toasts
    if (type === 'warning') {
        toast.style.paddingRight = '36px';
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            position: absolute; top: 8px; right: 10px; background: none;
            border: none; font-size: 16px; cursor: pointer; color: inherit;
        `;
        closeBtn.onclick = () => toast.remove();
        toast.appendChild(closeBtn);
    }
    
    document.body.appendChild(toast);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, finalDuration);
}

// ─── DATE FORMATTING ────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        let cleaned = dateStr.replace(' ', 'T');
        if (!cleaned.includes('Z') && !cleaned.includes('+')) {
            cleaned += 'Z';
        }
        const d = new Date(cleaned);
        if (isNaN(d.getTime())) return dateStr;
        
        const options = getConfigValue('DATE_FORMAT_OPTIONS', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return d.toLocaleString(undefined, options);
    } catch { return dateStr; }
}

// ─── SLA DISPLAY ────────────────────────────────────────────────
function getSlaDisplay(status) {
    const map = {
        'on_track': { cls: 'sla-on-track', label: '✅ On Track' },
        'at_risk': { cls: 'sla-at-risk', label: '⚠️ At Risk' },
        'critical': { cls: 'sla-critical', label: '🔴 Critical' },
        'breached': { cls: 'sla-breached', label: '❌ Breached' },
        'paused': { cls: 'sla-paused', label: '⏸️ Paused' }
    };
    return map[status] || map['on_track'];
}

function getSlaColor(cls) {
    const map = {
        'sla-on-track': '#22c55e',
        'sla-at-risk': '#eab308',
        'sla-critical': '#f97316',
        'sla-breached': '#ef4444',
        'sla-paused': '#8892b0'
    };
    return map[cls] || '#8892b0';
}

// ─── CATEGORY COLORS ────────────────────────────────────────────
const CAT_COLORS = getConfigValue('CATEGORY_COLORS', [
    '#5aa9ff', '#ffb347', '#a78bfa', '#34d399', '#f87171',
    '#fbbf24', '#60a5fa', '#4ade80', '#fb923c', '#c084fc'
]);
const catColorMap = {};
let catColorIdx = 0;

function getCategoryColor(cat) {
    if (!cat) return '#8892b0';
    if (!catColorMap[cat]) {
        catColorMap[cat] = CAT_COLORS[catColorIdx % CAT_COLORS.length];
        catColorIdx++;
    }
    return catColorMap[cat];
}

// ─── HTML ESCAPING ──────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ─── THEME ──────────────────────────────────────────────────────
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
}

function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
}

// ─── NAVIGATION PERMISSION HELPER ──────────────────────────────
function setupNavigation() {
    const navItems = [
        { id: 'nav-reports', page: 'reports', href: 'reports.html' },
        { id: 'nav-newsletter', page: 'newsletter', href: 'newsletter.html' },
        { id: 'nav-order-reply', page: 'order_reply', href: 'order-reply.html' },
        { id: 'nav-settings', page: 'settings', href: 'settings.html' },
        { id: 'nav-users', page: 'users', href: 'users.html' }
    ];
    
    for (const item of navItems) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        
        const hasAccess_ = hasAccess(item.page, 'view');
        if (!hasAccess_) {
            el.classList.add('nav-disabled');
            el.setAttribute('aria-disabled', 'true');
            el.href = 'javascript:void(0)';
            el.style.pointerEvents = 'none';
        } else {
            el.classList.remove('nav-disabled');
            el.setAttribute('aria-disabled', 'false');
            el.href = item.href;
            el.style.pointerEvents = '';
        }
    }
}

// ─── PERMISSION CHECK FOR PAGE ──────────────────────────────────
function checkPageAccess(page) {
    if (!isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return false;
    }
    
    if (!hasAccess(page, 'view')) {
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <h1>⛔ Access Denied</h1>
                <p>You don't have permission to access this page.</p>
                <a href="dashboard.html" style="color: var(--accent);">← Back to Dashboard</a>
            </div>
        `;
        return false;
    }
    return true;
}

// ─── LOGOUT ──────────────────────────────────────────────────────
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('appConfig');
    localStorage.removeItem('appConfigVersion');
    window.location.href = 'dashboard.html';
}

// ─── USER BADGE ──────────────────────────────────────────────────
function renderUserBadge() {
    const u = getCurrentUser();
    if (!u) return;
    const initials = (u.name || u.email || '?')
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    const meta = [u.role, u.team_id].filter(Boolean).join(' · ');
    const el = document.getElementById('userDisplay');
    if (el) {
        el.innerHTML = `
            <div class="user-badge">
                <div class="user-badge-avatar">${initials}</div>
                <div class="user-badge-info">
                    <span class="user-badge-name">${u.name || u.email}</span>
                    <span class="user-badge-meta">${meta}</span>
                </div>
            </div>
        `;
    }
}

// ─── EXPOSE GLOBALLY ────────────────────────────────────────────
window.hasAccess = hasAccess;
window.getCurrentUser = getCurrentUser;
window.getToken = getToken;
window.isAuthenticated = isAuthenticated;
window.apiCall = apiCall;
window.showToast = showToast;
window.formatDate = formatDate;
window.getSlaDisplay = getSlaDisplay;
window.getSlaColor = getSlaColor;
window.getCategoryColor = getCategoryColor;
window.escapeHtml = escapeHtml;
window.setTheme = setTheme;
window.toggleTheme = toggleTheme;
window.initTheme = initTheme;
window.setupNavigation = setupNavigation;
window.checkPageAccess = checkPageAccess;
window.logout = logout;
window.renderUserBadge = renderUserBadge;

// Auto-init theme on load
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    renderUserBadge();
    setupNavigation();
});