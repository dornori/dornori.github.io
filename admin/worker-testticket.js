// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Dornori Ticketing Worker — v4.5 (Test with Real Ticket Number)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
const USERS = { 'admin@dornori.com': { name: 'Admin', role: 'admin', password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8' } };

// ─── SERVICE WORKER CONTENT ─────────────────────────────────
const SW_CONTENT = `
self.addEventListener('push', function(event) {
    console.log('📨 Push received');
    console.log('📦 Raw event.data:', event.data);
    
    let data = {};
    let rawText = null;
    
    if (event.data) {
        try {
            rawText = event.data.text();
            console.log('📝 Raw text:', rawText);
            
            try {
                data = event.data.json();
                console.log('✅ Parsed JSON:', JSON.stringify(data));
            } catch(e) {
                console.log('❌ JSON parse error:', e.message);
                data = { raw: rawText };
            }
        } catch(e) {
            console.log('❌ Error reading data:', e.message);
            data = { error: 'Could not read data' };
        }
    } else {
        console.log('⚠️ Push data is null');
        data = { error: 'No data' };
    }

    // Show notification
    let notificationTitle = '🔔 New Ticket';
    let notificationBody = 'A new ticket was created';
    
    if (data.ticket_number) {
        notificationTitle = '🔔 New Ticket ' + data.ticket_number;
        notificationBody = data.body || data.title || 'New ticket received';
    } else if (data.test !== undefined) {
        notificationTitle = '🔢 Test: ' + data.test;
        notificationBody = JSON.stringify(data);
    }

    const notifyPromise = self.registration.showNotification(notificationTitle, {
        body: notificationBody,
        icon: '/favicon.ico',
        data: { 
            url: data.url || '/admin/dashboard.html', 
            ticketId: data.ticket_id || null,
            ticketNumber: data.ticket_number || null
        }
    });

    const messagePromise = clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
            console.log('📋 Clients found:', clientList.length);
            for (var client of clientList) {
                if (client.url.includes('/admin/dashboard.html') || client.url.includes('dashboard.html')) {
                    client.postMessage({ 
                        action: data.ticket_id ? 'newTicket' : 'testPush',
                        ticketId: data.ticket_id || null,
                        data: data
                    });
                    console.log('✅ postMessage sent:', data.ticket_id ? 'newTicket' : 'testPush');
                }
            }
        });

    event.waitUntil(Promise.all([notifyPromise, messagePromise]));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/admin/dashboard.html';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var client of clientList) {
                if (client.url.includes('/admin/dashboard.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

self.addEventListener('message', function(event) {
    console.log('📨 SW received message:', event.data);
    if (event.data.action === 'ping') {
        event.source.postMessage({ action: 'pong', message: 'SW is ready' });
    }
});

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(clients.claim());
});
`;

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
    try {
        const r = await env.DB.prepare('SELECT value FROM settings WHERE category = ? AND key = ?').bind(category, key).first();
        return r ? r.value : null;
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
}

async function getKnownCategories(env) {
    const cats = new Set(['other']);
    try {
        const r = await env.DB.prepare(`SELECT key FROM settings WHERE category = 'category' AND key LIKE '%_description'`).all();
        for (const row of r.results || []) {
            const slug = row.key.replace(/_description$/, '');
            const val = await env.DB.prepare('SELECT value FROM settings WHERE category = "category" AND key = ?').bind(row.key).first();
            if (val && val.value !== '__deleted__') cats.add(slug);
        }
    } catch (e) {}
    return Array.from(cats);
}

async function getKnownLanguages(env) {
    try {
        const langs = await getSetting(env, 'languages', 'list');
        if (langs) {
            const parsed = JSON.parse(langs);
            return parsed.map(l => l.code);
        }
    } catch (e) {}
    return ['en'];
}

// ─── AUTO-REPLY HELPERS ──────────────────────────────────────
async function getAutoReply(env, category, language) {
    const cat = normalizeCategory(category);
    const lang = (language || 'en').toLowerCase().trim();
    
    if (cat === 'newsletter') {
        const langKeys = {
            enabled: `newsletter${lang === 'en' ? '' : '_' + lang}_enabled`,
            subject: `newsletter${lang === 'en' ? '' : '_' + lang}_subject`,
            body: `newsletter${lang === 'en' ? '' : '_' + lang}_body`,
            from: `newsletter${lang === 'en' ? '' : '_' + lang}_from`
        };
        let enabled = await getSetting(env, 'auto_reply', langKeys.enabled);
        if (enabled !== null) {
            const subject = await getSetting(env, 'auto_reply', langKeys.subject) || 'Welcome to the Dornori Newsletter';
            const body    = await getSetting(env, 'auto_reply', langKeys.body) || '';
            const from    = await getSetting(env, 'auto_reply', langKeys.from) || null;
            return { enabled: enabled === '1', subject, body, from };
        }
        if (lang !== 'en') {
            const enKeys = { enabled: 'newsletter_enabled', subject: 'newsletter_subject', body: 'newsletter_body', from: 'newsletter_from' };
            enabled = await getSetting(env, 'auto_reply', enKeys.enabled);
            if (enabled !== null) {
                const subject = await getSetting(env, 'auto_reply', enKeys.subject) || 'Welcome to the Dornori Newsletter';
                const body    = await getSetting(env, 'auto_reply', enKeys.body) || '';
                const from    = await getSetting(env, 'auto_reply', enKeys.from) || null;
                return { enabled: enabled === '1', subject, body, from };
            }
        }
        const legacyEnabled = await getSetting(env, 'auto_reply', 'newsletter_enabled');
        if (legacyEnabled !== null) {
            const subject = await getSetting(env, 'auto_reply', 'newsletter_subject') || 'Welcome to the Dornori Newsletter';
            const body    = await getSetting(env, 'auto_reply', 'newsletter_body') || '';
            const from    = await getSetting(env, 'auto_reply', 'newsletter_from') || null;
            return { enabled: legacyEnabled === '1', subject, body, from };
        }
        return { enabled: true, subject: 'Welcome to the Dornori Newsletter', body: '<p>Thanks for subscribing!</p>', from: null };
    }
    
    const langKeys = {
        enabled: `${cat}_${lang}_enabled`,
        subject: `${cat}_${lang}_subject`,
        body: `${cat}_${lang}_body`,
        from: `${cat}_${lang}_from`
    };
    let enabled = await getSetting(env, 'auto_reply', langKeys.enabled);
    if (enabled !== null) {
        const subject = await getSetting(env, 'auto_reply', langKeys.subject) || '';
        const body    = await getSetting(env, 'auto_reply', langKeys.body) || '';
        const from    = await getSetting(env, 'auto_reply', langKeys.from) || null;
        return { enabled: enabled === '1', subject, body, from };
    }
    if (lang !== 'en') {
        const enKeys = { enabled: `${cat}_en_enabled`, subject: `${cat}_en_subject`, body: `${cat}_en_body`, from: `${cat}_en_from` };
        enabled = await getSetting(env, 'auto_reply', enKeys.enabled);
        if (enabled !== null) {
            const subject = await getSetting(env, 'auto_reply', enKeys.subject) || '';
            const body    = await getSetting(env, 'auto_reply', enKeys.body) || '';
            const from    = await getSetting(env, 'auto_reply', enKeys.from) || null;
            return { enabled: enabled === '1', subject, body, from };
        }
    }
    const legacyKeys = { enabled: `${cat}_enabled`, subject: `${cat}_subject`, body: `${cat}_body`, from: `${cat}_from` };
    enabled = await getSetting(env, 'auto_reply', legacyKeys.enabled);
    if (enabled === null) return null;
    const subject = await getSetting(env, 'auto_reply', legacyKeys.subject) || `[Ticket {{ticket_id}}] Your ${cat} inquiry`;
    const body    = await getSetting(env, 'auto_reply', legacyKeys.body) || `<p>Thank you for your ${cat} inquiry. We will respond shortly.</p>`;
    const from    = await getSetting(env, 'auto_reply', legacyKeys.from) || null;
    return { enabled: enabled === '1', subject, body, from };
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
}

async function getAllAutoReplies(env) {
    const all = await getAllSettings(env);
    const replies = {};
    for (const s of all) {
        if (s.category !== 'auto_reply') continue;
        const parts = s.key.split('_');
        if (parts.length < 2) continue;
        let cat, lang, suffix;
        if (s.key.startsWith('newsletter')) {
            if (s.key === 'newsletter_enabled' || s.key === 'newsletter_subject' || s.key === 'newsletter_body' || s.key === 'newsletter_from') {
                cat = 'newsletter'; lang = 'en'; suffix = s.key.replace('newsletter_', '');
            } else {
                const match = s.key.match(/^newsletter_([a-z]{2})_(enabled|subject|body|from)$/);
                if (!match) continue;
                cat = 'newsletter'; lang = match[1]; suffix = match[2];
            }
        } else {
            cat = parts[0]; lang = parts[1]; suffix = parts.slice(2).join('_');
        }
        if (!replies[cat]) replies[cat] = {};
        if (!replies[cat][lang]) replies[cat][lang] = {};
        replies[cat][lang][suffix] = s.value;
    }
    const result = [];
    for (const cat in replies) {
        for (const lang in replies[cat]) {
            const r = replies[cat][lang];
            result.push({ category: cat, language: lang, enabled: r.enabled === '1' ? 1 : 0, subject: r.subject || '', body: r.body || '', from: r.from || null });
        }
    }
    return result;
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
    if (!unsubPath && lang !== 'en') unsubPath = await getSetting(env, 'newsletter', 'unsubscribe_link_path_en');
    if (!unsubPath) unsubPath = await getSetting(env, 'newsletter', 'unsubscribe_link_path');
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
    return await env.DB.prepare('SELECT * FROM newsletters WHERE id = ?').bind(id).first();
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
    if (lang) { query += ' AND ns.language = ?'; params.push(lang); }
    const subscribers = await env.DB.prepare(query).bind(...params).all();
    const list = subscribers.results || [];
    let sent = 0;
    for (const sub of list) {
        const unsubLink = await buildUnsubscribeLink(env, sub.token, sub.language);
        let personalBody = body
            .replaceAll('{{subscriber_email}}', sub.email)
            .replaceAll('{{subscriber_name}}', sub.name || '')
            .replaceAll('{{unsubscribe_link}}', unsubLink);
        const res = await sendEmail(env, sub.email, subject, personalBody, 'newsletter@dornori.com');
        if (res.success) sent++;
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
    return { id, ticket_number: ticketNumber, category, language, status: 'new', sender_name: senderName, sender_email: data.senderEmail || '', subject, created_at: now, message: data.message || '' };
}
async function getSLA(env, category) {
    const cat = normalizeCategory(category);
    const resp = parseInt(await getSetting(env, 'sla', cat + '_response') || '24');
    const resol = parseInt(await getSetting(env, 'sla', cat + '_resolution') || '72');
    return { responseDue: new Date(Date.now() + resp * 3600000).toISOString(), resolutionDue: new Date(Date.now() + resol * 3600000).toISOString() };
}
async function getTicket(id, env) {
    const ticket = await env.DB.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first();
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
    return getTicket(id, env);
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
        query += ` AND status IN (${filters.statuses.map(() => '?').join(',')})`;
        params.push(...filters.statuses);
    } else if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
    if (filters.category) { query += ' AND category = ?'; params.push(filters.category); }
    if (filters.language) { query += ' AND language = ?'; params.push(filters.language); }
    const sortMap = { 'sla': 'sla_status DESC, last_action DESC', 'last_updated': 'last_action DESC', 'created': 'created_at DESC' };
    query += ` ORDER BY ${sortMap[filters.sort || 'last_updated'] || 'last_action DESC'}`;
    if (filters.limit) {
        query += ' LIMIT ?'; params.push(filters.limit);
        if (filters.offset) { query += ' OFFSET ?'; params.push(filters.offset); }
    }
    const r = await env.DB.prepare(query).bind(...params).all();
    return r.results || [];
}
async function getTotalTicketCount(filters, env) {
    let query = 'SELECT COUNT(*) as total FROM ticket_summary WHERE 1=1';
    const params = [];
    if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
        query += ` AND status IN (${filters.statuses.map(() => '?').join(',')})`;
        params.push(...filters.statuses);
    } else if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
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
    const result = { status: { new: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 }, daily: [], categories: {}, top_senders: [], sla: { on_track: 0, at_risk: 0, breached: 0 } };
    try {
        const statusRes = await env.DB.prepare(`SELECT status, COUNT(*) as count FROM tickets GROUP BY status`).all();
        for (const row of statusRes.results || []) if (result.status.hasOwnProperty(row.status)) result.status[row.status] = row.count;
    } catch(e) {}
    try {
        const dailyRes = await env.DB.prepare(`SELECT date(created_at) as day, COUNT(*) as count FROM tickets WHERE created_at >= datetime('now', '-30 days') GROUP BY date(created_at) ORDER BY day ASC`).all();
        result.daily = dailyRes.results || [];
    } catch(e) {}
    try {
        const catRes = await env.DB.prepare(`SELECT category, COUNT(*) as count FROM tickets GROUP BY category`).all();
        for (const row of catRes.results || []) result.categories[row.category] = row.count;
    } catch(e) {}
    try {
        const senderRes = await env.DB.prepare(`SELECT sender_email, COUNT(*) as count FROM tickets WHERE sender_email != '' GROUP BY sender_email ORDER BY count DESC LIMIT 10`).all();
        result.top_senders = senderRes.results || [];
    } catch(e) {}
    try {
        const slaResult = await env.DB.prepare(`
            SELECT 
                COUNT(CASE WHEN status IN ('resolved','closed') OR datetime(sla_resolution_due) > datetime('now') THEN 1 END) as on_track,
                COUNT(CASE WHEN status NOT IN ('resolved','closed') AND datetime(sla_response_due) < datetime('now') AND datetime(sla_resolution_due) > datetime('now') THEN 1 END) as at_risk,
                COUNT(CASE WHEN status NOT IN ('resolved','closed') AND datetime(sla_resolution_due) < datetime('now') THEN 1 END) as breached
            FROM tickets
        `).first();
        result.sla = { on_track: slaResult.on_track || 0, at_risk: slaResult.at_risk || 0, breached: slaResult.breached || 0 };
    } catch(e) { result.sla = { on_track: 0, at_risk: 0, breached: 0 }; }
    return result;
}

// ─── EMAIL ────────────────────────────────────────────────────
function formatEmailBody(text) {
    if (!text) return '';
    const blockTagRegex = /<(?:p|div|h[1-6]|ul|ol|blockquote)[\s>]/i;
    if (blockTagRegex.test(text)) return text;
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r\n|\r|\n/g, '</p><p>');
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
            to, subject: safeSubject, message: fullHtml, from
        };
        const formBody = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
        const res = await fetch(env.SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
        const data = await res.json();
        return data.status === 'success' ? { success: true } : { success: false, error: data.message || 'Apps Script error' };
    } catch (err) { return { success: false, error: err.message }; }
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
    const replacements = { '{{ticket_id}}': ticket.ticket_number, '{{sender_name}}': ticket.sender_name || '', '{{sender_email}}': ticket.sender_email || '', '{{category}}': cat, '{{subject}}': ticket.subject || '' };
    for (const [tag, val] of Object.entries(replacements)) { subject = subject.replaceAll(tag, val); body = body.replaceAll(tag, val); }
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
    const replacements = { '{{subscriber_email}}': email, '{{unsubscribe_link}}': unsubscribeLink };
    for (const [tag, val] of Object.entries(replacements)) { subject = subject.replaceAll(tag, val); body = body.replaceAll(tag, val); }
    const from = ar.from || 'newsletter@dornori.com';
    return await sendEmail(env, email, subject, formatEmailBody(body), from);
}

// ─── PUSH NOTIFICATIONS ──────────────────────────────────────
async function getPushSubscriptions(env) {
    const r = await env.DB.prepare('SELECT endpoint, keys FROM push_subscriptions').all();
    return (r.results || []).map(row => ({ endpoint: row.endpoint, keys: JSON.parse(row.keys) }));
}
async function savePushSubscription(env, subscription) {
    await env.DB.prepare(`
        INSERT INTO push_subscriptions (endpoint, keys, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(endpoint) DO UPDATE SET keys = ?, updated_at = datetime('now')
    `).bind(subscription.endpoint, JSON.stringify(subscription.keys), JSON.stringify(subscription.keys)).run();
}
async function deletePushSubscription(env, endpoint) {
    await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
}

// ─── PUSH ENCRYPTION (RFC 8291) ──────────────────────────────

function base64UrlToUint8Array(base64Url) {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

function uint8ToBase64Url(buf) {
    let binary = '';
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateVapidJWT(publicKeyBase64, privateKeyBase64, audience) {
    const pubBuf = base64UrlToUint8Array(publicKeyBase64);
    const privBuf = base64UrlToUint8Array(privateKeyBase64);

    const x = pubBuf.slice(1, 33);
    const y = pubBuf.slice(33, 65);

    const jwk = {
        kty: 'EC', crv: 'P-256',
        x: uint8ToBase64Url(x),
        y: uint8ToBase64Url(y),
        d: uint8ToBase64Url(privBuf)
    };

    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

    const header  = { alg: 'ES256', typ: 'JWT' };
    const now     = Math.floor(Date.now() / 1000);
    const payload = { aud: audience, exp: now + 86400, sub: 'mailto:admin@dornori.com' };

    const enc = (obj) => uint8ToBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
    const signingInput = enc(header) + '.' + enc(payload);

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        key,
        new TextEncoder().encode(signingInput)
    );

    return signingInput + '.' + uint8ToBase64Url(new Uint8Array(signature));
}

async function hkdfExpand(prk, info, length) {
    const encoder = new TextEncoder();
    const infoBytes = typeof info === 'string' ? encoder.encode(info) : info;
    
    const N = Math.ceil(length / 32);
    const okm = new Uint8Array(N * 32);
    
    let previous = new Uint8Array(0);
    
    for (let i = 1; i <= N; i++) {
        const input = new Uint8Array(previous.length + infoBytes.length + 1);
        input.set(previous);
        input.set(infoBytes, previous.length);
        input[input.length - 1] = i;
        
        const hmacKey = await crypto.subtle.importKey(
            'raw',
            prk,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', hmacKey, input);
        previous = new Uint8Array(signature);
        okm.set(previous, (i - 1) * 32);
    }
    
    return okm.slice(0, length);
}

async function encryptPushPayload(payload, subscription) {
    const encoder = new TextEncoder();
    
    const p256dh = base64UrlToUint8Array(subscription.keys.p256dh);
    const authSecret = base64UrlToUint8Array(subscription.keys.auth);
    
    const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    );
    
    const publicKeyRaw = new Uint8Array(
        await crypto.subtle.exportKey('raw', keyPair.publicKey)
    );
    
    const clientPublicKey = await crypto.subtle.importKey(
        'raw',
        p256dh,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
    );
    
    const sharedSecret = new Uint8Array(
        await crypto.subtle.deriveBits(
            { name: 'ECDH', public: clientPublicKey },
            keyPair.privateKey,
            256
        )
    );
    
    const hmacKey = await crypto.subtle.importKey(
        'raw',
        authSecret,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const prk = new Uint8Array(
        await crypto.subtle.sign('HMAC', hmacKey, sharedSecret)
    );
    
    const cekInfo = encoder.encode('Content-Encoding: aesgcm\0');
    const cekInfoFull = new Uint8Array([...cekInfo, 0x00, 0x00, 0x00, 0x01]);
    const cek = await hkdfExpand(prk, cekInfoFull, 16);
    
    const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
    const nonceInfoFull = new Uint8Array([...nonceInfo, 0x00, 0x00, 0x00, 0x0C]);
    const nonce = await hkdfExpand(prk, nonceInfoFull, 12);
    
    const plaintext = encoder.encode(JSON.stringify(payload));
    console.log(`📦 Encrypting ${plaintext.length} bytes:`, JSON.stringify(payload));
    
    const paddedPlaintext = new Uint8Array(plaintext.length + 1);
    paddedPlaintext[0] = 0x00;
    paddedPlaintext.set(plaintext, 1);
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        cek,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );
    
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: nonce, tagLength: 128 },
            cryptoKey,
            paddedPlaintext
        )
    );
    
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encrypted = new Uint8Array(salt.length + ciphertext.length);
    encrypted.set(salt);
    encrypted.set(ciphertext, salt.length);
    
    return {
        encrypted,
        salt,
        publicKey: publicKeyRaw,
        ciphertext
    };
}

// ─── SEND PUSH NOTIFICATION ──────────────────────────────────

async function sendPushNotification(env, ticket) {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
        console.log('❌ Push skipped: VAPID keys missing');
        return { success: false, error: 'VAPID keys missing' };
    }

    const payload = {
        title: `🔔 New Ticket ${ticket.ticket_number}`,
        body: ticket.subject || 'New ticket received',
        url: '/admin/dashboard.html',
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        category: ticket.category || 'support',
        status: ticket.status || 'new'
    };

    console.log('📤 Sending push for ticket:', ticket.ticket_number);
    console.log('📦 Payload:', JSON.stringify(payload));

    const subscriptions = await getPushSubscriptions(env);
    if (subscriptions.length === 0) {
        console.log('⚠️ No push subscriptions found');
        return { success: true, sent: 0 };
    }

    let sent = 0;
    
    for (const sub of subscriptions) {
        try {
            const { encrypted, publicKey } = await encryptPushPayload(payload, sub);
            
            const audience = new URL(sub.endpoint).origin;
            const vapidJWT = await generateVapidJWT(
                env.VAPID_PUBLIC_KEY,
                env.VAPID_PRIVATE_KEY,
                audience
            );
            
            const dhKey = uint8ToBase64Url(publicKey);
            const vapidKey = env.VAPID_PUBLIC_KEY;
            
            console.log(`📤 Sending to: ${sub.endpoint.substring(0, 50)}...`);
            
            const response = await fetch(sub.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Encoding': 'aesgcm',
                    'Crypto-Key': `dh=${dhKey};p256ecdsa=${vapidKey}`,
                    'TTL': '86400',
                    'Authorization': `WebPush ${vapidJWT}`
                },
                body: encrypted
            });
            
            const responseText = await response.text();
            
            if (response.status === 201 || response.status === 200) {
                sent++;
                console.log('✅ Push sent successfully');
            } else if (response.status === 410 || response.status === 404) {
                await deletePushSubscription(env, sub.endpoint);
                console.log('🗑️ Removed expired subscription');
            } else {
                console.log(`❌ Push failed (${response.status}): ${responseText}`);
            }
        } catch (err) {
            console.error('❌ Push error:', err.message);
        }
    }
    
    console.log(`📊 Push result: ${sent}/${subscriptions.length} sent`);
    return { success: true, sent };
}

// ─── PARSE EMAIL ─────────────────────────────────────────────
function decodeQuotedPrintable(str) {
    str = str.replace(/=\r\n/g, '').replace(/=\n/g, '');
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(str.substr(i + 1, 2))) {
            bytes.push(parseInt(str.substr(i + 1, 2), 16)); i += 2;
        } else { bytes.push(str.charCodeAt(i)); }
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
            new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // ─── SERVE SERVICE WORKER ──────────────────────────────
        if (path === '/admin/sw.js' && method === 'GET') {
            return new Response(SW_CONTENT, {
                headers: {
                    'Content-Type': 'application/javascript',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });
        }

        try { await ensureAutoReplyDefaults(env); } catch(e) {}
        try { await ensureNewsletterAutoReplyDefault(env); } catch(e) {}

        try {
            // ─── TEST ENCRYPTION ENDPOINT ──────────────────────
            if (path === '/api/test-encryption' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                
                try {
                    const subscriptions = await getPushSubscriptions(env);
                    if (subscriptions.length === 0) {
                        return json({ error: 'No push subscriptions found. Click "Enable Live Updates" first.' }, 400);
                    }
                    
                    const sub = subscriptions[0];
                    
                    // ✅ Send a real ticket payload with TKT-2026-70005
                    const testPayload = {
                        title: '🔔 New Ticket TKT-2026-70005',
                        body: 'Test ticket with real ticket number',
                        url: '/admin/dashboard.html',
                        ticket_id: 70005,
                        ticket_number: 'TKT-2026-70005',
                        category: 'support',
                        status: 'new'
                    };
                    
                    console.log('📤 Sending test payload with ticket:', testPayload.ticket_number);
                    
                    const { encrypted, publicKey } = await encryptPushPayload(testPayload, sub);
                    
                    const audience = new URL(sub.endpoint).origin;
                    const vapidJWT = await generateVapidJWT(
                        env.VAPID_PUBLIC_KEY,
                        env.VAPID_PRIVATE_KEY,
                        audience
                    );
                    
                    const dhKey = uint8ToBase64Url(publicKey);
                    const vapidKey = env.VAPID_PUBLIC_KEY;
                    
                    const response = await fetch(sub.endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'Content-Encoding': 'aesgcm',
                            'Crypto-Key': `dh=${dhKey};p256ecdsa=${vapidKey}`,
                            'TTL': '86400',
                            'Authorization': `WebPush ${vapidJWT}`
                        },
                        body: encrypted
                    });
                    
                    const responseText = await response.text();
                    
                    return json({
                        success: response.status === 201 || response.status === 200,
                        status: response.status,
                        response: responseText,
                        payload_sent: testPayload,
                        subscription_endpoint: sub.endpoint.substring(0, 50) + '...'
                    });
                } catch (err) {
                    console.error('Test encryption error:', err);
                    return json({ error: err.message }, 500);
                }
            }

            // ─── DEBUG ENDPOINTS ──────────────────────────────
            if (path === '/api/debug/vapid-check' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                return json({
                    public_key_exists: !!env.VAPID_PUBLIC_KEY,
                    private_key_exists: !!env.VAPID_PRIVATE_KEY,
                    public_key_length: env.VAPID_PUBLIC_KEY?.length || 0,
                    private_key_length: env.VAPID_PRIVATE_KEY?.length || 0,
                    public_key_preview: env.VAPID_PUBLIC_KEY?.substring(0, 20) + '...'
                });
            }

            if (path === '/api/debug/clear-subscriptions' && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                await env.DB.prepare('DELETE FROM push_subscriptions').run();
                return json({ success: true, message: 'All subscriptions cleared' });
            }

            // ─── PUSH ENDPOINTS ────────────────────────────────
            if (path === '/api/push/public-key' && method === 'GET') {
                if (!env.VAPID_PUBLIC_KEY) return json({ error: 'VAPID public key not configured' }, 500);
                return json({ publicKey: env.VAPID_PUBLIC_KEY });
            }

            if (path === '/api/push/subscribe' && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const { subscription } = await request.json();
                if (!subscription || !subscription.endpoint) return json({ error: 'Invalid subscription' }, 400);
                await savePushSubscription(env, subscription);
                return json({ success: true });
            }

            if (path === '/api/push/subscribe' && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const { endpoint } = await request.json();
                if (!endpoint) return json({ error: 'Endpoint required' }, 400);
                await deletePushSubscription(env, endpoint);
                return json({ success: true });
            }

            if (path === '/api/test-push' && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const testTicket = { 
                    id: 99999, 
                    ticket_number: 'TKT-TEST-001', 
                    subject: 'Test Push Notification', 
                    sender_name: 'Test User', 
                    sender_email: 'test@example.com', 
                    category: 'test', 
                    status: 'new', 
                    created_at: new Date().toISOString() 
                };
                const result = await sendPushNotification(env, testTicket);
                const subscriptions = await getPushSubscriptions(env);
                return json({
                    success: result.success,
                    sent: result.sent || 0,
                    total_subscriptions: subscriptions.length,
                    message: result.success && result.sent > 0 ? 'Test push sent successfully' :
                             result.success && result.sent === 0 ? 'No subscribers found' : 'Test push failed'
                });
            }

            // ─── API ENDPOINTS ──────────────────────────────────
            if (path === '/api/admin/reports' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                return json({ success: true, data: await getReports(env) });
            }

            if (path === '/api/admin/stats' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                return json({ success: true, stats: await getStats(env) });
            }

            if (path === '/api/admin/auto-reply' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                return json({ success: true, data: await getAllAutoReplies(env) });
            }
            if (path === '/api/admin/auto-reply' && method === 'PUT') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const { category, language, enabled, subject, body, from } = await request.json();
                if (!category || !language) return json({ error: 'Category and language required' }, 400);
                await saveAutoReply(env, category, language, enabled, subject, body, from);
                return json({ success: true });
            }
            if (path === '/api/admin/auto-reply' && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const { category, language } = await request.json();
                if (!category || !language) return json({ error: 'Category and language required' }, 400);
                await deleteAutoReply(env, category, language);
                return json({ success: true });
            }

            if (path === '/api/admin/email-addresses' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const activeOnly = url.searchParams.get('active_only') === 'true';
                return json({ success: true, addresses: await getEmailAddresses(env, activeOnly) });
            }
            if (path === '/api/admin/email-addresses' && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const { email, label, action } = await request.json();
                if (!email || !label) return json({ error: 'Email and label required' }, 400);
                const cat = normalizeCategory(action || label);
                const knownCats = await getKnownCategories(env);
                if (!knownCats.includes(cat)) return json({ error: `Category "${cat}" does not exist.` }, 400);
                await addEmailAddress(env, email, label, cat);
                return json({ success: true });
            }
            if (path.match(/^\/api\/admin\/email-addresses\/\d+$/) && method === 'PUT') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const id = parseInt(path.split('/')[4]);
                const { email, label, action, is_active } = await request.json();
                const cat = normalizeCategory(action || label);
                const knownCats = await getKnownCategories(env);
                if (!knownCats.includes(cat)) return json({ error: `Category "${cat}" does not exist.` }, 400);
                await updateEmailAddress(env, id, email, label, cat, is_active);
                return json({ success: true });
            }
            if (path.match(/^\/api\/admin\/email-addresses\/\d+$/) && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const id = parseInt(path.split('/')[4]);
                await deleteEmailAddress(env, id);
                return json({ success: true });
            }

            if (path === '/api/admin/settings' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const settingsArray = await getAllSettings(env);
                const grouped = {};
                for (const s of settingsArray) { if (!grouped[s.category]) grouped[s.category] = {}; grouped[s.category][s.key] = s.value; }
                return json({ success: true, data: grouped, settings: settingsArray });
            }
            if (path === '/api/admin/settings' && method === 'PUT') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const { settings } = await request.json();
                for (const s of settings) await updateSetting(env, s.category, s.key, s.value);
                return json({ success: true });
            }

            if (path === '/api/admin/newsletters' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                return json({ success: true, data: await getNewsletters(env) });
            }
            if (path === '/api/admin/newsletters' && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
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
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const id = parseInt(path.split('/')[4]);
                await deleteNewsletter(id, env);
                return json({ success: true });
            }

            if (path === '/api/admin/subscribers' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                return json({ success: true, data: await getSubscribers(env) });
            }
            if (path.match(/^\/api\/admin\/subscribers\/\d+$/) && method === 'DELETE') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const id = parseInt(path.split('/')[4]);
                await deleteSubscriber(id, env);
                return json({ success: true });
            }

            if (path === '/api/subscribe' && method === 'POST') {
                const { email, name, language } = await request.json();
                if (!email) return json({ error: 'Email required' }, 400);
                const lang = (language || 'en').toLowerCase().trim();
                const { subscriber, token } = await addSubscriber(email, name || '', lang, env);
                const ticket = await createTicket({ category: 'newsletter', senderName: name || '', senderEmail: email, subject: 'Newsletter Subscription', message: 'Subscribed via website', language: lang, metadata: { subscriberId: subscriber.id } }, env);
                await sendNewsletterConfirmation(env, email, token, lang);
                ctx.waitUntil(sendPushNotification(env, ticket));
                return json({ success: true, subscriberId: subscriber.id, ticketNumber: ticket.ticket_number });
            }

            if (path.startsWith('/api/unsubscribe/') && method === 'GET') {
                const token = path.replace('/api/unsubscribe/', '');
                const result = await unsubscribe(token, env);
                if (result.success) return new Response('Unsubscribed successfully', { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
                return new Response('Invalid or expired token', { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
            }
            if (path === '/api/unsubscribe-email' && method === 'POST') {
                const { email } = await request.json();
                const result = await unsubscribeByEmail(email, env);
                return json(result, result.success ? 200 : 400);
            }

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
                    if (data.troubleshooting?.length) msgParts.push('Troubleshooting steps:', data.troubleshooting.join('\n'));
                    if (data.additionalComments?.length) msgParts.push('Additional comments:', data.additionalComments.join('\n'));
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
                ctx.waitUntil(sendPushNotification(env, ticket));
                return json({ success: true, ticketNumber: ticket.ticket_number, ticketId: ticket.id });
            }

            if (path === '/api/admin/login' && method === 'POST') {
                const { email, password } = await request.json();
                const user = USERS[email];
                if (!user) return json({ error: 'Invalid credentials' }, 401);
                if ((await sha256(password)) !== user.password_hash) return json({ error: 'Invalid credentials' }, 401);
                return json({ success: true, token: generateToken(email), user: { email, name: user.name, role: user.role } });
            }

            if (path === '/api/admin/tickets' && method === 'GET') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const limit = parseInt(url.searchParams.get('limit') || '50');
                const offset = parseInt(url.searchParams.get('offset') || '0');
                const statuses = url.searchParams.get('statuses') || null;
                const category = url.searchParams.get('category') || null;
                const language = url.searchParams.get('language') || null;
                const sort = url.searchParams.get('sort') || 'last_updated';
                const filters = { category, language, sort, limit, offset };
                if (statuses) filters.statuses = statuses.split(',').map(s => s.trim());
                else filters.status = url.searchParams.get('status') || null;
                const tickets = await getTickets(filters, env);
                const total = await getTotalTicketCount(filters, env);
                return json({ success: true, tickets, pagination: { limit, offset, total } });
            }

            if (path.startsWith('/api/admin/ticket/') && method === 'GET' && !path.includes('/status') && !path.includes('/comment') && !path.includes('/reply')) {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const id = parseInt(path.split('/')[4]);
                if (isNaN(id)) return json({ error: 'Invalid ticket ID' }, 400);
                const ticket = await getTicket(id, env);
                if (!ticket) return json({ error: 'Not found' }, 404);
                return json({ success: true, data: ticket });
            }

            if (path.startsWith('/api/admin/ticket/') && path.includes('/status') && method === 'PUT') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const id = parseInt(path.split('/')[4]);
                const { status } = await request.json();
                return json({ success: true, data: await updateTicket(id, { status }, env) });
            }

            if (path.startsWith('/api/admin/ticket/') && path.includes('/comment') && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const id = parseInt(path.split('/')[4]);
                const { content, type } = await request.json();
                const comment = await addComment(id, { type: type || 'internal', authorEmail: verifyToken(token), content }, env);
                return json({ success: true, data: comment });
            }

            if (path.startsWith('/api/admin/ticket/') && path.includes('/reply') && method === 'POST') {
                const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
                if (!verifyToken(token)) return json({ error: 'Unauthorized' }, 401);
                const id = parseInt(path.split('/')[4]);
                const { from, body } = await request.json();
                const ticket = await getTicket(id, env);
                if (!ticket) return json({ error: 'Not found' }, 404);
                const emailResult = await sendEmail(env, ticket.sender_email, `Re: [${ticket.ticket_number}] ${ticket.subject}`, body, from);
                if (emailResult.success) {
                    await addComment(id, { type: 'public', authorEmail: from || 'system', content: 'Reply sent: ' + body }, env);
                    return json({ success: true });
                }
                return json({ success: false, error: emailResult.error }, 500);
            }

            return json({ error: 'Not found' }, 404);
        } catch (err) {
            console.error('Error:', err);
            return json({ error: err.message || 'Internal server error' }, 500);
        }
    },

    async email(message, env) {
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
                    if (['resolved', 'closed'].includes(ticket.status)) await updateTicket(ticket.id, { status: 'open' }, env);
                    return;
                }
            }
            const category = await getCategoryForIncomingAddress(env, message.to);
            const ticket = await createTicket({ category, senderName: from.split('@')[0] || 'Unknown', senderEmail: from, subject: subject || 'No subject', message: body || '(No content)', language: 'en', metadata: { source: 'email', to: message.to } }, env);
            if (from) await sendTicketConfirmation(ticket, env, from);
            await sendPushNotification(env, ticket);
        } catch (err) {
            console.log('❌ Email error:', err.message);
        }
    }
};