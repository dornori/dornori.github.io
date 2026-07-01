// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Dornori Ticketing Worker — v6.1 (SECURITY FIXES)
//  Changes: 
//  - EMPTY allowed_categories = NO category access (was ALL)
//  - EMPTY allowed_languages = NO language access (was ALL)
//  - User creation requires at least 1 language AND 1 category
//  - Tickets query returns empty if user has no categories/languages
//  - Stats respect category/language restrictions
//  - getAllAutoReplies() handles legacy keys as 'default' language
//  - saveAutoReply() allows empty from values
//  - NO hardcoded defaults anywhere
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── CACHE ─────────────────────────────────────────────────────
const cache = {
    settings: new Map(),
    users: new Map(),
    categories: null,
    languages: null,
    autoReplies: null,
    emailConfig: null,
    settingsTimestamp: 0,
    usersTimestamp: 0,
    emailConfigTimestamp: 0
};

const CACHE_TTL = 300000;

function isCacheValid(timestamp) {
    return Date.now() - timestamp < CACHE_TTL;
}

function clearCache() {
    cache.settings.clear();
    cache.users.clear();
    cache.categories = null;
    cache.languages = null;
    cache.autoReplies = null;
    cache.emailConfig = null;
    cache.settingsTimestamp = 0;
    cache.usersTimestamp = 0;
    cache.emailConfigTimestamp = 0;
}

// ─── EMAIL CONFIG (from KV - must be manually configured) ────
async function getEmailConfig(env) {
    if (cache.emailConfig !== null && isCacheValid(cache.emailConfigTimestamp)) {
        console.log('📧 EMAIL_CONFIG retrieved from cache');
        return cache.emailConfig;
    }
    try {
        console.log('📧 Attempting to retrieve EMAIL_CONFIG from KV...');
        const config = await env.KV.get('EMAIL_CONFIG', 'json');
        if (config) {
            console.log('✅ EMAIL_CONFIG retrieved from KV');
            cache.emailConfig = config;
            cache.emailConfigTimestamp = Date.now();
            return config;
        } else {
            console.error('❌ EMAIL_CONFIG not found in KV');
            throw new Error('EMAIL_CONFIG is required but not configured in KV');
        }
    } catch (e) {
        console.error('❌ getEmailConfig error:', e.message);
        throw new Error(`EMAIL_CONFIG required: ${e.message}`);
    }
}

// ─── AUTH ─────────────────────────────────────────────────────
async function sha256(m) {
    const b = new TextEncoder().encode(m);
    const h = await crypto.subtle.digest('SHA-256', b);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(email) { return btoa(`${email}:${Date.now()}`); }

function verifyToken(token) {
    try { const [email, ts] = atob(token).split(':'); if (Date.now() - parseInt(ts) > 86400000) return null; return email; } catch { return null; }
}

const ROLE_PERMISSIONS = {
    admin: ['tickets.view', 'tickets.view_all', 'tickets.update', 'tickets.assign', 'tickets.comment', 'tickets.reply', 'tickets.delete', 'users.view_all', 'users.edit_all', 'users.manage_permissions', 'users.delete', 'settings.view', 'settings.edit', 'newsletter.view', 'newsletter.send', 'reports.view', 'reports.view_all'],
    manager: ['tickets.view', 'tickets.view_all', 'tickets.update', 'tickets.assign', 'tickets.comment', 'tickets.reply', 'users.view_all', 'users.edit', 'users.manage_permissions', 'newsletter.view', 'reports.view', 'reports.view_all'],
    tl: ['tickets.view', 'tickets.update', 'tickets.assign', 'tickets.comment', 'tickets.reply', 'users.view_team', 'users.edit', 'newsletter.view', 'reports.view'],
    agent: ['tickets.view', 'tickets.update', 'tickets.comment', 'tickets.reply']
};

const VALID_ROLES = Object.keys(ROLE_PERMISSIONS);

async function getUser(email, env) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    
    if (cache.users.has(normalizedEmail) && isCacheValid(cache.usersTimestamp)) {
        return cache.users.get(normalizedEmail);
    }
    
    try {
        const row = await env.DB.prepare(`
            SELECT email, name, role, password_hash, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions 
            FROM users WHERE LOWER(email) = ?
        `).bind(normalizedEmail).first();
        
        if (row) {
            const role = row.role;
            if (!VALID_ROLES.includes(role)) {
                console.error(`Invalid role in database for ${row.email}: ${role}`);
                return null;
            }
            const permissions = ROLE_PERMISSIONS[role];
            const user = {
                email: row.email,
                name: row.name,
                role: role,
                password_hash: row.password_hash,
                permissions: permissions,
                allowed_languages: row.allowed_languages ? JSON.parse(row.allowed_languages) : [],
                allowed_emails: row.allowed_emails ? JSON.parse(row.allowed_emails) : [],
                allowed_categories: row.allowed_categories ? JSON.parse(row.allowed_categories) : [],
                page_permissions: row.page_permissions ? JSON.parse(row.page_permissions) : {},
                team_id: row.team_id,
                session_version: `v${Date.now()}`
            };
            cache.users.set(normalizedEmail, user);
            cache.usersTimestamp = Date.now();
            return user;
        }
    } catch (e) {
        console.error('getUser DB error:', e.message);
    }
    
    return null;
}

async function hasPermission(email, permission, env) {
    const user = await getUser(email, env);
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    // Parse permission string (e.g., "reports.view" -> page="reports", action="view")
    const [page, action] = permission.split('.');
    if (!page || !action) return false;
    
    // Check page_permissions structure: { page: { view: true, edit: false, ... } }
    const pagePerms = user.page_permissions || {};
    const perms = pagePerms[page] || {};
    return perms[action] === true;
}

// Some settings endpoints (category/language/email-routing management) are backed by a
// single generic write path that the UI gates behind separate create/edit/delete buttons.
// Accept it if the user has the specific action OR general edit rights.
async function hasSettingsWrite(email, action, env) {
    const user = await getUser(email, env);
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perms = (user.page_permissions || {}).settings || {};
    return perms.edit === true || perms[action] === true;
}

async function checkPagePermission(user, page) {
    if (user.role === 'admin') return true;
    const pagePerms = user.page_permissions || {};
    const perms = pagePerms[page] || {};
    // Check if user has at least view permission
    return perms.view === true;
}

// ─── SANITIZATION ─────────────────────────────────────────────
function sanitizeSubject(text) {
    if (!text) return '';
    let cleaned = text.replace(/\p{Emoji}/gu, '').replace(/[\x00-\x1F\x7F]/g, ' ');
    return cleaned.replace(/\s+/g, ' ').trim();
}

function sanitizeName(text) {
    if (!text) return '';
    let cleaned = text.replace(/\p{Emoji}/gu, '').replace(/[^\p{L}\p{N}\s\.\-']/gu, '');
    return cleaned.trim();
}

function normalizeCategory(c) {
    if (!c) return 'unclassified';
    return String(c).trim().toLowerCase().replace(/\s+/g, '-');
}

// ─── DEFAULT SETTINGS HELPERS ────────────────────────────────
async function getDefaultLanguage(env) {
    const lang = await getSetting(env, 'general', 'default_language');
    if (!lang) {
        throw new Error('Default language not configured. Please set general.default_language in settings.');
    }
    return lang;
}

async function getDefaultFrom(env) {
    const from = await getSetting(env, 'email', 'default_from');
    if (!from) {
        throw new Error('Default from address not configured. Please set email.default_from in settings.');
    }
    return from;
}

// ─── SETTINGS ─────────────────────────────────────────────────
async function getSetting(env, category, key) {
    const cacheKey = `${category}:${key}`;
    if (cache.settings.has(cacheKey) && isCacheValid(cache.settingsTimestamp)) {
        return cache.settings.get(cacheKey);
    }
    try {
        const r = await env.DB.prepare('SELECT value FROM settings WHERE category = ? AND key = ?').bind(category, key).first();
        const value = r ? r.value : null;
        cache.settings.set(cacheKey, value);
        cache.settingsTimestamp = Date.now();
        return value;
    } catch { return null; }
}

async function getAllSettings(env) {
    try {
        const r = await env.DB.prepare('SELECT * FROM settings ORDER BY category, key').all();
        return r.results || [];
    } catch { return []; }
}

async function updateSetting(env, category, key, value) {
    const existing = await env.DB.prepare('SELECT id FROM settings WHERE category = ? AND key = ?').bind(category, key).first();
    if (existing) {
        await env.DB.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE category = ? AND key = ?').bind(value, category, key).run();
    } else {
        await env.DB.prepare('INSERT INTO settings (category, key, value) VALUES (?, ?, ?)').bind(category, key, value).run();
    }
    const cacheKey = `${category}:${key}`;
    cache.settings.delete(cacheKey);
    cache.categories = null;
    cache.languages = null;
    cache.autoReplies = null;
}

async function getKnownCategories(env) {
    if (cache.categories !== null && isCacheValid(cache.settingsTimestamp)) {
        return cache.categories;
    }
    const cats = new Set(['unclassified']);
    try {
        const r = await env.DB.prepare(
            `SELECT key, value FROM settings WHERE category = 'category' AND key LIKE '%_description'`
        ).all();
        for (const row of r.results || []) {
            const slug = row.key.replace(/_description$/, '');
            if (row.value !== '__deleted__') cats.add(slug);
        }
    } catch (e) {}
    
    cache.categories = Array.from(cats);
    cache.settingsTimestamp = Date.now();
    return cache.categories;
}

async function getKnownLanguages(env) {
    if (cache.languages !== null && isCacheValid(cache.settingsTimestamp)) {
        return cache.languages;
    }
    try {
        const langs = await getSetting(env, 'languages', 'list');
        if (langs) {
            const parsed = JSON.parse(langs);
            cache.languages = parsed.map(l => l.code);
            cache.settingsTimestamp = Date.now();
            return cache.languages;
        }
    } catch (e) {}
    
    throw new Error('No languages configured. Please configure languages in settings.');
}

async function validateLanguage(language, env) {
    if (!language || language === '') {
        return await getDefaultLanguage(env);
    }
    
    const knownLangs = await getKnownLanguages(env);
    const normalized = language.toLowerCase().trim();
    if (!knownLangs.includes(normalized)) {
        throw new Error(`Language "${normalized}" not configured. Available: ${knownLangs.join(', ')}`);
    }
    return normalized;
}

async function validateRole(role) {
    if (!role) {
        throw new Error('Role is required');
    }
    if (!VALID_ROLES.includes(role)) {
        throw new Error(`Invalid role "${role}". Valid: ${VALID_ROLES.join(', ')}`);
    }
    return role;
}

async function validateCategory(category, env) {
    if (!category || category === '') {
        return 'unclassified';
    }
    
    const normalized = normalizeCategory(category);
    const knownCats = await getKnownCategories(env);
    if (!knownCats.includes(normalized)) {
        console.warn(`Category "${normalized}" not configured, falling back to "unclassified"`);
        return 'unclassified';
    }
    return normalized;
}

async function getTicketSnapshot(ticketId, env) {
    try {
        const ticket = await env.DB.prepare(`
            SELECT id, ticket_number, subject, status, category, language, 
                   sender_email, sender_name, priority, created_at, updated_at, last_action
            FROM tickets WHERE id = ?
        `).bind(ticketId).first();
        return ticket || null;
    } catch (e) {
        return null;
    }
}

// ─── AUTO-REPLY ──────────────────────────────────────────────
async function getAutoReply(env, category, language) {
    const cat = await validateCategory(category, env);
    const lang = await validateLanguage(language, env);
    
    if (cat === 'newsletter') {
        const langKeys = {
            enabled: `newsletter${lang === 'en' ? '' : '_' + lang}_enabled`,
            subject: `newsletter${lang === 'en' ? '' : '_' + lang}_subject`,
            body: `newsletter${lang === 'en' ? '' : '_' + lang}_body`,
            from: `newsletter${lang === 'en' ? '' : '_' + lang}_from`
        };
        let enabled = await getSetting(env, 'auto_reply', langKeys.enabled);
        if (enabled !== null) {
            const subject = await getSetting(env, 'auto_reply', langKeys.subject);
            const body = await getSetting(env, 'auto_reply', langKeys.body);
            const from = await getSetting(env, 'auto_reply', langKeys.from);
            
            if (!subject || !body) {
                throw new Error(`Newsletter auto-reply subject and body must be configured for language: ${lang}`);
            }
            
            return { enabled: enabled === '1', subject, body, from };
        }
        
        if (lang !== 'en') {
            const enKeys = {
                enabled: 'newsletter_enabled',
                subject: 'newsletter_subject',
                body: 'newsletter_body',
                from: 'newsletter_from'
            };
            enabled = await getSetting(env, 'auto_reply', enKeys.enabled);
            if (enabled !== null) {
                const subject = await getSetting(env, 'auto_reply', enKeys.subject);
                const body = await getSetting(env, 'auto_reply', enKeys.body);
                const from = await getSetting(env, 'auto_reply', enKeys.from);
                
                if (!subject || !body) {
                    throw new Error(`Newsletter auto-reply subject and body must be configured for language: en`);
                }
                
                return { enabled: enabled === '1', subject, body, from };
            }
        }
        
        throw new Error(`Newsletter auto-reply not configured for language: ${lang}`);
    }
    
    const langKeys = {
        enabled: `${cat}_${lang}_enabled`,
        subject: `${cat}_${lang}_subject`,
        body: `${cat}_${lang}_body`,
        from: `${cat}_${lang}_from`
    };
    let enabled = await getSetting(env, 'auto_reply', langKeys.enabled);
    if (enabled !== null) {
        const subject = await getSetting(env, 'auto_reply', langKeys.subject);
        const body = await getSetting(env, 'auto_reply', langKeys.body);
        const from = await getSetting(env, 'auto_reply', langKeys.from);
        
        if (!subject || !body) {
            throw new Error(`Auto-reply subject and body must be configured for category: ${cat}, language: ${lang}`);
        }
        
        return { enabled: enabled === '1', subject, body, from };
    }
    
    if (lang !== 'en') {
        const enKeys = {
            enabled: `${cat}_en_enabled`,
            subject: `${cat}_en_subject`,
            body: `${cat}_en_body`,
            from: `${cat}_en_from`
        };
        enabled = await getSetting(env, 'auto_reply', enKeys.enabled);
        if (enabled !== null) {
            const subject = await getSetting(env, 'auto_reply', enKeys.subject);
            const body = await getSetting(env, 'auto_reply', enKeys.body);
            const from = await getSetting(env, 'auto_reply', enKeys.from);
            
            if (!subject || !body) {
                throw new Error(`Auto-reply subject and body must be configured for category: ${cat}, language: en`);
            }
            
            return { enabled: enabled === '1', subject, body, from };
        }
    }
    
    const legacyEnabled = await getSetting(env, 'auto_reply', cat + '_enabled');
    if (legacyEnabled !== null) {
        const subject = await getSetting(env, 'auto_reply', cat + '_subject');
        const body = await getSetting(env, 'auto_reply', cat + '_body');
        const from = await getSetting(env, 'auto_reply', cat + '_from');
        
        if (!subject || !body) {
            throw new Error(`Legacy auto-reply subject and body must be configured for category: ${cat}`);
        }
        
        return { enabled: legacyEnabled === '1', subject, body, from };
    }
    
    throw new Error(`Auto-reply not configured for category: ${cat}, language: ${lang}`);
}

async function saveAutoReply(env, category, language, enabled, subject, body, from) {
    const cat = await validateCategory(category, env);
    const lang = await validateLanguage(language, env);
    
    if (!subject || !body) {
        throw new Error('Subject and body are required for auto-reply');
    }
    
    if (cat === 'newsletter') {
        const langKey = lang === 'en' ? '' : '_' + lang;
        await updateSetting(env, 'auto_reply', `newsletter${langKey}_enabled`, enabled ? '1' : '0');
        await updateSetting(env, 'auto_reply', `newsletter${langKey}_subject`, subject);
        await updateSetting(env, 'auto_reply', `newsletter${langKey}_body`, body);
        await updateSetting(env, 'auto_reply', `newsletter${langKey}_from`, from || '');
    } else {
        await updateSetting(env, 'auto_reply', `${cat}_${lang}_enabled`, enabled ? '1' : '0');
        await updateSetting(env, 'auto_reply', `${cat}_${lang}_subject`, subject);
        await updateSetting(env, 'auto_reply', `${cat}_${lang}_body`, body);
        await updateSetting(env, 'auto_reply', `${cat}_${lang}_from`, from || '');
    }
    cache.autoReplies = null;
}

async function deleteAutoReply(env, category, language) {
    const cat = await validateCategory(category, env);
    const lang = await validateLanguage(language, env);
    
    if (cat === 'newsletter') {
        const langKey = lang === 'en' ? '' : '_' + lang;
        await updateSetting(env, 'auto_reply', `newsletter${langKey}_enabled`, '0');
    } else {
        await updateSetting(env, 'auto_reply', `${cat}_${lang}_enabled`, '0');
    }
    cache.autoReplies = null;
}

async function getAllAutoReplies(env) {
    if (cache.autoReplies !== null && isCacheValid(cache.settingsTimestamp)) {
        return cache.autoReplies;
    }
    try {
        const r = await env.DB.prepare("SELECT * FROM settings WHERE category = 'auto_reply' ORDER BY category, key").all();
        const replies = {};
        for (const s of r.results || []) {
            const parts = s.key.split('_');
            if (parts.length < 2) continue;
            let cat, lang, suffix;
            
            if (s.key.startsWith('newsletter')) {
                if (s.key === 'newsletter_enabled' || s.key === 'newsletter_subject' || s.key === 'newsletter_body' || s.key === 'newsletter_from') {
                    cat = 'newsletter';
                    lang = 'default';
                    suffix = s.key.replace('newsletter_', '');
                } else {
                    const match = s.key.match(/^newsletter_([a-z]{2})_(enabled|subject|body|from)$/);
                    if (!match) continue;
                    cat = 'newsletter';
                    lang = match[1];
                    suffix = match[2];
                }
            } else {
                if (parts.length === 2) {
                    cat = parts[0];
                    lang = 'default';
                    suffix = parts[1];
                } else if (parts.length >= 3) {
                    cat = parts[0];
                    lang = parts[1];
                    suffix = parts.slice(2).join('_');
                } else {
                    continue;
                }
            }
            
            if (!replies[cat]) replies[cat] = {};
            if (!replies[cat][lang]) replies[cat][lang] = {};
            replies[cat][lang][suffix] = s.value;
        }
        const result = [];
        for (const cat in replies) {
            for (const lang in replies[cat]) {
                const r = replies[cat][lang];
                if (r.enabled === undefined || r.subject === undefined || r.body === undefined) continue;
                result.push({
                    category: cat,
                    language: lang,
                    enabled: r.enabled === '1' ? 1 : 0,
                    subject: r.subject || '',
                    body: r.body || '',
                    from: r.from || null
                });
            }
        }
        cache.autoReplies = result;
        cache.settingsTimestamp = Date.now();
        return result;
    } catch { return []; }
}

// ─── EMAIL ADDRESSES ──────────────────────────────────────────
async function getEmailAddresses(env, activeOnly = false) {
    try {
        const q = activeOnly ? 'SELECT * FROM email_addresses WHERE is_active = 1 ORDER BY label' : 'SELECT * FROM email_addresses ORDER BY label';
        const r = await env.DB.prepare(q).all();
        return r.results || [];
    } catch { return []; }
}

async function addEmailAddress(env, email, label, action, language) {
    if (!language) {
        throw new Error('Language is required for email address configuration');
    }
    await validateLanguage(language, env);
    await env.DB.prepare('INSERT INTO email_addresses (email, label, action, language) VALUES (?, ?, ?, ?)').bind(email, label, action, language).run();
}

async function updateEmailAddress(env, id, email, label, action, language, is_active) {
    if (language) {
        await validateLanguage(language, env);
    }
    await env.DB.prepare('UPDATE email_addresses SET email = ?, label = ?, action = ?, language = ?, is_active = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(email, label, action, language, is_active, id).run();
}

async function deleteEmailAddress(env, id) {
    await env.DB.prepare('DELETE FROM email_addresses WHERE id = ?').bind(id).run();
}

async function getEmailAddressConfig(env, toAddress) {
    if (!toAddress) {
        return { category: 'unclassified', language: await getDefaultLanguage(env) };
    }
    const clean = toAddress.toLowerCase().trim();
    try {
        const row = await env.DB.prepare('SELECT action, language FROM email_addresses WHERE is_active = 1 AND lower(email) = ?').bind(clean).first();
        if (row && row.action) {
            let category = normalizeCategory(row.action);
            let language = row.language;
            
            try {
                category = await validateCategory(category, env);
            } catch (e) {
                console.warn(`Category "${category}" not found, falling back to "unclassified"`);
                category = 'unclassified';
            }
            
            try {
                language = await validateLanguage(language, env);
            } catch (e) {
                console.warn(`Language "${language}" not valid, using default`);
                language = await getDefaultLanguage(env);
            }
            
            return { category, language };
        }
    } catch (e) {
        console.error('getEmailAddressConfig error:', e.message);
    }
    
    return { 
        category: 'unclassified', 
        language: await getDefaultLanguage(env) 
    };
}

// ─── NEWSLETTER ──────────────────────────────────────────────
async function addSubscriber(email, name, language, env) {
    let lang;
    try {
        lang = await validateLanguage(language, env);
    } catch (e) {
        console.warn(`Language "${language}" not configured, using default`);
        lang = await getDefaultLanguage(env);
    }
    
    const token = crypto.randomUUID();
    await env.DB.prepare(`
        INSERT INTO newsletter_subscribers (email, name, language, status, subscribed_at)
        VALUES (?, ?, ?, 'active', datetime("now"))
        ON CONFLICT(email) DO UPDATE SET status = 'active', name = ?, language = ?, subscribed_at = datetime("now")
    `).bind(email, name, lang, name, lang).run();
    const subscriber = await env.DB.prepare('SELECT * FROM newsletter_subscribers WHERE email = ?').bind(email).first();
    await env.DB.prepare(`
        INSERT INTO unsubscribe_tokens (subscriber_id, token, expires_at)
        VALUES (?, ?, datetime("now", "+365 days"))
        ON CONFLICT(subscriber_id) DO UPDATE SET token = ?, expires_at = datetime("now", "+365 days")
    `).bind(subscriber.id, token, token).run();
    return { subscriber, token };
}

async function unsubscribe(token, env) {
    const result = await env.DB.prepare('SELECT subscriber_id FROM unsubscribe_tokens WHERE token = ? AND expires_at > datetime("now")').bind(token).first();
    if (!result) return { success: false, message: 'Invalid or expired token' };
    await env.DB.prepare('UPDATE newsletter_subscribers SET status = "unsubscribed", unsubscribed_at = datetime("now") WHERE id = ?').bind(result.subscriber_id).run();
    return { success: true };
}

async function unsubscribeByEmail(email, env) {
    const clean = (email || '').toLowerCase().trim();
    if (!clean) return { success: false, message: 'Email required' };
    const subscriber = await env.DB.prepare('SELECT id FROM newsletter_subscribers WHERE lower(email) = ?').bind(clean).first();
    if (!subscriber) return { success: false, message: 'Email not found on our list' };
    await env.DB.prepare('UPDATE newsletter_subscribers SET status = "unsubscribed", unsubscribed_at = datetime("now") WHERE id = ?').bind(subscriber.id).run();
    return { success: true };
}

async function getSubscribers(env) {
    try {
        const r = await env.DB.prepare('SELECT id, email, name, language, status, subscribed_at, unsubscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC').all();
        return r.results || [];
    } catch { return []; }
}

async function deleteSubscriber(id, env) {
    await env.DB.prepare('DELETE FROM unsubscribe_tokens WHERE subscriber_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM newsletter_subscribers WHERE id = ?').bind(id).run();
}

async function buildUnsubscribeLink(env, token, language) {
    const domain = await getSetting(env, 'general', 'domain');
    if (!domain) {
        throw new Error('Domain not configured. Please set general.domain in settings.');
    }
    
    const lang = await validateLanguage(language, env);
    let unsubPath = await getSetting(env, 'newsletter', `unsubscribe_link_path_${lang}`);
    if (!unsubPath && lang !== 'en') {
        unsubPath = await getSetting(env, 'newsletter', 'unsubscribe_link_path_en');
    }
    if (!unsubPath) {
        unsubPath = await getSetting(env, 'newsletter', 'unsubscribe_link_path');
    }
    if (!unsubPath) {
        throw new Error(`Unsubscribe link path not configured for language: ${lang}`);
    }
    
    const cleanDomain = domain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    const cleanPath = unsubPath.replace(/^\//, '');
    return `https://${cleanDomain}/${cleanPath}?token=${token}`;
}

// ─── NEWSLETTERS ─────────────────────────────────────────────
async function createNewsletter(env, subject, body, language, status = 'draft') {
    const lang = language === 'all' ? 'all' : await validateLanguage(language, env);
    const result = await env.DB.prepare(
        `INSERT INTO newsletters (subject, body, language, status, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(subject, body || '', lang, status).run();
    const id = result.meta ? result.meta.last_row_id : result.lastInsertRowid;
    const row = await env.DB.prepare('SELECT * FROM newsletters WHERE id = ?').bind(id).first();
    return row;
}

async function getNewsletters(env) {
    const r = await env.DB.prepare('SELECT * FROM newsletters ORDER BY created_at DESC').all();
    return r.results || [];
}

async function deleteNewsletter(id, env) {
    await env.DB.prepare('DELETE FROM newsletters WHERE id = ?').bind(id).run();
}

async function sendNewsletter(env, subject, body, language) {
    const lang = language === 'all' ? null : await validateLanguage(language, env);
    
    let query = `SELECT ns.id, ns.email, ns.name, ns.language, ut.token FROM newsletter_subscribers ns
                 LEFT JOIN unsubscribe_tokens ut ON ut.subscriber_id = ns.id
                 WHERE ns.status = 'active'`;
    const params = [];
    if (lang) {
        query += ' AND ns.language = ?';
        params.push(lang);
    }
    
    const subscribers = await env.DB.prepare(query).bind(...params).all();
    const list = subscribers.results || [];
    let sent = 0;

    const BATCH_SIZE = 10;
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const batch = list.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (sub) => {
            const unsubLink = await buildUnsubscribeLink(env, sub.token, sub.language);
            let personalBody = body
                .replaceAll('{{subscriber_email}}',  sub.email)
                .replaceAll('{{subscriber_name}}',   sub.name || '')
                .replaceAll('{{unsubscribe_link}}',  unsubLink);
            
            const ar = await getAutoReply(env, 'newsletter', sub.language);
            let from = ar.from;
            if (!from || from === '') {
                from = await getDefaultFrom(env);
            }
            
            const res = await sendEmail(env, sub.email, subject, personalBody, from);
            if (res.success) sent++;
        }));
    }

    const result = await env.DB.prepare(
        `INSERT INTO newsletters (subject, body, language, status, created_at, sent_at, recipient_count) 
         VALUES (?, ?, ?, 'sent', datetime('now'), datetime('now'), ?)`
    ).bind(subject, body, language === 'all' ? 'all' : lang, sent).run();
    
    const newsletterId = result.meta ? result.meta.last_row_id : result.lastInsertRowid;
    const newsletter = await env.DB.prepare('SELECT * FROM newsletters WHERE id = ?').bind(newsletterId).first();
    return { newsletter, sent };
}

// ─── TICKET HELPERS ──────────────────────────────────────────
function generateTicketNumber() {
    const now = new Date();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `TKT-${now.getFullYear()}-${random}`;
}

async function getSLA(env, category) {
    const cat = await validateCategory(category, env);
    const resp = await getSetting(env, 'sla', cat + '_response');
    const resol = await getSetting(env, 'sla', cat + '_resolution');
    
    if (!resp || !resol) {
        throw new Error(`SLA response and resolution times must be configured for category: ${cat}`);
    }
    
    const respHours = parseInt(resp);
    const resolHours = parseInt(resol);
    
    if (isNaN(respHours) || isNaN(resolHours)) {
        throw new Error(`SLA times must be valid numbers for category: ${cat}`);
    }
    
    return {
        responseDue: new Date(Date.now() + respHours * 3600000).toISOString(),
        resolutionDue: new Date(Date.now() + resolHours * 3600000).toISOString()
    };
}

async function createTicket(data, env) {
    const ticketNumber = generateTicketNumber();
    const now = new Date().toISOString();
    const category = await validateCategory(data.category, env);
    const language = await validateLanguage(data.language, env);
    const sla = await getSLA(env, category);
    const subject = sanitizeSubject(data.subject || '');
    const senderName = sanitizeName(data.senderName || '');
    const result = await env.DB.prepare(`
        INSERT INTO tickets (ticket_number, category, language, status, priority, sender_name, sender_email, sender_phone, 
        order_number, subject, message, created_at, last_action, sla_response_due, sla_resolution_due, metadata)
        VALUES (?, ?, ?, 'new', 'medium', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        ticketNumber, category, language, senderName, data.senderEmail || '',
        data.senderPhone || '', data.orderNumber || '', subject, data.message || '',
        now, now, sla.responseDue, sla.resolutionDue, JSON.stringify(data.metadata || {})
    ).run();
    const id = result.meta?.last_row_id || result.lastInsertRowid;
    const ticket = {
        id,
        ticket_number: ticketNumber,
        category,
        language,
        status: 'new',
        sender_name: senderName,
        sender_email: data.senderEmail || '',
        subject,
        created_at: now,
        updated_at: now,
        sla_status: 'on_track',
        message: data.message || ''
    };
    await queueTicketNotification(env, 'created', id, ticket);
    return ticket;
}

async function queueTicketNotification(env, event, ticketId, ticketData) {
    try {
        const record = [
            event,
            ticketData.id || ticketId,
            ticketData.category || 'unclassified',
            ticketData.sla_status || 'on_track',
            ticketData.status || 'new',
            ticketData.subject || '',
            ticketData.sender_email || '',
            ticketData.created_at || new Date().toISOString(),
            ticketData.updated_at || new Date().toISOString()
        ].join('|');
        // Unique key per notification (instead of read-modify-write on one shared
        // key) so concurrent ticket creations - e.g. a burst of inbound emails -
        // can't overwrite and silently drop each other's queue entry.
        const key = `ticket_notif:${Date.now()}:${crypto.randomUUID()}`;
        await env.KV.put(key, record, { expirationTtl: 86400 });
    } catch (e) {
        console.log(`⚠️ Failed to queue notification: ${e.message}`);
    }
}

async function getTicket(id, env) {
    const ticket = await env.DB.prepare(`
        SELECT id, ticket_number, category, language, status, priority, 
               sender_name, sender_email, sender_phone, order_number,
               subject, message, created_at, updated_at, last_action, 
               sla_response_due, sla_resolution_due, assigned_to, metadata
        FROM tickets WHERE id = ?
    `).bind(id).first();
    if (!ticket) return null;
    const now = new Date();
    const rd = new Date(ticket.sla_response_due), rld = new Date(ticket.sla_resolution_due);
    ticket.sla_status = 'on_track';
    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
        if (now > rld) ticket.sla_status = 'breached';
        else if (now > rd) ticket.sla_status = 'at_risk';
    }
    const comments = await env.DB.prepare('SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC').bind(id).all();
    ticket.ticket_id = ticket.id;
    return { ...ticket, comments: comments.results || [] };
}

async function updateTicket(id, data, env) {
    const updates = [], values = [];
    if (data.status) { updates.push('status = ?'); values.push(data.status); }
    if (data.assigned_to) { updates.push('assigned_to = ?'); values.push(data.assigned_to); }
    if (data.priority) { updates.push('priority = ?'); values.push(data.priority); }
    if (updates.length === 0) return null;
    updates.push('last_action = datetime("now")', 'updated_at = datetime("now")');
    values.push(id);
    await env.DB.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    const ticket = await getTicket(id, env);
    await queueTicketNotification(env, 'updated', id, ticket);
    return ticket;
}

async function addComment(ticketId, data, env) {
    const now = new Date().toISOString();
    const result = await env.DB.prepare(`
        INSERT INTO ticket_comments (ticket_id, comment_type, author_email, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).bind(ticketId, data.type || 'public', data.authorEmail || '', data.content, now).run();
    await env.DB.prepare('UPDATE tickets SET last_action = ?, updated_at = ? WHERE id = ?').bind(now, now, ticketId).run();
    return { id: result.meta?.last_row_id || result.lastInsertRowid };
}

async function getTicketByNumber(ticketNumber, env) {
    return await env.DB.prepare('SELECT * FROM tickets WHERE ticket_number = ?').bind(ticketNumber).first();
}

// ─── TICKET LIST WITH CATEGORY FILTERING ────────────────────
// SECURITY FIX: Empty categories/languages = NO access (not ALL)
async function getTickets(filters, env, user) {
    let query = 'SELECT * FROM ticket_summary WHERE 1=1';
    const params = [];

    // SECURITY FIX: If user is not admin, they MUST have at least one language AND one category
    if (user && user.role !== 'admin') {
        // Check if user has ANY languages configured
        if (!user.allowed_languages || user.allowed_languages.length === 0) {
            console.warn(`User ${user.email} has no languages configured - returning empty results`);
            return [];
        }
        
        // Check if user has ANY categories configured
        if (!user.allowed_categories || user.allowed_categories.length === 0) {
            console.warn(`User ${user.email} has no categories configured - returning empty results`);
            return [];
        }
        
        // Apply language filter (MUST have at least one)
        const langPlaceholders = user.allowed_languages.map(() => '?').join(',');
        query += ` AND language IN (${langPlaceholders})`;
        params.push(...user.allowed_languages);
        
        // Apply category filter (MUST have at least one)
        const catPlaceholders = user.allowed_categories.map(() => '?').join(',');
        query += ` AND category IN (${catPlaceholders})`;
        params.push(...user.allowed_categories);
    }

    if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
        const placeholders = filters.statuses.map(() => '?').join(',');
        query += ` AND status IN (${placeholders})`;
        params.push(...filters.statuses);
    } else if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
    }

    if (filters.category) { query += ' AND category = ?'; params.push(filters.category); }
    if (filters.language) { query += ' AND language = ?'; params.push(filters.language); }

    const sortMap = {
        'sla': 'sla_status DESC, last_action DESC',
        'last_updated': 'last_action DESC',
        'created': 'created_at DESC'
    };
    const sort = filters.sort || 'last_updated';
    query += ` ORDER BY ${sortMap[sort] || 'last_action DESC'}`;

    const limit = filters.limit || 100;
    query += ' LIMIT ?';
    params.push(limit);
    if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
    }

    const r = await env.DB.prepare(query).bind(...params).all();
    return r.results || [];
}

// SECURITY FIX: Empty categories/languages = NO access (not ALL)
async function getTotalTicketCount(filters, env, user) {
    let query = 'SELECT COUNT(*) as total FROM ticket_summary WHERE 1=1';
    const params = [];

    // SECURITY FIX: If user is not admin, they MUST have at least one language AND one category
    if (user && user.role !== 'admin') {
        // Check if user has ANY languages configured
        if (!user.allowed_languages || user.allowed_languages.length === 0) {
            console.warn(`User ${user.email} has no languages configured - returning 0`);
            return 0;
        }
        
        // Check if user has ANY categories configured
        if (!user.allowed_categories || user.allowed_categories.length === 0) {
            console.warn(`User ${user.email} has no categories configured - returning 0`);
            return 0;
        }
        
        // Apply language filter (MUST have at least one)
        const langPlaceholders = user.allowed_languages.map(() => '?').join(',');
        query += ` AND language IN (${langPlaceholders})`;
        params.push(...user.allowed_languages);
        
        // Apply category filter (MUST have at least one)
        const catPlaceholders = user.allowed_categories.map(() => '?').join(',');
        query += ` AND category IN (${catPlaceholders})`;
        params.push(...user.allowed_categories);
    }

    if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
        const placeholders = filters.statuses.map(() => '?').join(',');
        query += ` AND status IN (${placeholders})`;
        params.push(...filters.statuses);
    } else if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
    }

    if (filters.category) { query += ' AND category = ?'; params.push(filters.category); }
    if (filters.language) { query += ' AND language = ?'; params.push(filters.language); }

    const r = await env.DB.prepare(query).bind(...params).first();
    return r ? r.total : 0;
}

// ─── STATS ────────────────────────────────────────────────────
// SECURITY FIX: Empty categories/languages = NO access (not ALL)
async function getStats(env, user) {
    let query = 'SELECT status, COUNT(*) as count FROM tickets WHERE 1=1';
    const params = [];
    
    // SECURITY FIX: If user is not admin, they MUST have at least one language AND one category
    if (user && user.role !== 'admin') {
        // Check if user has ANY languages configured
        if (!user.allowed_languages || user.allowed_languages.length === 0) {
            console.warn(`User ${user.email} has no languages configured - returning empty stats`);
            return { new: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 };
        }
        
        // Check if user has ANY categories configured
        if (!user.allowed_categories || user.allowed_categories.length === 0) {
            console.warn(`User ${user.email} has no categories configured - returning empty stats`);
            return { new: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 };
        }
        
        // Apply language filter (MUST have at least one)
        const langPlaceholders = user.allowed_languages.map(() => '?').join(',');
        query += ` AND language IN (${langPlaceholders})`;
        params.push(...user.allowed_languages);
        
        // Apply category filter (MUST have at least one)
        const catPlaceholders = user.allowed_categories.map(() => '?').join(',');
        query += ` AND category IN (${catPlaceholders})`;
        params.push(...user.allowed_categories);
    }
    
    query += ' GROUP BY status';
    const r = params.length > 0 
        ? await env.DB.prepare(query).bind(...params).all()
        : await env.DB.prepare(query).all();
    
    const stats = { new: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 };
    for (const row of r.results || []) if (stats.hasOwnProperty(row.status)) stats[row.status] = row.count;
    return stats;
}

// ─── REPORTS ─────────────────────────────────────────────────
async function getReports(env) {
    const result = {
        status: { new: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 },
        daily: [],
        categories: {},
        top_senders: [],
        sla: { on_track: 0, at_risk: 0, breached: 0 }
    };
    
    try {
        const combinedRes = await env.DB.prepare(`
            SELECT 
                status,
                category,
                date(created_at) as day,
                COUNT(*) as count
            FROM tickets
            WHERE created_at >= datetime('now', '-30 days')
            GROUP BY status, category, date(created_at)
        `).all();
        
        const rows = combinedRes.results || [];
        const dailyMap = {};
        const categoryMap = {};
        
        for (const row of rows) {
            if (result.status.hasOwnProperty(row.status)) {
                result.status[row.status] += row.count;
            }
            const dayKey = row.day;
            if (!dailyMap[dayKey]) dailyMap[dayKey] = 0;
            dailyMap[dayKey] += row.count;
            if (!categoryMap[row.category]) categoryMap[row.category] = 0;
            categoryMap[row.category] += row.count;
        }
        
        result.daily = Object.entries(dailyMap)
            .map(([day, count]) => ({ day, count }))
            .sort((a, b) => a.day.localeCompare(b.day));
        
        result.categories = categoryMap;
        
    } catch(e) {}
    
    try {
        const senderRes = await env.DB.prepare(`
            SELECT sender_email, COUNT(*) as count FROM tickets
            WHERE sender_email != '' GROUP BY sender_email ORDER BY count DESC LIMIT 10
        `).all();
        result.top_senders = senderRes.results || [];
    } catch(e) {}
    
    try {
        const slaQuery = `
            SELECT 
                COUNT(CASE WHEN status IN ('resolved','closed') OR datetime(sla_resolution_due) > datetime('now') THEN 1 END) as on_track,
                COUNT(CASE WHEN status NOT IN ('resolved','closed') AND datetime(sla_response_due) < datetime('now') AND datetime(sla_resolution_due) > datetime('now') THEN 1 END) as at_risk,
                COUNT(CASE WHEN status NOT IN ('resolved','closed') AND datetime(sla_resolution_due) < datetime('now') THEN 1 END) as breached
            FROM tickets
        `;
        const slaResult = await env.DB.prepare(slaQuery).first();
        result.sla = {
            on_track: slaResult.on_track || 0,
            at_risk: slaResult.at_risk || 0,
            breached: slaResult.breached || 0
        };
    } catch(e) {
        result.sla = { on_track: 0, at_risk: 0, breached: 0 };
    }
    return result;
}

// ─── EMAIL ────────────────────────────────────────────────────
function formatEmailBody(text) {
    if (!text) return '';
    const blockTagRegex = /<(?:p|div|h[1-6]|ul|ol|blockquote)[\s>]/i;
    if (blockTagRegex.test(text)) return text;
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r\n|\r|\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p>\s*<\/p>/g, '');
    return html;
}

async function sendEmail(env, to, subject, body, from) {
    if (!env.SCRIPT_URL) {
        console.error('❌ SCRIPT_URL missing from env');
        return { success: false, error: 'SCRIPT_URL missing' };
    }
    
    if (!from || from === '') {
        console.error('❌ From address is required');
        return { success: false, error: 'From address is required' };
    }
    
    console.log('📧 sendEmail called - to:', to, 'from:', from);
    
    const emailConfig = await getEmailConfig(env);
    if (!emailConfig) {
        console.error('❌ EMAIL_CONFIG not available - email cannot be sent');
        return { success: false, error: 'Email configuration missing' };
    }
    
    console.log('✅ EMAIL_CONFIG loaded successfully');
    
    try {
        let htmlBody = body || '';
        const footerKey = 'footer_' + (from || '').replace(/[^a-z0-9]/gi, '_');
        let footer = await getSetting(env, 'email', footerKey);
        if (footer === null) footer = await getSetting(env, 'email', 'footer_html');
        if (footer) htmlBody += '\n\n' + footer;
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${htmlBody}</body></html>`;
        const safeSubject = subject ? subject.replace(/[<>]/g, '') : '';
        const params = {
            secret: emailConfig.secret,
            username: emailConfig.username,
            password: emailConfig.password,
            to,
            subject: safeSubject,
            message: fullHtml,
            from: from
        };
        console.log('📤 Sending to Apps Script with username and secret configured');
        const formBody = Object.keys(params)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
            .join('&');
        const res = await fetch(env.SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formBody
        });
        const data = await res.json();
        if (data.status === 'success') {
            console.log('✅ Email sent successfully to:', to);
            return { success: true };
        } else {
            console.error('❌ Apps Script returned error:', data.message || 'Unknown error');
            return { success: false, error: data.message || 'Apps Script error' };
        }
    } catch (err) {
        console.error('❌ sendEmail exception:', err.message);
        return { success: false, error: err.message };
    }
}

// ─── AUTO-REPLY FUNCTIONS ────────────────────────────────────
async function sendTicketConfirmation(ticket, env, emailOverride) {
    const email = emailOverride || ticket.sender_email;
    if (!email) return { success: false, error: 'No email' };
    const cat = await validateCategory(ticket.category, env);
    const lang = await validateLanguage(ticket.language, env);
    const ar = await getAutoReply(env, cat, lang);
    if (!ar || !ar.enabled) return { success: true, skipped: true };

    let subject = ar.subject;
    let body = ar.body;

    const replacements = {
        '{{ticket_id}}': ticket.ticket_number,
        '{{sender_name}}': ticket.sender_name || '',
        '{{sender_email}}': ticket.sender_email || '',
        '{{category}}': cat,
        '{{subject}}': ticket.subject || ''
    };
    for (const [tag, val] of Object.entries(replacements)) {
        subject = subject.replaceAll(tag, val);
        body = body.replaceAll(tag, val);
    }

    const formattedBody = formatEmailBody(body);
    let from = ar.from;
    if (!from || from === '') {
        from = await getDefaultFrom(env);
    }
    return await sendEmail(env, email, subject, formattedBody, from);
}

async function sendNewsletterConfirmation(env, email, token, language) {
    const lang = await validateLanguage(language, env);
    const ar = await getAutoReply(env, 'newsletter', lang);
    
    if (!ar || !ar.enabled) return { success: true, skipped: true };

    let subject = ar.subject;
    let body = ar.body;

    const unsubscribeLink = await buildUnsubscribeLink(env, token, lang);
    const replacements = {
        '{{subscriber_email}}': email,
        '{{unsubscribe_link}}': unsubscribeLink
    };
    for (const [tag, val] of Object.entries(replacements)) {
        subject = subject.replaceAll(tag, val);
        body = body.replaceAll(tag, val);
    }

    const formattedBody = formatEmailBody(body);
    let from = ar.from;
    if (!from || from === '') {
        from = await getDefaultFrom(env);
    }
    return await sendEmail(env, email, subject, formattedBody, from);
}

// ─── PARSE EMAIL ─────────────────────────────────────────────
function decodeQuotedPrintable(str) {
    str = str.replace(/=\r\n/g, '').replace(/=\n/g, '');
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(str.substr(i + 1, 2))) {
            bytes.push(parseInt(str.substr(i + 1, 2), 16));
            i += 2;
        } else {
            bytes.push(str.charCodeAt(i));
        }
    }
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}

function decodeBase64Body(str) {
    try {
        const clean = str.replace(/[^A-Za-z0-9+/=]/g, '');
        const binary = atob(clean);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
    } catch { return str; }
}

function looksLikeBase64(str) {
    const clean = str.replace(/\s+/g, '');
    return clean.length > 20 && clean.length % 4 === 0 && /^[A-Za-z0-9+/]+=*$/.test(clean);
}

function decodePartBody(headerBlock, rawBody) {
    const encMatch = (headerBlock || '').match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
    const encoding = encMatch ? encMatch[1].trim().toLowerCase() : '';
    if (encoding === 'base64') return decodeBase64Body(rawBody);
    if (encoding === 'quoted-printable') return decodeQuotedPrintable(rawBody);
    if (!encoding && looksLikeBase64(rawBody)) return decodeBase64Body(rawBody);
    return rawBody;
}

function cleanupBody(text) {
    return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function parseEmail(rawStream) {
    try {
        const rawText = await new Response(rawStream).text();
        let subject = 'No subject', from = 'unknown@example.com', body = '';
        const sMatch = rawText.match(/^Subject:\s*([^\r\n]+)/im);
        if (sMatch) subject = sMatch[1].trim();
        const fMatch = rawText.match(/^From:\s*([^\r\n]+)/im);
        if (fMatch) {
            from = fMatch[1].trim();
            const emailMatch = from.match(/<([^>]+)>/);
            if (emailMatch) from = emailMatch[1];
        }
        const parts = rawText.split(/\r\n\r\n|\n\n/);
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].includes('Content-Type: text/plain') && i + 1 < parts.length) {
                let next = parts[i + 1].replace(/^[A-Za-z-]+: .*\n/gm, '').replace(/^--.*/gm, '').trim();
                let decoded = cleanupBody(decodePartBody(parts[i], next));
                if (decoded.length > 5) { body = decoded; break; }
            }
        }
        if (!body && parts.length > 1) {
            let last = parts[parts.length - 1].replace(/^[A-Za-z-]+: .*\n/gm, '').replace(/^--.*/gm, '').trim();
            let decoded = cleanupBody(decodePartBody(parts[parts.length - 2], last));
            if (decoded.length > 5) body = decoded;
        }
        if (body && body.length > 5000) body = body.substring(0, 5000);
        return { from, subject, body };
    } catch { return { from: 'unknown@example.com', subject: 'No subject', body: '' }; }
}

// ─── CATEGORY DELETE HELPER ───────────────────────────────────
async function deleteCategoryData(env, cat) {
    // Sanitize the category slug - only allow safe characters
    if (!cat || !/^[a-z0-9\-_]+$/.test(cat)) {
        throw new Error('Invalid category slug');
    }
    
    // Delete exact matches for known keys
    const exactKeys = [
        { category: 'category', key: cat + '_description' },
        { category: 'category', key: cat + '_color' },
        { category: 'sla', key: cat + '_response' },
        { category: 'sla', key: cat + '_resolution' },
        { category: 'auto_reply', key: cat + '_enabled' },
        { category: 'auto_reply', key: cat + '_subject' },
        { category: 'auto_reply', key: cat + '_body' },
        { category: 'auto_reply', key: cat + '_from' }
    ];
    
    for (const item of exactKeys) {
        await env.DB.prepare('DELETE FROM settings WHERE category = ? AND key = ?').bind(item.category, item.key).run();
    }
    
    // Delete all language-specific auto-reply keys
    // Safe approach: get all auto_reply keys and filter in JavaScript
    const result = await env.DB.prepare(
        "SELECT key FROM settings WHERE category = 'auto_reply'"
    ).all();
    
    const keysToDelete = [];
    for (const row of result.results || []) {
        if (row.key.startsWith(cat + '_')) {
            keysToDelete.push(row.key);
        }
    }
    
    for (const key of keysToDelete) {
        await env.DB.prepare('DELETE FROM settings WHERE category = ? AND key = ?').bind('auto_reply', key).run();
    }
    
    // Clear cache
    cache.categories = null;
    cache.autoReplies = null;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────
export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        };
        if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

        const json = (data, status = 200) =>
            new Response(JSON.stringify(data), {
                status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        try {
            // ── Reports ──
            if (path === '/api/admin/reports' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'reports.view', env)) return json({ error: 'Permission denied' }, 403);
                return json({ success: true, data: await getReports(env) });
            }

            // ── Stats ──
            if (path === '/api/admin/stats' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'tickets.view', env)) return json({ error: 'Permission denied' }, 403);
                const user = await getUser(email, env);
                return json({ success: true, stats: await getStats(env, user) });
            }

            // ── Auto-reply ──
            if (path === '/api/admin/auto-reply' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'settings.view', env)) return json({ error: 'Permission denied' }, 403);
                return json({ success: true, data: await getAllAutoReplies(env) });
            }
            if (path === '/api/admin/auto-reply' && method === 'PUT') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasSettingsWrite(email, 'create', env)) return json({ error: 'Permission denied' }, 403);
                const { category, language, enabled, subject, body, from } = await request.json();
                if (!category || !language) return json({ error: 'Category and language required' }, 400);
                try {
                    await saveAutoReply(env, category, language, enabled, subject, body, from);
                    return json({ success: true });
                } catch (e) {
                    return json({ error: e.message }, 400);
                }
            }
            if (path === '/api/admin/auto-reply' && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasSettingsWrite(email, 'delete', env)) return json({ error: 'Permission denied' }, 403);
                const { category, language } = await request.json();
                if (!category || !language) return json({ error: 'Category and language required' }, 400);
                try {
                    await deleteAutoReply(env, category, language);
                    return json({ success: true });
                } catch (e) {
                    return json({ error: e.message }, 400);
                }
            }

            // ── Email Addresses ──
            if (path === '/api/admin/email-addresses' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'settings.view', env)) return json({ error: 'Permission denied' }, 403);
                const activeOnly = url.searchParams.get('active_only') === 'true';
                const addresses = await getEmailAddresses(env, activeOnly);
                return json({ success: true, addresses: addresses });
            }
            if (path === '/api/admin/email-addresses' && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasSettingsWrite(email, 'create', env)) return json({ error: 'Permission denied' }, 403);
                const { email: newEmail, label, action, language } = await request.json();
                if (!newEmail || !label || !language) return json({ error: 'Email, label and language required' }, 400);
                try {
                    const cat = await validateCategory(action || label, env);
                    await addEmailAddress(env, newEmail, label, cat, language);
                    return json({ success: true });
                } catch (e) {
                    return json({ error: e.message }, 400);
                }
            }
            if (path.match(/^\/api\/admin\/email-addresses\/\d+$/) && method === 'PUT') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasSettingsWrite(email, 'edit', env)) return json({ error: 'Permission denied' }, 403);
                const id = parseInt(path.split('/')[4]);
                const { email: newEmail, label, action, language, is_active } = await request.json();
                try {
                    const cat = await validateCategory(action || label, env);
                    
                    // If language not provided, get existing one from DB
                    let lang = language;
                    if (lang === undefined || lang === null) {
                        const existing = await env.DB.prepare('SELECT language FROM email_addresses WHERE id = ?').bind(id).first();
                        lang = existing ? existing.language : null;
                    }
                    
                    await updateEmailAddress(env, id, newEmail, label, cat, lang, is_active);
                    return json({ success: true });
                } catch (e) {
                    return json({ error: e.message }, 400);
                }
            }
            if (path.match(/^\/api\/admin\/email-addresses\/\d+$/) && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasSettingsWrite(email, 'delete', env)) return json({ error: 'Permission denied' }, 403);
                const id = parseInt(path.split('/')[4]);
                await deleteEmailAddress(env, id);
                return json({ success: true });
            }

            // ── Settings ──
            if (path === '/api/admin/settings' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'settings.view', env)) return json({ error: 'Permission denied' }, 403);
                const settingsArray = await getAllSettings(env);
                const grouped = {};
                for (const s of settingsArray) {
                    if (!grouped[s.category]) grouped[s.category] = {};
                    grouped[s.category][s.key] = s.value;
                }
                try {
                    let supportEmailsStr = await getSetting(env, 'email', 'support_emails_list');
                    const supportEmails = supportEmailsStr ? JSON.parse(supportEmailsStr) : [];
                    const usersResult = await env.DB.prepare('SELECT DISTINCT team_id FROM users WHERE team_id IS NOT NULL AND team_id != "" ORDER BY team_id').all();
                    const teamIds = (usersResult.results || []).map(r => r.team_id);
                    const teams = teamIds.map(id => ({ id, name: id }));
                    return json({ success: true, data: grouped, settings: settingsArray, support_emails: supportEmails, teams: teams });
                } catch (e) {
                    return json({ success: true, data: grouped, settings: settingsArray, support_emails: [], teams: [] });
                }
            }
            if (path === '/api/admin/settings' && method === 'PUT') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                // This single endpoint backs general/SLA settings (edit), category add/language add (create),
                // and category/language removal (delete) -- accept any settings write permission.
                if (!await hasSettingsWrite(email, 'create', env) && !await hasSettingsWrite(email, 'delete', env)) return json({ error: 'Permission denied' }, 403);
                const { settings } = await request.json();
                for (const s of settings) await updateSetting(env, s.category, s.key, s.value);
                return json({ success: true });
            }

            // ── Newsletter admin ──
            if (path === '/api/admin/newsletters' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'newsletter.view', env)) return json({ error: 'Permission denied' }, 403);
                return json({ success: true, data: await getNewsletters(env) });
            }
            if (path === '/api/admin/newsletters' && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'newsletter.send', env)) return json({ error: 'Permission denied' }, 403);
                const { subject, body, language, status } = await request.json();
                if (!subject || !body || !language) return json({ error: 'Subject, body and language required' }, 400);
                try {
                    if (status === 'draft') {
                        const newsletter = await createNewsletter(env, subject, body, language, 'draft');
                        return json({ success: true, newsletter, sent: 0 });
                    }
                    const result = await sendNewsletter(env, subject, body, language);
                    return json({ success: true, newsletter: result.newsletter, sent: result.sent });
                } catch (e) {
                    return json({ error: e.message }, 400);
                }
            }
            if (path.match(/^\/api\/admin\/newsletters\/\d+$/) && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'newsletter.send', env)) return json({ error: 'Permission denied' }, 403);
                const id = parseInt(path.split('/')[4]);
                await deleteNewsletter(id, env);
                return json({ success: true });
            }

            // ── Newsletter subscribers ──
            if (path === '/api/admin/subscribers' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'newsletter.view', env)) return json({ error: 'Permission denied' }, 403);
                return json({ success: true, data: await getSubscribers(env) });
            }
            if (path.match(/^\/api\/admin\/subscribers\/\d+$/) && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'newsletter.send', env)) return json({ error: 'Permission denied' }, 403);
                const id = parseInt(path.split('/')[4]);
                await deleteSubscriber(id, env);
                return json({ success: true });
            }

            // ── Subscribe ──
            if (path === '/api/subscribe' && method === 'POST') {
                const { email, name, language } = await request.json();
                if (!email) return json({ error: 'Email required' }, 400);
                try {
                    let lang;
                    try {
                        lang = await validateLanguage(language, env);
                    } catch (e) {
                        lang = await getDefaultLanguage(env);
                    }
                    const { subscriber, token } = await addSubscriber(email, name || '', lang, env);
                    const ticket = await createTicket({
                        category: 'newsletter', senderName: name || '', senderEmail: email,
                        subject: 'Newsletter Subscription', message: 'Subscribed via website',
                        language: lang,
                        metadata: { subscriberId: subscriber.id }
                    }, env);
                    await sendNewsletterConfirmation(env, email, token, lang);
                    return json({ success: true, subscriberId: subscriber.id, ticketNumber: ticket.ticket_number });
                } catch (e) {
                    return json({ error: e.message }, 400);
                }
            }

            // ── Unsubscribe ──
            if (path.startsWith('/api/unsubscribe/') && method === 'GET') {
                const token = path.replace('/api/unsubscribe/', '');
                const result = await unsubscribe(token, env);
                if (result.success) {
                    return new Response('✅ Unsubscribed successfully', { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
                } else {
                    return new Response('❌ Invalid or expired token', { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
                }
            }
            if (path === '/api/unsubscribe-email' && method === 'POST') {
                const { email } = await request.json();
                const result = await unsubscribeByEmail(email, env);
                return json(result, result.success ? 200 : 400);
            }

            // ── Public message ──
            if (path === '/api/message' && method === 'POST') {
                const data = await request.json();
                const isSupportForm = data.originalCategory || data.troubleshooting;

                let category, senderName, senderEmail, orderNumber, subject, message, language, metadata;

                try {
                    if (isSupportForm) {
                        const originalCat = data.originalCategory || 'General';
                        let catSlug = normalizeCategory(originalCat);
                        category = await validateCategory(catSlug, env);
                        language = await validateLanguage(data.language, env);
                        senderName = data.name || '';
                        senderEmail = data.email || '';
                        orderNumber = data.orderNumber || '';
                        subject = originalCat + ' support request';
                        let msgParts = [];
                        if (data.troubleshooting?.length) {
                            msgParts.push('Troubleshooting steps:', data.troubleshooting.join('\n'));
                        }
                        if (data.additionalComments?.length) {
                            msgParts.push('Additional comments:', data.additionalComments.join('\n'));
                        }
                        message = msgParts.join('\n\n') || 'No details provided.';
                        metadata = { source: 'support-form', referenceNumber: data.referenceNumber || '', originalCategory: originalCat };
                    } else {
                        let rawCategory = data.category || data.originalCategory || 'support';
                        if (['contact', 'support-request'].includes(rawCategory)) rawCategory = 'support';
                        category = await validateCategory(rawCategory, env);
                        language = await validateLanguage(data.language, env);
                        senderName = data.name || data.fullName || '';
                        senderEmail = data.email || '';
                        orderNumber = data.orderNumber || '';
                        subject = data.subject || 'Website Inquiry';
                        message = data.message || data.additionalComments || 'No message provided';
                        metadata = { source: 'website', raw: data };
                    }

                    const ticket = await createTicket({ category, senderName, senderEmail, orderNumber, subject, message, language, metadata }, env);
                    if (senderEmail) await sendTicketConfirmation(ticket, env, senderEmail);
                    return json({ success: true, ticketNumber: ticket.ticket_number, ticketId: ticket.id });
                } catch (e) {
                    return json({ error: e.message }, 400);
                }
            }

            // ── Current user (refresh permissions without re-login) ──
            if (path === '/api/admin/me' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                const user = await getUser(email, env);
                if (!user) return json({ error: 'Unauthorized' }, 401);
                return json({
                    success: true,
                    user: {
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        page_permissions: user.page_permissions,
                        allowed_languages: user.allowed_languages,
                        allowed_emails: user.allowed_emails,
                        allowed_categories: user.allowed_categories,
                        team_id: user.team_id
                    }
                });
            }

            // ── Admin login ──
            if (path === '/api/admin/login' && method === 'POST') {
                const { email, password } = await request.json();
                const normalizedEmail = (email || '').toLowerCase().trim();
                const user = await getUser(normalizedEmail, env);
                if (!user) return json({ error: 'Invalid credentials' }, 401);
                if ((await sha256(password)) !== user.password_hash) return json({ error: 'Invalid credentials' }, 401);
                return json({ 
                    success: true, 
                    token: generateToken(normalizedEmail), 
                    user: { 
                        email: user.email, 
                        name: user.name, 
                        role: user.role, 
                        page_permissions: user.page_permissions, 
                        allowed_languages: user.allowed_languages, 
                        allowed_emails: user.allowed_emails,
                        allowed_categories: user.allowed_categories,
                        team_id: user.team_id 
                    } 
                });
            }

            // ── User profile ──
            if (path === '/api/admin/user-profile' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                const user = await getUser(email, env);
                return json({ 
                    success: true, 
                    user: { 
                        email: user.email, 
                        name: user.name, 
                        role: user.role, 
                        page_permissions: user.page_permissions, 
                        allowed_languages: user.allowed_languages, 
                        allowed_emails: user.allowed_emails,
                        allowed_categories: user.allowed_categories,
                        team_id: user.team_id 
                    } 
                });
            }

            // ── Get all users (admin only) ──
            if (path === '/api/admin/users' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                const user = await getUser(email, env);
                if (!await hasPermission(email, 'users.view_all', env)) return json({ error: 'Permission denied' }, 403);
                try {
                    const users = await env.DB.prepare('SELECT email, name, role, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions FROM users ORDER BY email').all();
                    const results = (users.results || []).map(u => {
                        const role = u.role;
                        if (!VALID_ROLES.includes(role)) {
                            console.error(`Invalid role in database for ${u.email}: ${role}`);
                            return null;
                        }
                        return {
                            email: u.email, 
                            name: u.name, 
                            role: role,
                            allowed_languages: u.allowed_languages ? JSON.parse(u.allowed_languages) : [],
                            allowed_emails: u.allowed_emails ? JSON.parse(u.allowed_emails) : [],
                            allowed_categories: u.allowed_categories ? JSON.parse(u.allowed_categories) : [],
                            team_id: u.team_id || null,
                            page_permissions: u.page_permissions ? JSON.parse(u.page_permissions) : {}
                        };
                    }).filter(Boolean);
                    return json({ success: true, users: results });
                } catch (e) {
                    return json({ success: true, users: [] });
                }
            }

            // ── Add user ──
            if (path === '/api/admin/users' && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'users.manage_permissions', env)) return json({ error: 'Permission denied' }, 403);
                const { email: newEmail, name, password, role, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions } = await request.json();
                const normalizedNewEmail = (newEmail || '').toLowerCase().trim();
                if (!normalizedNewEmail || !name || !password) return json({ error: 'Missing required fields' }, 400);
                if (!password || password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);
                if (!allowed_languages || allowed_languages.length === 0) return json({ error: 'At least one language required' }, 400);
                if (!allowed_categories || allowed_categories.length === 0) return json({ error: 'At least one category required' }, 400);
                try {
                    await validateRole(role || 'agent');
                    for (const lang of allowed_languages) {
                        await validateLanguage(lang, env);
                    }
                    for (const cat of allowed_categories) {
                        await validateCategory(cat, env);
                    }
                    const hash = await sha256(password);
                    const langs = JSON.stringify(allowed_languages || []);
                    const emails = JSON.stringify(allowed_emails || []);
                    const categories = JSON.stringify(allowed_categories || []);
                    const perms = JSON.stringify(page_permissions || {});
                    await env.DB.prepare('INSERT INTO users (email, name, role, password_hash, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(normalizedNewEmail, name, role || 'agent', hash, langs, emails, categories, team_id || null, perms).run();
                    clearCache();
                    return json({ success: true });
                } catch (e) {
                    const errMsg = e.message || '';
                    if (errMsg.includes('UNIQUE constraint failed') || errMsg.includes('PRIMARY KEY')) {
                        return json({ error: 'Email already exists' }, 409);
                    }
                    return json({ error: errMsg || 'Database error' }, 400);
                }
            }

            // ── Edit user ──
            if (path.startsWith('/api/admin/users/') && method === 'PUT') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'users.manage_permissions', env)) return json({ error: 'Permission denied' }, 403);
                const userEmail = decodeURIComponent(path.split('/')[4]);
                const { name, role, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions } = await request.json();
                try {
                    await validateRole(role);
                    for (const lang of allowed_languages || []) {
                        await validateLanguage(lang, env);
                    }
                    for (const cat of allowed_categories || []) {
                        await validateCategory(cat, env);
                    }
                    const langs = JSON.stringify(allowed_languages || []);
                    const emails = JSON.stringify(allowed_emails || []);
                    const categories = JSON.stringify(allowed_categories || []);
                    const perms = JSON.stringify(page_permissions || {});
                    await env.DB.prepare('UPDATE users SET name = ?, role = ?, allowed_languages = ?, allowed_emails = ?, allowed_categories = ?, team_id = ?, page_permissions = ? WHERE email = ?').bind(name, role, langs, emails, categories, team_id || null, perms, userEmail).run();
                    clearCache();
                    return json({ success: true });
                } catch (e) {
                    return json({ error: e.message || 'Error updating user' }, 400);
                }
            }

            // ── Delete user ──
            if (path.startsWith('/api/admin/users/') && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'users.delete', env)) return json({ error: 'Permission denied' }, 403);
                const userEmail = decodeURIComponent(path.split('/')[4]);
                try {
                    await env.DB.prepare('DELETE FROM users WHERE email = ?').bind(userEmail).run();
                    clearCache();
                    return json({ success: true });
                } catch (e) {
                    return json({ error: 'Error deleting user' }, 500);
                }
            }

            // ── Tickets list ──
            if (path === '/api/admin/tickets' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'tickets.view', env)) return json({ error: 'Permission denied' }, 403);
                
                const user = await getUser(email, env);

                const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
                const offset = parseInt(url.searchParams.get('offset') || '0');
                const statuses = url.searchParams.get('statuses') || null;
                const category = url.searchParams.get('category') || null;
                const language = url.searchParams.get('language') || null;
                const sort = url.searchParams.get('sort') || 'last_updated';

                const filters = { category, language, sort, limit, offset };
                if (statuses) {
                    filters.statuses = statuses.split(',').map(s => s.trim());
                } else {
                    filters.status = url.searchParams.get('status') || null;
                }

                const tickets = await getTickets(filters, env, user);
                const total = await getTotalTicketCount(filters, env, user);

                return json({
                    success: true,
                    tickets: tickets,
                    pagination: { limit, offset, total }
                });
            }

            // ── Single ticket ──
            if (path.startsWith('/api/admin/ticket/') && method === 'GET' && !path.includes('/status') && !path.includes('/comment') && !path.includes('/reply')) {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'tickets.view', env)) return json({ error: 'Permission denied' }, 403);
                const id = parseInt(path.split('/')[4]);
                if (isNaN(id)) return json({ error: 'Invalid ticket ID' }, 400);
                const ticket = await getTicket(id, env);
                if (!ticket) return json({ error: 'Not found' }, 404);
                return json({ success: true, data: ticket });
            }

            // ── Update status ──
            if (path.startsWith('/api/admin/ticket/') && path.includes('/status') && method === 'PUT') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const userEmail = verifyToken(token);
                if (!userEmail) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(userEmail, 'tickets.edit', env)) return json({ error: 'Permission denied' }, 403);
                const id = parseInt(path.split('/')[4]);
                const { status } = await request.json();
                
                const oldTicket = await getTicket(id, env);
                const oldStatus = oldTicket ? oldTicket.status : 'unknown';
                const user = await getUser(userEmail, env);
                const userName = user ? user.name : userEmail;
                const newTicket = await updateTicket(id, { status }, env);
                
                if (oldTicket && oldStatus !== status) {
                    const logEntry = `${userName} changed status from ${oldStatus} to ${status}`;
                    await addComment(id, { type: 'internal', authorEmail: userEmail, content: logEntry }, env);
                }
                
                return json({ success: true, data: newTicket });
            }

            // ── Add comment ──
            if (path.startsWith('/api/admin/ticket/') && path.includes('/comment') && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const userEmail = verifyToken(token);
                if (!userEmail) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(userEmail, 'tickets.edit', env)) return json({ error: 'Permission denied' }, 403);
                const id = parseInt(path.split('/')[4]);
                const { content, type } = await request.json();
                const comment = await addComment(id, { type: type || 'internal', authorEmail: userEmail, content }, env);
                return json({ success: true, data: comment });
            }

            // ── Poll ticket notifications ──
            if (path === '/api/admin/notifications' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                
                try {
                    const list = await env.KV.list({ prefix: 'ticket_notif:' });
                    const notifications = [];
                    for (const k of list.keys) {
                        const val = await env.KV.get(k.name);
                        if (!val) continue;
                        const parts = val.split('|');
                        notifications.push({
                            event: parts[0],
                            id: parseInt(parts[1]),
                            category: parts[2],
                            sla_status: parts[3],
                            status: parts[4],
                            subject: parts[5],
                            sender_email: parts[6],
                            created_at: parts[7],
                            updated_at: parts[8]
                        });
                    }
                    notifications.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

                    return json({ success: true, notifications: notifications });
                } catch (e) {
                    return json({ success: true, notifications: [] });
                }
            }

            // ── Send reply ──
            if (path.startsWith('/api/admin/ticket/') && path.includes('/reply') && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const userEmail = verifyToken(token);
                if (!userEmail) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(userEmail, 'tickets.edit', env)) return json({ error: 'Permission denied' }, 403);
                
                const id = parseInt(path.split('/')[4]);
                const { from, body } = await request.json();
                const ticket = await getTicket(id, env);
                if (!ticket) return json({ error: 'Not found' }, 404);
                
                const user = await getUser(userEmail, env);
                if (user.role !== 'admin' && user.role !== 'manager' && (!user.allowed_emails || !user.allowed_emails.includes(from))) {
                    return json({ error: 'You do not have access to send from this email address' }, 403);
                }
                
                const emailResult = await sendEmail(env, ticket.sender_email, `Re: [${ticket.ticket_number}] ${ticket.subject}`, body, from);
                if (emailResult.success) {
                    await addComment(id, { type: 'public', authorEmail: from || 'system', content: 'Reply sent: ' + body }, env);
                    return json({ success: true });
                } else {
                    return json({ success: false, error: emailResult.error }, 500);
                }
            }

            // ── Delete category ──
            if (path.startsWith('/api/admin/category/') && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasSettingsWrite(email, 'delete', env)) return json({ error: 'Permission denied' }, 403);
                const cat = decodeURIComponent(path.split('/')[4]);
                if (!cat || cat === 'unclassified') {
                    return json({ error: 'Cannot delete unclassified category' }, 400);
                }
                try {
                    await deleteCategoryData(env, cat);
                    return json({ success: true, message: `Category "${cat}" and all associated data permanently deleted` });
                } catch (e) {
                    return json({ error: e.message }, 400);
                }
            }

            return json({ error: 'Not found' }, 404);
        } catch (err) {
            console.error('Error:', err);
            return json({ error: err.message || 'Internal server error' }, 500);
        }
    },

    // ─── EMAIL HANDLER ──────────────────────────────────────────
    async email(message, env) {
        console.log('📧 Email received from:', message.from, '→', message.to);
        try {
            const { from, subject, body } = await parseEmail(message.raw);
            const ticketRegex = /TKT-\d{4,}-\d{3,}/g;
            let ticketNumber = null;
            if (subject) { const m = subject.match(ticketRegex); if (m) ticketNumber = m[0]; }
            if (!ticketNumber && body) { const m = body.match(ticketRegex); if (m) ticketNumber = m[0]; }
            
            if (ticketNumber) {
                const ticket = await getTicketByNumber(ticketNumber, env);
                if (ticket) {
                    let comment = `**Reply from ${from}**\n\n`;
                    if (subject && !subject.includes('TKT-')) comment += `**Subject:** ${subject}\n\n`;
                    comment += body || '(No content)';
                    await addComment(ticket.id, { type: 'public', authorEmail: from, content: comment }, env);
                    
                    const updatedTicket = await getTicket(ticket.id, env);
                    await queueTicketNotification(env, 'updated', ticket.id, updatedTicket);
                    
                    if (['resolved', 'closed'].includes(ticket.status)) await updateTicket(ticket.id, { status: 'open' }, env);
                    console.log('✅ Comment added to ticket:', ticketNumber);
                    return; 
                }
            }
            
            const config = await getEmailAddressConfig(env, message.to);
            const { category, language } = config;
            
            const ticket = await createTicket({
                category,
                senderName: from.split('@')[0] || 'Unknown',
                senderEmail: from,
                subject: subject || 'No subject',
                message: body || '(No content)',
                language: language,
                metadata: { source: 'email', to: message.to }
            }, env);
            
            if (from) await sendTicketConfirmation(ticket, env, from);
            console.log('✅ New ticket created:', ticket.ticket_number, 'category:', category, 'language:', language);
        } catch (err) {
            console.log('❌ Email error:', err.message);
        }
    }
};