// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Dornori Ticketing Worker — v5.0 (OPTIMIZED)
//  Changes: In-memory caching, single queries, batched operations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── CACHE ─────────────────────────────────────────────────────
// Simple in-memory cache with TTL
const cache = {
    settings: new Map(),
    users: new Map(),
    categories: null,
    languages: null,
    autoReplies: null,
    settingsTimestamp: 0,
    usersTimestamp: 0
};

const CACHE_TTL = 300000; // 5 minutes

function isCacheValid(timestamp) {
    return Date.now() - timestamp < CACHE_TTL;
}

function clearCache() {
    cache.settings.clear();
    cache.users.clear();
    cache.categories = null;
    cache.languages = null;
    cache.autoReplies = null;
    cache.settingsTimestamp = 0;
    cache.usersTimestamp = 0;
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

// Role-based permission definitions
const ROLE_PERMISSIONS = {
    admin: ['tickets.view', 'tickets.view_all', 'tickets.update', 'tickets.assign', 'tickets.comment', 'tickets.reply', 'tickets.delete', 'users.view_all', 'users.edit_all', 'users.manage_permissions', 'users.delete', 'settings.view', 'settings.edit', 'newsletter.view', 'newsletter.send', 'reports.view', 'reports.view_all'],
    manager: ['tickets.view', 'tickets.view_all', 'tickets.update', 'tickets.assign', 'tickets.comment', 'tickets.reply', 'users.view_all', 'users.edit', 'users.manage_permissions', 'newsletter.view', 'reports.view', 'reports.view_all'],
    tl: ['tickets.view', 'tickets.update', 'tickets.assign', 'tickets.comment', 'tickets.reply', 'users.view_team', 'users.edit', 'newsletter.view', 'reports.view'],
    agent: ['tickets.view', 'tickets.update', 'tickets.comment', 'tickets.reply']
};

// Multi-user support: fetch from DB with caching
async function getUser(email, env) {
    // Check cache first
    if (cache.users.has(email) && isCacheValid(cache.usersTimestamp)) {
        return cache.users.get(email);
    }
    
    try {
        const row = await env.DB.prepare('SELECT email, name, role, password_hash, allowed_languages, allowed_emails, team_id FROM users WHERE email = ?').bind(email).first();
        if (row) {
            const role = row.role || 'agent';
            const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.agent;
            const user = {
                email: row.email,
                name: row.name,
                role: role,
                password_hash: row.password_hash,
                permissions: permissions,
                allowed_languages: row.allowed_languages ? JSON.parse(row.allowed_languages) : ['en'],
                allowed_emails: row.allowed_emails ? JSON.parse(row.allowed_emails) : [],
                team_id: row.team_id,
                session_version: `v${Date.now()}`
            };
            cache.users.set(email, user);
            cache.usersTimestamp = Date.now();
            return user;
        }
    } catch (e) {}
    
    // Fallback: legacy admin user
    if (email === 'admin@dornori.com') {
        const user = { 
            email, 
            name: 'Admin', 
            role: 'admin', 
            password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 
            permissions: ROLE_PERMISSIONS.admin,
            allowed_languages: ['en'],
            allowed_emails: [],
            session_version: 'v1.0'
        };
        cache.users.set(email, user);
        cache.usersTimestamp = Date.now();
        return user;
    }
    return null;
}

async function hasPermission(email, permission, env) {
    const user = await getUser(email, env);
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions && user.permissions.includes(permission);
}

async function checkPagePermission(user, page) {
    const pagePermissions = {
        'dashboard': ['tickets.view'],
        'reports': ['reports.view'],
        'newsletter': ['newsletter.view'],
        'settings': ['settings.view'],
        'users': ['users.view_all']
    };
    const required = pagePermissions[page] || [];
    return required.length === 0 || required.some(p => user.permissions && user.permissions.includes(p));
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

// ─── CATEGORY HELPERS ───────────────────────────────────────────
function normalizeCategory(c) {
    if (!c) return 'other';
    return String(c).trim().toLowerCase().replace(/\s+/g, '-');
}

// ─── SETTINGS ─────────────────────────────────────────────────
async function getSetting(env, category, key) {
    const cacheKey = `${category}:${key}`;
    
    // Check cache
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
    // Don't cache this - it's used infrequently and we want fresh data
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
    // Clear cache for this specific key and related caches
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
    
    const cats = new Set(['other']);
    try {
        // Single query to get all categories at once
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
    
    cache.languages = ['en'];
    cache.settingsTimestamp = Date.now();
    return cache.languages;
}

// Get minimal ticket data for dashboard sync (just visible fields)
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

// ─── AUTO-REPLY HELPERS ──────────────────────────────────────
async function getAutoReply(env, category, language) {
    const cat = normalizeCategory(category);
    const lang = (language || 'en').toLowerCase().trim();
    
    // Build patterns for a single query
    const patterns = [];
    if (cat === 'newsletter') {
        patterns.push(`newsletter${lang === 'en' ? '' : '_' + lang}_%`);
        if (lang !== 'en') patterns.push('newsletter_%');
        patterns.push('newsletter_%');
    } else {
        patterns.push(`${cat}_${lang}_%`);
        if (lang !== 'en') patterns.push(`${cat}_en_%`);
        patterns.push(`${cat}_%`);
    }
    
    try {
        // Single query to get all matching settings
        const conditions = patterns.map(() => 'key LIKE ?').join(' OR ');
        const r = await env.DB.prepare(
            `SELECT key, value FROM settings WHERE category = 'auto_reply' AND (${conditions})`
        ).bind(...patterns).all();
        
        // Build result object from results
        const result = {};
        for (const row of r.results || []) {
            const key = row.key;
            let suffix;
            if (cat === 'newsletter') {
                if (key === 'newsletter_enabled' || key === 'newsletter_subject' || key === 'newsletter_body' || key === 'newsletter_from') {
                    suffix = key.replace('newsletter_', '');
                } else {
                    const match = key.match(/^newsletter_([a-z]{2})_(enabled|subject|body|from)$/);
                    if (match) suffix = match[2];
                    else continue;
                }
            } else {
                const parts = key.split('_');
                suffix = parts.slice(2).join('_');
            }
            result[suffix] = row.value;
        }
        
        // Handle newsletter specifically
        if (cat === 'newsletter') {
            const enabled = result.enabled;
            if (enabled !== undefined) {
                return {
                    enabled: enabled === '1',
                    subject: result.subject || 'Welcome to the Dornori Newsletter',
                    body: result.body || '',
                    from: result.from || null
                };
            }
            // Fallback to English
            const enEnabled = await getSetting(env, 'auto_reply', 'newsletter_enabled');
            if (enEnabled !== null) {
                const enSubject = await getSetting(env, 'auto_reply', 'newsletter_subject') || 'Welcome to the Dornori Newsletter';
                const enBody = await getSetting(env, 'auto_reply', 'newsletter_body') || '';
                const enFrom = await getSetting(env, 'auto_reply', 'newsletter_from') || null;
                return { enabled: enEnabled === '1', subject: enSubject, body: enBody, from: enFrom };
            }
            return { enabled: true, subject: 'Welcome to the Dornori Newsletter', body: '<p>Thanks for subscribing!</p>', from: null };
        }
        
        // Regular category
        const enabled = result.enabled;
        if (enabled !== undefined) {
            return {
                enabled: enabled === '1',
                subject: result.subject || '',
                body: result.body || '',
                from: result.from || null
            };
        }
        
        // Try English fallback
        if (lang !== 'en') {
            const enPattern = `${cat}_en_%`;
            const enR = await env.DB.prepare(
                `SELECT key, value FROM settings WHERE category = 'auto_reply' AND key LIKE ?`
            ).bind(enPattern).all();
            
            const enResult = {};
            for (const row of enR.results || []) {
                const parts = row.key.split('_');
                enResult[parts.slice(2).join('_')] = row.value;
            }
            
            if (enResult.enabled !== undefined) {
                return {
                    enabled: enResult.enabled === '1',
                    subject: enResult.subject || '',
                    body: enResult.body || '',
                    from: enResult.from || null
                };
            }
        }
        
        // Try legacy
        const legacyEnabled = await getSetting(env, 'auto_reply', cat + '_enabled');
        if (legacyEnabled === null) return null;
        const legacySubject = await getSetting(env, 'auto_reply', cat + '_subject') || `[Ticket {{ticket_id}}] Your ${cat} inquiry`;
        const legacyBody = await getSetting(env, 'auto_reply', cat + '_body') || `<p>Thank you for your ${cat} inquiry. We will respond shortly.</p>`;
        const legacyFrom = await getSetting(env, 'auto_reply', cat + '_from') || null;
        return { enabled: legacyEnabled === '1', subject: legacySubject, body: legacyBody, from: legacyFrom };
        
    } catch (e) {
        // Fallback to original behavior if query fails
        return null;
    }
}

async function saveAutoReply(env, category, language, enabled, subject, body, from) {
    const cat = normalizeCategory(category);
    const lang = (language || 'en').toLowerCase().trim();
    
    if (cat === 'newsletter') {
        const langKey = lang === 'en' ? '' : '_' + lang;
        await updateSetting(env, 'auto_reply', `newsletter${langKey}_enabled`, enabled ? '1' : '0');
        await updateSetting(env, 'auto_reply', `newsletter${langKey}_subject`, subject || '');
        await updateSetting(env, 'auto_reply', `newsletter${langKey}_body`, body || '');
        if (from) await updateSetting(env, 'auto_reply', `newsletter${langKey}_from`, from);
    } else {
        await updateSetting(env, 'auto_reply', `${cat}_${lang}_enabled`, enabled ? '1' : '0');
        await updateSetting(env, 'auto_reply', `${cat}_${lang}_subject`, subject || '');
        await updateSetting(env, 'auto_reply', `${cat}_${lang}_body`, body || '');
        if (from) await updateSetting(env, 'auto_reply', `${cat}_${lang}_from`, from);
    }
    cache.autoReplies = null;
}

async function deleteAutoReply(env, category, language) {
    const cat = normalizeCategory(category);
    const lang = (language || 'en').toLowerCase().trim();
    
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
        // Single query instead of getAllSettings
        const r = await env.DB.prepare(
            "SELECT * FROM settings WHERE category = 'auto_reply' ORDER BY category, key"
        ).all();
        
        const replies = {};
        for (const s of r.results || []) {
            const parts = s.key.split('_');
            if (parts.length < 2) continue;
            
            let cat, lang, suffix;
            if (s.key.startsWith('newsletter')) {
                if (s.key === 'newsletter_enabled' || s.key === 'newsletter_subject' || s.key === 'newsletter_body' || s.key === 'newsletter_from') {
                    cat = 'newsletter';
                    lang = 'en';
                    suffix = s.key.replace('newsletter_', '');
                } else {
                    const match = s.key.match(/^newsletter_([a-z]{2})_(enabled|subject|body|from)$/);
                    if (!match) continue;
                    cat = 'newsletter';
                    lang = match[1];
                    suffix = match[2];
                }
            } else {
                cat = parts[0];
                lang = parts[1];
                suffix = parts.slice(2).join('_');
            }
            
            if (!replies[cat]) replies[cat] = {};
            if (!replies[cat][lang]) replies[cat][lang] = {};
            replies[cat][lang][suffix] = s.value;
        }
        
        const result = [];
        for (const cat in replies) {
            for (const lang in replies[cat]) {
                const r = replies[cat][lang];
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

async function ensureAutoReplyDefaults(env) {
    const cats = await getKnownCategories(env);
    for (const cat of cats) {
        const enabled = await getSetting(env, 'auto_reply', cat + '_enabled');
        if (enabled === null) {
            await updateSetting(env, 'auto_reply', cat + '_enabled', '1');
            await updateSetting(env, 'auto_reply', cat + '_subject', `[Ticket {{ticket_id}}] Your ${cat} inquiry`);
            await updateSetting(env, 'auto_reply', cat + '_body', `<p>Thank you for your ${cat} inquiry. We will respond shortly.</p>`);
        }
    }
}

async function ensureNewsletterAutoReplyDefault(env) {
    const enabled = await getSetting(env, 'auto_reply', 'newsletter_enabled');
    if (enabled === null) {
        await updateSetting(env, 'auto_reply', 'newsletter_enabled', '1');
        await updateSetting(env, 'auto_reply', 'newsletter_subject', 'Welcome to the Dornori Newsletter');
        await updateSetting(env, 'auto_reply', 'newsletter_body', '<p>Thanks for subscribing, {{subscriber_email}}!</p>\n<p>If you ever want to stop receiving these emails, you can <a href="{{unsubscribe_link}}">unsubscribe here</a>.</p>');
    }
}

// ─── EMAIL ADDRESSES ──────────────────────────────────────────
async function getEmailAddresses(env, activeOnly = false) {
    try {
        const q = activeOnly ? 'SELECT * FROM email_addresses WHERE is_active = 1 ORDER BY label' : 'SELECT * FROM email_addresses ORDER BY label';
        const r = await env.DB.prepare(q).all();
        return r.results || [];
    } catch { return []; }
}
async function addEmailAddress(env, email, label, action) {
    await env.DB.prepare('INSERT INTO email_addresses (email, label, action) VALUES (?, ?, ?)').bind(email, label, action).run();
}
async function updateEmailAddress(env, id, email, label, action, is_active) {
    await env.DB.prepare('UPDATE email_addresses SET email = ?, label = ?, action = ?, is_active = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(email, label, action, is_active, id).run();
}
async function deleteEmailAddress(env, id) {
    await env.DB.prepare('DELETE FROM email_addresses WHERE id = ?').bind(id).run();
}

async function getCategoryForIncomingAddress(env, toAddress) {
    if (!toAddress) return 'other';
    const clean = toAddress.toLowerCase().trim();
    try {
        const row = await env.DB.prepare('SELECT action FROM email_addresses WHERE is_active = 1 AND lower(email) = ?').bind(clean).first();
        if (row && row.action) return normalizeCategory(row.action);
    } catch (e) {}
    return 'other';
}

// ─── NEWSLETTER ──────────────────────────────────────────────
async function addSubscriber(email, name, language, env) {
    const lang = (language || 'en').toLowerCase().trim();
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
    let domain = (await getSetting(env, 'general', 'domain')) || 'dornori.com';
    domain = domain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    
    const lang = (language || 'en').toLowerCase().trim();
    let unsubPath = await getSetting(env, 'newsletter', `unsubscribe_link_path_${lang}`);
    if (!unsubPath && lang !== 'en') {
        unsubPath = await getSetting(env, 'newsletter', 'unsubscribe_link_path_en');
    }
    if (!unsubPath) {
        unsubPath = await getSetting(env, 'newsletter', 'unsubscribe_link_path');
    }
    unsubPath = unsubPath || 'unsubscribe.html';
    
    return `https://${domain}/${unsubPath.replace(/^\//, '')}?token=${token}`;
}

// ─── NEWSLETTERS ─────────────────────────────────────────────
async function createNewsletter(env, subject, body, language, status = 'draft') {
    const lang = language === 'all' ? 'all' : (language || 'en').toLowerCase().trim();
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
    const lang = language === 'all' ? null : (language || 'en').toLowerCase().trim();
    
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

    // Batch emails in groups of 10 to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const batch = list.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (sub) => {
            const unsubLink = await buildUnsubscribeLink(env, sub.token, sub.language);
            let personalBody = body
                .replaceAll('{{subscriber_email}}',  sub.email)
                .replaceAll('{{subscriber_name}}',   sub.name || '')
                .replaceAll('{{unsubscribe_link}}',  unsubLink);
            const res = await sendEmail(env, sub.email, subject, personalBody, 'newsletter@dornori.com');
            if (res.success) sent++;
        }));
    }

    const result = await env.DB.prepare(
        `INSERT INTO newsletters (subject, body, language, status, created_at, sent_at, recipient_count) 
         VALUES (?, ?, ?, 'sent', datetime('now'), datetime('now'), ?)`
    ).bind(subject, body, language === 'all' ? 'all' : (language || 'en'), sent).run();
    
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
async function createTicket(data, env) {
    const ticketNumber = generateTicketNumber();
    const now = new Date().toISOString();
    const category = normalizeCategory(data.category);
    let language = (data.language || 'en').toLowerCase().trim();
    if (!language || language === 'unknown') language = 'en';
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

// ─── NOTIFICATION QUEUE (KV-based) ──────────────────────────
async function queueTicketNotification(env, event, ticketId, ticketData) {
    try {
        const queue = await env.KV.get('ticket_queue', 'json') || [];
        
        const record = [
            event,
            ticketData.id || ticketId,
            ticketData.category || 'other',
            ticketData.sla_status || 'on_track',
            ticketData.status || 'new',
            ticketData.subject || '',
            ticketData.sender_email || '',
            ticketData.created_at || new Date().toISOString(),
            ticketData.updated_at || new Date().toISOString()
        ].join('|');
        
        queue.push(record);
        await env.KV.put('ticket_queue', JSON.stringify(queue));
        console.log(`✅ Queued: ${event} ticket ${ticketId}`);
    } catch (e) {
        console.log(`⚠️ Failed to queue notification: ${e.message}`);
    }
}

async function getSLA(env, category) {
    const cat = normalizeCategory(category);
    const resp = parseInt(await getSetting(env, 'sla', cat + '_response') || '24');
    const resol = parseInt(await getSetting(env, 'sla', cat + '_resolution') || '72');
    return {
        responseDue: new Date(Date.now() + resp * 3600000).toISOString(),
        resolutionDue: new Date(Date.now() + resol * 3600000).toISOString()
    };
}

async function getTicket(id, env) {
    // Select only needed columns
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

// ─── TICKET LIST ──────────────────────────────────────────────
async function getTickets(filters, env) {
    let query = 'SELECT * FROM ticket_summary WHERE 1=1';
    const params = [];

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

    // Always enforce a limit
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

async function getTotalTicketCount(filters, env) {
    let query = 'SELECT COUNT(*) as total FROM ticket_summary WHERE 1=1';
    const params = [];

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

async function getTicketByNumber(ticketNumber, env) {
    return await env.DB.prepare('SELECT * FROM tickets WHERE ticket_number = ?').bind(ticketNumber).first();
}

// ─── STATS ────────────────────────────────────────────────────
async function getStats(env) {
    const r = await env.DB.prepare('SELECT status, COUNT(*) as count FROM tickets GROUP BY status').all();
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
        // Combined query for status, categories, and daily in one go
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
            // Status counts
            if (result.status.hasOwnProperty(row.status)) {
                result.status[row.status] += row.count;
            }
            
            // Daily counts
            const dayKey = row.day;
            if (!dailyMap[dayKey]) dailyMap[dayKey] = 0;
            dailyMap[dayKey] += row.count;
            
            // Category counts
            if (!categoryMap[row.category]) categoryMap[row.category] = 0;
            categoryMap[row.category] += row.count;
        }
        
        // Convert daily map to sorted array
        result.daily = Object.entries(dailyMap)
            .map(([day, count]) => ({ day, count }))
            .sort((a, b) => a.day.localeCompare(b.day));
        
        // Convert category map
        result.categories = categoryMap;
        
    } catch(e) {}
    
    try {
        // Top senders
        const senderRes = await env.DB.prepare(`
            SELECT sender_email, COUNT(*) as count FROM tickets
            WHERE sender_email != '' GROUP BY sender_email ORDER BY count DESC LIMIT 10
        `).all();
        result.top_senders = senderRes.results || [];
    } catch(e) {}
    
    try {
        // SLA metrics
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
    if (!env.SCRIPT_URL) return { success: false, error: 'SCRIPT_URL missing' };
    from = from || 'support@dornori.com';
    try {
        let htmlBody = body || '';
        const footerKey = 'footer_' + from.replace(/[^a-z0-9]/gi, '_');
        let footer = await getSetting(env, 'email', footerKey);
        if (footer === null) footer = await getSetting(env, 'email', 'footer_html');
        if (footer) htmlBody += '\n\n' + footer;
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${htmlBody}</body></html>`;
        const safeSubject = subject ? subject.replace(/[<>]/g, '') : '';
        const params = {
            secret: 'YourSuperSecretKey123',
            username: 'dornori',
            password: 'Password@Email#2026',
            to,
            subject: safeSubject,
            message: fullHtml,
            from
        };
        const formBody = Object.keys(params)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
            .join('&');
        const res = await fetch(env.SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formBody
        });
        const data = await res.json();
        return data.status === 'success' ? { success: true } : { success: false, error: data.message || 'Apps Script error' };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ─── AUTO-REPLY FUNCTIONS ────────────────────────────────────
async function sendTicketConfirmation(ticket, env, emailOverride) {
    const email = emailOverride || ticket.sender_email;
    if (!email) return { success: false, error: 'No email' };
    const cat = normalizeCategory(ticket.category);
    const lang = (ticket.language || 'en').toLowerCase().trim();
    const ar = await getAutoReply(env, cat, lang);
    if (!ar || !ar.enabled) return { success: true, skipped: true };

    let subject = ar.subject || `[Ticket {{ticket_id}}] Your ${cat} inquiry`;
    let body    = ar.body || `<p>Thank you for your ${cat} inquiry. We will respond shortly.</p>`;

    const replacements = {
        '{{ticket_id}}':    ticket.ticket_number,
        '{{sender_name}}':  ticket.sender_name || '',
        '{{sender_email}}': ticket.sender_email || '',
        '{{category}}':     cat,
        '{{subject}}':      ticket.subject || ''
    };
    for (const [tag, val] of Object.entries(replacements)) {
        subject = subject.replaceAll(tag, val);
        body    = body.replaceAll(tag, val);
    }

    const formattedBody = formatEmailBody(body);
    const from = ar.from || (await getSetting(env, 'category', cat + '_assigned_email')) || 'support@dornori.com';
    return await sendEmail(env, email, subject, formattedBody, from);
}

async function sendNewsletterConfirmation(env, email, token, language) {
    const lang = (language || 'en').toLowerCase().trim();
    const ar = await getAutoReply(env, 'newsletter', lang);
    if (!ar || !ar.enabled) return { success: true, skipped: true };

    let subject = ar.subject || 'Welcome to the Dornori Newsletter';
    let body    = ar.body || '<p>Thank you for subscribing!</p>';

    const unsubscribeLink = await buildUnsubscribeLink(env, token, lang);
    const replacements = {
        '{{subscriber_email}}':  email,
        '{{unsubscribe_link}}':  unsubscribeLink
    };
    for (const [tag, val] of Object.entries(replacements)) {
        subject = subject.replaceAll(tag, val);
        body    = body.replaceAll(tag, val);
    }

    const formattedBody = formatEmailBody(body);
    const from = ar.from || 'newsletter@dornori.com';
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

        try { await ensureAutoReplyDefaults(env); } catch(e) {}
        try { await ensureNewsletterAutoReplyDefault(env); } catch(e) {}

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
                return json({ success: true, stats: await getStats(env) });
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
                if (!await hasPermission(email, 'settings.edit', env)) return json({ error: 'Permission denied' }, 403);
                const { category, language, enabled, subject, body, from } = await request.json();
                if (!category || !language) return json({ error: 'Category and language required' }, 400);
                await saveAutoReply(env, category, language, enabled, subject, body, from);
                return json({ success: true });
            }
            if (path === '/api/admin/auto-reply' && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'settings.edit', env)) return json({ error: 'Permission denied' }, 403);
                const { category, language } = await request.json();
                if (!category || !language) return json({ error: 'Category and language required' }, 400);
                await deleteAutoReply(env, category, language);
                return json({ success: true });
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
                if (!await hasPermission(email, 'settings.edit', env)) return json({ error: 'Permission denied' }, 403);
                const { email: newEmail, label, action } = await request.json();
                if (!newEmail || !label) return json({ error: 'Email and label required' }, 400);
                const cat = normalizeCategory(action || label);
                const knownCats = await getKnownCategories(env);
                if (!knownCats.includes(cat)) return json({ error: `Category "${cat}" does not exist.` }, 400);
                await addEmailAddress(env, newEmail, label, cat);
                return json({ success: true });
            }
            if (path.match(/^\/api\/admin\/email-addresses\/\d+$/) && method === 'PUT') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'settings.edit', env)) return json({ error: 'Permission denied' }, 403);
                const id = parseInt(path.split('/')[4]);
                const { email: newEmail, label, action, is_active } = await request.json();
                const cat = normalizeCategory(action || label);
                const knownCats = await getKnownCategories(env);
                if (!knownCats.includes(cat)) return json({ error: `Category "${cat}" does not exist.` }, 400);
                await updateEmailAddress(env, id, newEmail, label, cat, is_active);
                return json({ success: true });
            }
            if (path.match(/^\/api\/admin\/email-addresses\/\d+$/) && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'settings.edit', env)) return json({ error: 'Permission denied' }, 403);
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
                
                // Also include support emails and teams for user management UI
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
                if (!await hasPermission(email, 'settings.edit', env)) return json({ error: 'Permission denied' }, 403);
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
                if (status === 'draft') {
                    const newsletter = await createNewsletter(env, subject, body, language, 'draft');
                    return json({ success: true, newsletter, sent: 0 });
                }
                const result = await sendNewsletter(env, subject, body, language);
                return json({ success: true, newsletter: result.newsletter, sent: result.sent });
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
                const lang = (language || 'en').toLowerCase().trim();
                const { subscriber, token } = await addSubscriber(email, name || '', lang, env);
                const ticket = await createTicket({
                    category: 'newsletter', senderName: name || '', senderEmail: email,
                    subject: 'Newsletter Subscription', message: 'Subscribed via website',
                    language: lang,
                    metadata: { subscriberId: subscriber.id }
                }, env);
                await sendNewsletterConfirmation(env, email, token, lang);
                return json({ success: true, subscriberId: subscriber.id, ticketNumber: ticket.ticket_number });
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

                if (isSupportForm) {
                    const originalCat = data.originalCategory || 'General';
                    let catSlug = normalizeCategory(originalCat);
                    const knownCats = await getKnownCategories(env);
                    if (!knownCats.includes(catSlug)) catSlug = 'support';
                    category = catSlug;
                    senderName = data.name || '';
                    senderEmail = data.email || '';
                    orderNumber = data.orderNumber || '';
                    subject = originalCat + ' support request';
                    language = data.language || 'en';
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
                    category = normalizeCategory(rawCategory);
                    senderName = data.name || data.fullName || '';
                    senderEmail = data.email || '';
                    orderNumber = data.orderNumber || '';
                    subject = data.subject || 'Website Inquiry';
                    message = data.message || data.additionalComments || 'No message provided';
                    language = data.language || 'en';
                    metadata = { source: 'website', raw: data };
                }

                const ticket = await createTicket({ category, senderName, senderEmail, orderNumber, subject, message, language, metadata }, env);
                if (senderEmail) await sendTicketConfirmation(ticket, env, senderEmail);
                return json({ success: true, ticketNumber: ticket.ticket_number, ticketId: ticket.id });
            }

            // ── Admin login ──
            if (path === '/api/admin/login' && method === 'POST') {
                const { email, password } = await request.json();
                const user = await getUser(email, env);
                if (!user) return json({ error: 'Invalid credentials' }, 401);
                if ((await sha256(password)) !== user.password_hash) return json({ error: 'Invalid credentials' }, 401);
                return json({ success: true, token: generateToken(email), user: { email: user.email, name: user.name, role: user.role, permissions: user.permissions, allowed_languages: user.allowed_languages, allowed_emails: user.allowed_emails, team_id: user.team_id } });
            }

            // ── User profile ──
            if (path === '/api/admin/user-profile' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                const user = await getUser(email, env);
                return json({ success: true, user: { email: user.email, name: user.name, role: user.role, permissions: user.permissions, allowed_languages: user.allowed_languages, allowed_emails: user.allowed_emails, team_id: user.team_id } });
            }

            // ── Get all users (admin only) ──
            if (path === '/api/admin/users' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                const user = await getUser(email, env);
                if (!await hasPermission(email, 'users.view_all', env)) return json({ error: 'Permission denied' }, 403);
                try {
                    const users = await env.DB.prepare('SELECT email, name, role, allowed_languages, allowed_emails, team_id FROM users ORDER BY email').all();
                    const results = (users.results || []).map(u => ({ 
                        email: u.email, 
                        name: u.name, 
                        role: u.role || 'agent',
                        allowed_languages: u.allowed_languages ? JSON.parse(u.allowed_languages) : ['en'],
                        allowed_emails: u.allowed_emails ? JSON.parse(u.allowed_emails) : [],
                        team_id: u.team_id || null
                    }));
                    if (!results.find(u => u.email === 'admin@dornori.com')) {
                        results.unshift({ email: 'admin@dornori.com', name: 'Admin', role: 'admin', allowed_languages: ['en'], allowed_emails: [], team_id: null });
                    }
                    return json({ success: true, users: results });
                } catch (e) {
                    return json({ success: true, users: [{ email: 'admin@dornori.com', name: 'Admin', role: 'admin', allowed_languages: ['en'], allowed_emails: [], team_id: null }] });
                }
            }

            // ── Add user ──
            if (path === '/api/admin/users' && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'users.manage_permissions', env)) return json({ error: 'Permission denied' }, 403);
                const { email: newEmail, name, password, role, allowed_languages, allowed_emails, team_id } = await request.json();
                if (!newEmail || !name || !password) return json({ error: 'Missing required fields' }, 400);
                if (!password || password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);
                if (!allowed_languages || allowed_languages.length === 0) return json({ error: 'At least one language required' }, 400);
                try {
                    const hash = await sha256(password);
                    const langs = JSON.stringify(allowed_languages || ['en']);
                    const emails = JSON.stringify(allowed_emails || []);
                    await env.DB.prepare('INSERT INTO users (email, name, role, password_hash, allowed_languages, allowed_emails, team_id) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newEmail, name, role || 'agent', hash, langs, emails, team_id || null).run();
                    clearCache();
                    return json({ success: true });
                } catch (e) {
                    return json({ error: 'User already exists' }, 409);
                }
            }

            // ── Edit user ──
            if (path.startsWith('/api/admin/users/') && method === 'PUT') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'users.edit', env)) return json({ error: 'Permission denied' }, 403);
                const userEmail = decodeURIComponent(path.split('/')[4]);
                if (userEmail === 'admin@dornori.com') return json({ error: 'Cannot edit admin' }, 400);
                const { name, role, allowed_languages, allowed_emails, team_id } = await request.json();
                try {
                    const langs = JSON.stringify(allowed_languages || ['en']);
                    const emails = JSON.stringify(allowed_emails || []);
                    await env.DB.prepare('UPDATE users SET name = ?, role = ?, allowed_languages = ?, allowed_emails = ?, team_id = ? WHERE email = ?').bind(name, role, langs, emails, team_id || null, userEmail).run();
                    clearCache();
                    return json({ success: true });
                } catch (e) {
                    return json({ error: 'Error updating user' }, 500);
                }
            }

            // ── Delete user ──
            if (path.startsWith('/api/admin/users/') && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                const email = verifyToken(token);
                if (!email) return json({ error: 'Unauthorized' }, 401);
                if (!await hasPermission(email, 'users.delete', env)) return json({ error: 'Permission denied' }, 403);
                const userEmail = decodeURIComponent(path.split('/')[4]);
                if (userEmail === 'admin@dornori.com') return json({ error: 'Cannot delete admin' }, 400);
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

                const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100); // Cap at 100
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

                const tickets = await getTickets(filters, env);
                const total = await getTotalTicketCount(filters, env);

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
                if (!await hasPermission(userEmail, 'tickets.update', env)) return json({ error: 'Permission denied' }, 403);
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
                if (!await hasPermission(userEmail, 'tickets.comment', env)) return json({ error: 'Permission denied' }, 403);
                const id = parseInt(path.split('/')[4]);
                const { content, type } = await request.json();
                const comment = await addComment(id, { type: type || 'internal', authorEmail: userEmail, content }, env);
                return json({ success: true, data: comment });
            }

            // ── Poll ticket notifications (KV queue) ──
            if (path === '/api/admin/notifications' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                
                try {
                    const queue = await env.KV.get('ticket_queue', 'json') || [];
                    
                    const notifications = queue.map(record => {
                        const parts = record.split('|');
                        return {
                            event: parts[0],
                            id: parseInt(parts[1]),
                            category: parts[2],
                            sla_status: parts[3],
                            status: parts[4],
                            subject: parts[5],
                            sender_email: parts[6],
                            created_at: parts[7],
                            updated_at: parts[8]
                        };
                    });
                    
                    const now = new Date();
                    const lastCleanup = await env.KV.get('ticket_queue_last_cleanup') || '0';
                    const lastCleanupTime = parseInt(lastCleanup);
                    const dayInMs = 24 * 60 * 60 * 1000;
                    
                    if (now.getTime() - lastCleanupTime > dayInMs) {
                        await env.KV.put('ticket_queue', JSON.stringify([]));
                        await env.KV.put('ticket_queue_last_cleanup', String(now.getTime()));
                        console.log('🗑️ Ticket queue cleared (daily cleanup)');
                    }
                    
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
                if (!await hasPermission(userEmail, 'tickets.reply', env)) return json({ error: 'Permission denied' }, 403);
                
                const id = parseInt(path.split('/')[4]);
                const { from, body } = await request.json();
                const ticket = await getTicket(id, env);
                if (!ticket) return json({ error: 'Not found' }, 404);
                
                // Check if user has access to this email address
                const user = await getUser(userEmail, env);
                if (user.role !== 'admin' && (!user.allowed_emails || !user.allowed_emails.includes(from))) {
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
            const category = await getCategoryForIncomingAddress(env, message.to);
            const ticket = await createTicket({
                category,
                senderName: from.split('@')[0] || 'Unknown',
                senderEmail: from,
                subject: subject || 'No subject',
                message: body || '(No content)',
                language: 'en',
                metadata: { source: 'email', to: message.to }
            }, env);
            if (from) await sendTicketConfirmation(ticket, env, from);
            console.log('✅ New ticket created:', ticket.ticket_number, 'category:', category);
        } catch (err) {
            console.log('❌ Email error:', err.message);
        }
    }
};