var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var cache = {
  settings: /* @__PURE__ */ new Map(),
  users: /* @__PURE__ */ new Map(),
  categories: null,
  languages: null,
  autoReplies: null,
  emailConfig: null,
  settingsTimestamp: 0,
  usersTimestamp: 0,
  emailConfigTimestamp: 0
};
var TICKET_CACHE_URL = "https://cache/ticket-list";
async function getTicketCache() {
  try {
    const res = await caches.default.match(TICKET_CACHE_URL);
    if (!res) return null;
    const data = await res.json();
    return data.tickets || null;
  } catch (e) {
    return null;
  }
}
__name(getTicketCache, "getTicketCache");
async function setTicketCache(tickets) {
  try {
    const res = new Response(JSON.stringify({ tickets }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=86400" }
    });
    await caches.default.put(TICKET_CACHE_URL, res);
  } catch (e) {
  }
}
__name(setTicketCache, "setTicketCache");
async function purgeTicketCache() {
  try {
    await caches.default.delete(TICKET_CACHE_URL);
  } catch (e) {
  }
}
__name(purgeTicketCache, "purgeTicketCache");
async function injectTicketIntoCache(updatedTicket, env) {
  const cacheRequest = new Request(TICKET_CACHE_URL);
  let response = await caches.default.match(cacheRequest);
  if (!response) return;
  try {
    const data = await response.json();
    const tickets = data.tickets || [];
    const index = tickets.findIndex((t) => t.id === updatedTicket.id || t.ticket_id === updatedTicket.id);
    const graceMap = await getAllSlaGrace(env);
    if (index !== -1) {
      tickets[index] = { ...tickets[index], ...updatedTicket };
      tickets[index].sla_status = computeSlaStatus(tickets[index], graceMap);
    } else {
      updatedTicket.sla_status = updatedTicket.sla_status || computeSlaStatus(updatedTicket, graceMap);
      tickets.unshift(updatedTicket);
    }
    const newResponse = new Response(JSON.stringify({ ...data, tickets }), response);
    await caches.default.put(cacheRequest, newResponse);
  } catch (e) {
  }
}
__name(injectTicketIntoCache, "injectTicketIntoCache");
function clearCache() {
  cache.settings.clear();
  cache.users.clear();
  cache.categories = null;
  cache.languages = null;
  cache.autoReplies = null;
  cache.emailConfig = null;
}
__name(clearCache, "clearCache");

async function bumpConfigVersion(env) {
  const version = Date.now().toString();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO settings (category, key, value, updated_at) VALUES ('system', 'config_version', ?, datetime('now'))`
  ).bind(version).run();
  clearCache();
  return version;
}
__name(bumpConfigVersion, "bumpConfigVersion");

async function generateToken(email, env) {
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured in environment variables");
  }
  const encoder = new TextEncoder();
  const keyData = encoder.encode(env.JWT_SECRET);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    email,
    exp: Math.floor(Date.now() / 1e3) + 86400,
    iat: Math.floor(Date.now() / 1e3)
  };
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signatureInput = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}
__name(generateToken, "generateToken");

async function verifyToken(token, env) {
  if (!token || !env.JWT_SECRET) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(env.JWT_SECRET);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signatureInput = `${headerB64}.${payloadB64}`;
    const signature = new Uint8Array(
      atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")).split("").map((c) => c.charCodeAt(0))
    );
    const isValid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(signatureInput));
    if (!isValid) return null;
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    if (Date.now() / 1e3 > payload.exp) return null;
    return payload.email;
  } catch (e) {
    console.error("Token verification failed:", e.message);
    return null;
  }
}
__name(verifyToken, "verifyToken");

async function getEmailConfig(env) {
  if (cache.emailConfig !== null) {
    console.log("📧 EMAIL_CONFIG retrieved from cache");
    return cache.emailConfig;
  }
  try {
    console.log("📧 Attempting to retrieve EMAIL_CONFIG from KV...");
    const config = await env.KV.get("EMAIL_CONFIG", "json");
    if (config) {
      console.log("✅ EMAIL_CONFIG retrieved from KV");
      cache.emailConfig = config;
      cache.emailConfigTimestamp = Date.now();
      return config;
    } else {
      console.error("❌ EMAIL_CONFIG not found in KV");
      throw new Error("EMAIL_CONFIG is required but not configured in KV");
    }
  } catch (e) {
    console.error("❌ getEmailConfig error:", e.message);
    throw new Error(`EMAIL_CONFIG required: ${e.message}`);
  }
}
__name(getEmailConfig, "getEmailConfig");

// ─── SECURE PASSWORD HASHING (Cloudflare-safe) ─────────────────
async function sha256(m) {
  const b = new TextEncoder().encode(m);
  const h = await crypto.subtle.digest("SHA-256", b);
  return [...new Uint8Array(h)].map(b2 => b2.toString(16).padStart(2, "0")).join("");
}
__name(sha256, "sha256");

async function hashPassword(password) {
  return await sha256(password);
}
__name(hashPassword, "hashPassword");

async function verifyPassword(password, storedHash) {
  return await sha256(password) === storedHash;
}
__name(verifyPassword, "verifyPassword");

// ─── SIMPLIFIED ROLE-BASED ACCESS CONTROL ──────────────────
// Resources: tickets, users, settings, newsletter, reports
// Actions: read (view), write (edit/create/delete)

const ROLE_RESOURCES = {
  admin: {
    tickets: ['read', 'write'],
    users: ['read', 'write'],
    settings: ['read', 'write'],
    newsletter: ['read', 'write'],
    reports: ['read', 'write']
  },
  manager: {
    tickets: ['read', 'write'],
    users: ['read'],
    settings: ['read'],
    newsletter: ['read', 'write'],
    reports: ['read', 'write']
  },
  tl: {
    tickets: ['read', 'write'],
    users: ['read'],
    newsletter: ['read'],
    reports: ['read']
  },
  agent: {
    tickets: ['read', 'write'],
    newsletter: [],
    reports: [],
    users: [],
    settings: []
  }
};

const VALID_ROLES = Object.keys(ROLE_RESOURCES);

const PERM_ACTION_MAP = {
  view: 'read', read: 'read',
  edit: 'write', create: 'write', delete: 'write',
  update: 'write', comment: 'write', reply: 'write',
  assign: 'write', send: 'write', write: 'write'
};

async function hasPermission(email, resource, action, env) {
  const user = await getUser(email, env);
  if (!user) return false;

  // Admins always have full access, matching buildEffectivePermissions().
  // Per-user overrides must never be able to lock an admin out.
  if (user.role === 'admin') return true;

  const fineAction = Object.keys(PERM_ACTION_MAP).includes(action) ? action : null;
  const coarseAction = PERM_ACTION_MAP[action] || (['read', 'write'].includes(action) ? action : null);
  if (!coarseAction) return false;

  // Per-user granular override takes precedence when explicitly set
  const override = user.page_permissions?.[resource];
  if (override && fineAction && typeof override[fineAction] === 'boolean') {
    return override[fineAction];
  }

  const resources = ROLE_RESOURCES[user.role] || {};
  const allowed = resources[resource] || [];
  return allowed.includes(coarseAction);
}
__name(hasPermission, "hasPermission");

const PERMISSION_RESOURCES = ['tickets', 'users', 'settings', 'newsletter', 'reports'];

// Resolves role defaults + per-user overrides into one flat object the
// frontend can read directly without re-implementing any ACL logic.
function buildEffectivePermissions(user) {
  const result = {};
  const roleRes = ROLE_RESOURCES[user.role] || {};
  for (const resource of PERMISSION_RESOURCES) {
    const allowed = roleRes[resource] || [];
    const base = {
      view: allowed.includes('read'),
      edit: allowed.includes('write'),
      create: allowed.includes('write'),
      delete: allowed.includes('write')
    };
    const override = user.page_permissions?.[resource] || {};
    result[resource] = {
      view: typeof override.view === 'boolean' ? override.view : base.view,
      edit: typeof override.edit === 'boolean' ? override.edit : base.edit,
      create: typeof override.create === 'boolean' ? override.create : base.create,
      delete: typeof override.delete === 'boolean' ? override.delete : base.delete
    };
  }
  if (user.role === 'admin') {
    for (const resource of PERMISSION_RESOURCES) result[resource] = { view: true, edit: true, create: true, delete: true };
  }
  return result;
}
__name(buildEffectivePermissions, "buildEffectivePermissions");

async function getUser(email, env) {
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (cache.users.has(normalizedEmail)) {
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
      const user = {
        email: row.email,
        name: row.name,
        role,
        password_hash: row.password_hash,
        allowed_languages: row.allowed_languages ? JSON.parse(row.allowed_languages) : [],
        allowed_emails: row.allowed_emails ? JSON.parse(row.allowed_emails) : [],
        allowed_categories: row.allowed_categories ? JSON.parse(row.allowed_categories) : [],
        team_id: row.team_id,
        page_permissions: (() => { try { return row.page_permissions ? JSON.parse(row.page_permissions) : {}; } catch (e) { return {}; } })()
      };
      cache.users.set(normalizedEmail, user);
      cache.usersTimestamp = Date.now();
      return user;
    }
  } catch (e) {
    console.error("getUser DB error:", e.message);
  }
  return null;
}
__name(getUser, "getUser");

// ─── CHECK ACCESS (backward compatible wrapper) ──────────────
async function getValidationSets(env) {
  let validLangs = [];
  try { validLangs = await getKnownLanguages(env); } catch (e) { validLangs = []; }
  let validCategories = [];
  try { validCategories = await getKnownCategories(env); } catch (e) { validCategories = []; }
  let validEmails = [];
  try {
    const r = await env.DB.prepare("SELECT email FROM email_addresses WHERE is_active = 1").all();
    validEmails = (r.results || []).map((row) => (row.email || "").toLowerCase());
  } catch (e) { validEmails = []; }
  return { validLangs, validCategories, validEmails };
}
__name(getValidationSets, "getValidationSets");

async function checkAccess(email, resource, action, env) {
  return await hasPermission(email, resource, action, env);
}
__name(checkAccess, "checkAccess");

// ─── LOGIN RATE LIMITING (persisted in the TicketHub Durable Object) ──────
// DO storage is strongly consistent and single-threaded per instance, so
// unlike KV (eventually consistent, ~60s propagation) or per-isolate memory
// (reset on every cold start / lost across isolates), counts here are exact
// and shared globally in real time.
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

function getHubStub(env) {
  if (!env.TICKET_HUB) return null;
  const id = env.TICKET_HUB.idFromName("global");
  return env.TICKET_HUB.get(id);
}
__name(getHubStub, "getHubStub");

async function isLoginRateLimited(key, env) {
  const stub = getHubStub(env);
  if (!stub) return false;
  try {
    const res = await stub.fetch("https://ticket-hub/rl-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key })
    });
    const data = await res.json();
    return !!data.limited;
  } catch (e) {
    console.error("isLoginRateLimited error:", e.message);
    return false;
  }
}
__name(isLoginRateLimited, "isLoginRateLimited");

async function recordFailedLogin(key, env) {
  const stub = getHubStub(env);
  if (!stub) return;
  try {
    await stub.fetch("https://ticket-hub/rl-fail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key })
    });
  } catch (e) {
    console.error("recordFailedLogin error:", e.message);
  }
}
__name(recordFailedLogin, "recordFailedLogin");

async function clearFailedLogins(key, env) {
  const stub = getHubStub(env);
  if (!stub) return;
  try {
    await stub.fetch("https://ticket-hub/rl-clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key })
    });
  } catch (e) {
    console.error("clearFailedLogins error:", e.message);
  }
}
__name(clearFailedLogins, "clearFailedLogins");

// ─── SANITIZATION FUNCTIONS ─────────────────────────────────
function sanitizeSubject(text) {
  if (!text) return "";
  let cleaned = text.replace(/[\x00-\x1F\x7F]/g, " ");
  cleaned = cleaned.replace(/<[^>]*>/g, "");
  return cleaned.replace(/\s+/g, " ").trim();
}
__name(sanitizeSubject, "sanitizeSubject");

function extractOrderNumber(text) {
  if (!text) return null;
  const orderRegex = /\b(DOR-\d{8}-[A-Z0-9]+)\b/i;
  const m = text.match(orderRegex);
  return m ? m[0].toUpperCase() : null;
}
__name(extractOrderNumber, "extractOrderNumber");

function sanitizeName(text) {
  if (!text) return "";
  let cleaned = text.replace(/[\x00-\x1F\x7F]/g, "");
  cleaned = cleaned.replace(/[^\p{L}\p{N}\p{Emoji}\s\.\-']/gu, "");
  return cleaned.trim();
}
__name(sanitizeName, "sanitizeName");

function normalizeCategory(c) {
  if (!c) return "unclassified";
  return String(c).trim().toLowerCase().replace(/\s+/g, "-");
}
__name(normalizeCategory, "normalizeCategory");

async function getDefaultLanguage(env) {
  const lang = await getSetting(env, "general", "default_language");
  if (!lang) {
    throw new Error("Default language not configured. Please set general.default_language in settings.");
  }
  return lang;
}
__name(getDefaultLanguage, "getDefaultLanguage");

async function getDefaultFrom(env) {
  const from = await getSetting(env, "email", "default_from");
  if (!from) {
    throw new Error("Default from address not configured. Please set email.default_from in settings.");
  }
  return from;
}
__name(getDefaultFrom, "getDefaultFrom");

async function getSetting(env, category, key) {
  const cacheKey = `${category}:${key}`;
  if (cache.settings.has(cacheKey)) {
    return cache.settings.get(cacheKey);
  }
  try {
    const r = await env.DB.prepare("SELECT value FROM settings WHERE category = ? AND key = ?").bind(category, key).first();
    const value = r ? r.value : null;
    cache.settings.set(cacheKey, value);
    cache.settingsTimestamp = Date.now();
    return value;
  } catch {
    return null;
  }
}
__name(getSetting, "getSetting");

async function getAllSettings(env) {
  try {
    const r = await env.DB.prepare("SELECT * FROM settings ORDER BY category, key").all();
    return r.results || [];
  } catch {
    return [];
  }
}
__name(getAllSettings, "getAllSettings");

async function updateSetting(env, category, key, value) {
  const existing = await env.DB.prepare("SELECT id FROM settings WHERE category = ? AND key = ?").bind(category, key).first();
  if (existing) {
    await env.DB.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE category = ? AND key = ?').bind(value, category, key).run();
  } else {
    await env.DB.prepare("INSERT INTO settings (category, key, value) VALUES (?, ?, ?)").bind(category, key, value).run();
  }
  const cacheKey = `${category}:${key}`;
  cache.settings.delete(cacheKey);
  cache.categories = null;
  cache.languages = null;
  cache.autoReplies = null;
}
__name(updateSetting, "updateSetting");

async function getKnownCategories(env) {
  if (cache.categories !== null) {
    return cache.categories;
  }
  const cats = /* @__PURE__ */ new Set(["unclassified"]);
  try {
    const r = await env.DB.prepare(
      `SELECT key, value FROM settings WHERE category = 'category' AND key LIKE '%_description'`
    ).all();
    for (const row of r.results || []) {
      const slug = row.key.replace(/_description$/, "");
      if (row.value !== "__deleted__") cats.add(slug);
    }
  } catch (e) {
  }
  cache.categories = Array.from(cats);
  cache.settingsTimestamp = Date.now();
  return cache.categories;
}
__name(getKnownCategories, "getKnownCategories");

async function getKnownLanguages(env) {
  if (cache.languages !== null) {
    return cache.languages;
  }
  try {
    const langs = await getSetting(env, "languages", "list");
    if (langs) {
      const parsed = JSON.parse(langs);
      cache.languages = parsed.map((l) => l.code);
      cache.settingsTimestamp = Date.now();
      return cache.languages;
    }
  } catch (e) {
  }
  throw new Error("No languages configured. Please configure languages in settings.");
}
__name(getKnownLanguages, "getKnownLanguages");

async function validateLanguage(language, env) {
  if (!language || language === "") {
    return await getDefaultLanguage(env);
  }
  const knownLangs = await getKnownLanguages(env);
  const normalized = language.toLowerCase().trim();
  if (!knownLangs.includes(normalized)) {
    throw new Error(`Language "${normalized}" not configured. Available: ${knownLangs.join(", ")}`);
  }
  return normalized;
}
__name(validateLanguage, "validateLanguage");

async function validateCategory(category, env) {
  if (!category || category === "") {
    return "unclassified";
  }
  const normalized = normalizeCategory(category);
  const knownCats = await getKnownCategories(env);
  if (!knownCats.includes(normalized)) {
    console.warn(`Category "${normalized}" not configured, falling back to "unclassified"`);
    return "unclassified";
  }
  return normalized;
}
__name(validateCategory, "validateCategory");

async function pushTicketNotification(ticket, env, eventType = "updated") {
  const notification = JSON.stringify({
    type: eventType === "created" ? "new_ticket" : "ticket_updated",
    ticket: {
      id: ticket.id,
      ticket_number: ticket.ticket_number || "",
      category: ticket.category || "unclassified",
      language: ticket.language || "",
      sla_status: ticket.sla_status || computeSlaStatus(ticket, await getAllSlaGrace(env)),
      status: ticket.status || "new",
      subject: ticket.subject || "",
      sender_name: ticket.sender_name || "Unknown",
      sender_email: ticket.sender_email || "",
      assigned_to: ticket.assigned_to || null,
      last_updated_by: ticket.last_updated_by || "",
      last_updated: ticket.updated_at || ticket.created_at || (/* @__PURE__ */ new Date()).toISOString()
    }
  });
  if (!env.TICKET_HUB) return;
  try {
    const id = env.TICKET_HUB.idFromName("global");
    const stub = env.TICKET_HUB.get(id);
    await stub.fetch("https://ticket-hub/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: notification
    });
  } catch (e) {
    console.error("pushTicketNotification error:", e.message);
  }
}
__name(pushTicketNotification, "pushTicketNotification");

async function getAgentsOnlineCount(env) {
  const row = await env.DB.prepare("SELECT count FROM agents_online WHERE id = 1").first();
  return row ? row.count : 0;
}
__name(getAgentsOnlineCount, "getAgentsOnlineCount");

async function setAgentsOnlineCount(env, n) {
  const value = Math.max(0, n);
  await env.DB.prepare("INSERT INTO agents_online (id, count) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET count = ?").bind(value, value).run();
  return value;
}
__name(setAgentsOnlineCount, "setAgentsOnlineCount");

async function applyTicketFilters(tickets, filters, user, env) {
  let rows = tickets;
  if (user && user.role !== "admin") {
    const allowedLanguages = user.allowed_languages || [];
    const allowedCategories = user.allowed_categories || [];
    if (allowedLanguages.length === 0 || allowedCategories.length === 0) return [];
    rows = rows.filter((t) => allowedLanguages.includes(t.language) && allowedCategories.includes(t.category));
  }
  if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
    rows = rows.filter((t) => filters.statuses.includes(t.status));
  } else if (filters.status) {
    rows = rows.filter((t) => t.status === filters.status);
  }
  if (filters.category) rows = rows.filter((t) => t.category === filters.category);
  if (filters.language) rows = rows.filter((t) => t.language === filters.language);
  if (filters.assigned_to) rows = rows.filter((t) => t.assigned_to === filters.assigned_to);
  const sort = filters.sort || "last_updated";
  const rank = /* @__PURE__ */ __name((t) => {
    if (["resolved", "closed"].includes(t.status)) return 3;
    if (t.sla_resolution_due && new Date(t.sla_resolution_due) < /* @__PURE__ */ new Date()) return 0;
    if (t.sla_response_due && new Date(t.sla_response_due) < /* @__PURE__ */ new Date()) return 1;
    return 2;
  }, "rank");
  rows = rows.slice().sort((a, b) => {
    if (sort === "sla") {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return new Date(b.last_action || 0).getTime() - new Date(a.last_action || 0).getTime();
    }
    if (sort === "created") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    return new Date(b.last_action || 0).getTime() - new Date(a.last_action || 0).getTime();
  });
  const graceMap = await getAllSlaGrace(env);
  for (const row of rows) row.sla_status = computeSlaStatus(row, graceMap);
  return rows;
}
__name(applyTicketFilters, "applyTicketFilters");

async function getTicketSnapshot(ticketId, env) {
  try {
    const ticket = await env.DB.prepare(`
            SELECT id, ticket_number, subject, status, category, language, 
                   sender_email, sender_name, priority, created_at, updated_at, last_action, last_updated_by
            FROM tickets WHERE id = ?
        `).bind(ticketId).first();
    return ticket || null;
  } catch (e) {
    return null;
  }
}
__name(getTicketSnapshot, "getTicketSnapshot");

async function getTicketByOrderNumber(orderNumber, env) {
  if (!orderNumber) return null;
  return await env.DB.prepare("SELECT * FROM tickets WHERE order_number = ? LIMIT 1").bind(orderNumber).first();
}
__name(getTicketByOrderNumber, "getTicketByOrderNumber");

async function getAutoReply(env, category, language) {
  const cat = await validateCategory(category, env);
  const lang = await validateLanguage(language, env);
  if (cat === "newsletter") {
    const langKeys2 = {
      enabled: `newsletter${lang === "en" ? "" : "_" + lang}_enabled`,
      subject: `newsletter${lang === "en" ? "" : "_" + lang}_subject`,
      body: `newsletter${lang === "en" ? "" : "_" + lang}_body`,
      from: `newsletter${lang === "en" ? "" : "_" + lang}_from`
    };
    let enabled2 = await getSetting(env, "auto_reply", langKeys2.enabled);
    if (enabled2 !== null) {
      const subject = await getSetting(env, "auto_reply", langKeys2.subject);
      const body = await getSetting(env, "auto_reply", langKeys2.body);
      const from = await getSetting(env, "auto_reply", langKeys2.from);
      if (!subject || !body) {
        throw new Error(`Newsletter auto-reply subject and body must be configured for language: ${lang}`);
      }
      return { enabled: enabled2 === "1", subject, body, from };
    }
    if (lang !== "en") {
      const enKeys = {
        enabled: "newsletter_enabled",
        subject: "newsletter_subject",
        body: "newsletter_body",
        from: "newsletter_from"
      };
      enabled2 = await getSetting(env, "auto_reply", enKeys.enabled);
      if (enabled2 !== null) {
        const subject = await getSetting(env, "auto_reply", enKeys.subject);
        const body = await getSetting(env, "auto_reply", enKeys.body);
        const from = await getSetting(env, "auto_reply", enKeys.from);
        if (!subject || !body) {
          throw new Error(`Newsletter auto-reply subject and body must be configured for language: en`);
        }
        return { enabled: enabled2 === "1", subject, body, from };
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
  let enabled = await getSetting(env, "auto_reply", langKeys.enabled);
  if (enabled !== null) {
    const subject = await getSetting(env, "auto_reply", langKeys.subject);
    const body = await getSetting(env, "auto_reply", langKeys.body);
    const from = await getSetting(env, "auto_reply", langKeys.from);
    if (!subject || !body) {
      throw new Error(`Auto-reply subject and body must be configured for category: ${cat}, language: ${lang}`);
    }
    return { enabled: enabled === "1", subject, body, from };
  }
  if (lang !== "en") {
    const enKeys = {
      enabled: `${cat}_en_enabled`,
      subject: `${cat}_en_subject`,
      body: `${cat}_en_body`,
      from: `${cat}_en_from`
    };
    enabled = await getSetting(env, "auto_reply", enKeys.enabled);
    if (enabled !== null) {
      const subject = await getSetting(env, "auto_reply", enKeys.subject);
      const body = await getSetting(env, "auto_reply", enKeys.body);
      const from = await getSetting(env, "auto_reply", enKeys.from);
      if (!subject || !body) {
        throw new Error(`Auto-reply subject and body must be configured for category: ${cat}, language: en`);
      }
      return { enabled: enabled === "1", subject, body, from };
    }
  }
  const legacyEnabled = await getSetting(env, "auto_reply", cat + "_enabled");
  if (legacyEnabled !== null) {
    const subject = await getSetting(env, "auto_reply", cat + "_subject");
    const body = await getSetting(env, "auto_reply", cat + "_body");
    const from = await getSetting(env, "auto_reply", cat + "_from");
    if (!subject || !body) {
      throw new Error(`Legacy auto-reply subject and body must be configured for category: ${cat}`);
    }
    return { enabled: legacyEnabled === "1", subject, body, from };
  }
  throw new Error(`Auto-reply not configured for category: ${cat}, language: ${lang}`);
}
__name(getAutoReply, "getAutoReply");

async function saveAutoReply(env, category, language, enabled, subject, body, from) {
  const cat = await validateCategory(category, env);
  const lang = await validateLanguage(language, env);
  if (!subject || !body) {
    throw new Error("Subject and body are required for auto-reply");
  }
  if (cat === "newsletter") {
    const langKey = lang === "en" ? "" : "_" + lang;
    await updateSetting(env, "auto_reply", `newsletter${langKey}_enabled`, enabled ? "1" : "0");
    await updateSetting(env, "auto_reply", `newsletter${langKey}_subject`, subject);
    await updateSetting(env, "auto_reply", `newsletter${langKey}_body`, body);
    await updateSetting(env, "auto_reply", `newsletter${langKey}_from`, from || "");
  } else {
    await updateSetting(env, "auto_reply", `${cat}_${lang}_enabled`, enabled ? "1" : "0");
    await updateSetting(env, "auto_reply", `${cat}_${lang}_subject`, subject);
    await updateSetting(env, "auto_reply", `${cat}_${lang}_body`, body);
    await updateSetting(env, "auto_reply", `${cat}_${lang}_from`, from || "");
  }
  cache.autoReplies = null;
}
__name(saveAutoReply, "saveAutoReply");

async function deleteAutoReply(env, category, language) {
  const cat = await validateCategory(category, env);
  const lang = await validateLanguage(language, env);
  if (cat === "newsletter") {
    const langKey = lang === "en" ? "" : "_" + lang;
    await updateSetting(env, "auto_reply", `newsletter${langKey}_enabled`, "0");
  } else {
    await updateSetting(env, "auto_reply", `${cat}_${lang}_enabled`, "0");
  }
  cache.autoReplies = null;
}
__name(deleteAutoReply, "deleteAutoReply");

async function getAllAutoReplies(env) {
  if (cache.autoReplies !== null) {
    return cache.autoReplies;
  }
  try {
    const r = await env.DB.prepare("SELECT * FROM settings WHERE category = 'auto_reply' ORDER BY category, key").all();
    const replies = {};
    for (const s of r.results || []) {
      const parts = s.key.split("_");
      if (parts.length < 2) continue;
      let cat, lang, suffix;
      if (s.key.startsWith("newsletter")) {
        if (s.key === "newsletter_enabled" || s.key === "newsletter_subject" || s.key === "newsletter_body" || s.key === "newsletter_from") {
          cat = "newsletter";
          lang = "default";
          suffix = s.key.replace("newsletter_", "");
        } else {
          const match = s.key.match(/^newsletter_([a-z]{2})_(enabled|subject|body|from)$/);
          if (!match) continue;
          cat = "newsletter";
          lang = match[1];
          suffix = match[2];
        }
      } else {
        if (parts.length === 2) {
          cat = parts[0];
          lang = "default";
          suffix = parts[1];
        } else if (parts.length >= 3) {
          cat = parts[0];
          lang = parts[1];
          suffix = parts.slice(2).join("_");
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
        const r2 = replies[cat][lang];
        if (r2.enabled === void 0 || r2.subject === void 0 || r2.body === void 0) continue;
        result.push({
          category: cat,
          language: lang,
          enabled: r2.enabled === "1" ? 1 : 0,
          subject: r2.subject || "",
          body: r2.body || "",
          from: r2.from || null
        });
      }
    }
    cache.autoReplies = result;
    cache.settingsTimestamp = Date.now();
    return result;
  } catch {
    return [];
  }
}
__name(getAllAutoReplies, "getAllAutoReplies");

async function getEmailAddresses(env, activeOnly = false) {
  try {
    const q = activeOnly ? "SELECT * FROM email_addresses WHERE is_active = 1 ORDER BY label" : "SELECT * FROM email_addresses ORDER BY label";
    const r = await env.DB.prepare(q).all();
    return r.results || [];
  } catch {
    return [];
  }
}
__name(getEmailAddresses, "getEmailAddresses");

async function addEmailAddress(env, email, label, action, language) {
  if (!language) {
    throw new Error("Language is required for email address configuration");
  }
  await validateLanguage(language, env);
  await env.DB.prepare("INSERT INTO email_addresses (email, label, action, language) VALUES (?, ?, ?, ?)").bind(email, label, action, language).run();
}
__name(addEmailAddress, "addEmailAddress");

async function updateEmailAddress(env, id, email, label, action, language, is_active) {
  if (language) {
    await validateLanguage(language, env);
  }
  await env.DB.prepare('UPDATE email_addresses SET email = ?, label = ?, action = ?, language = ?, is_active = ?, updated_at = datetime("now") WHERE id = ?').bind(email, label, action, language, is_active, id).run();
}
__name(updateEmailAddress, "updateEmailAddress");

async function deleteEmailAddress(env, id) {
  await env.DB.prepare("DELETE FROM email_addresses WHERE id = ?").bind(id).run();
}
__name(deleteEmailAddress, "deleteEmailAddress");

async function getEmailAddressConfig(env, toAddress) {
  if (!toAddress) {
    return { category: "unclassified", language: await getDefaultLanguage(env) };
  }
  const clean = toAddress.toLowerCase().trim();
  try {
    const row = await env.DB.prepare("SELECT action, language FROM email_addresses WHERE is_active = 1 AND lower(email) = ?").bind(clean).first();
    if (row && row.action) {
      let category = normalizeCategory(row.action);
      let language = row.language;
      try {
        category = await validateCategory(category, env);
      } catch (e) {
        console.warn(`Category "${category}" not found, falling back to "unclassified"`);
        category = "unclassified";
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
    console.error("getEmailAddressConfig error:", e.message);
  }
  return {
    category: "unclassified",
    language: await getDefaultLanguage(env)
  };
}
__name(getEmailAddressConfig, "getEmailAddressConfig");

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
  const subscriber = await env.DB.prepare("SELECT * FROM newsletter_subscribers WHERE email = ?").bind(email).first();
  await env.DB.prepare(`
        INSERT INTO unsubscribe_tokens (subscriber_id, token, expires_at)
        VALUES (?, ?, datetime("now", "+365 days"))
        ON CONFLICT(subscriber_id) DO UPDATE SET token = ?, expires_at = datetime("now", "+365 days")
    `).bind(subscriber.id, token, token).run();
  return { subscriber, token };
}
__name(addSubscriber, "addSubscriber");

async function unsubscribe(token, env) {
  const result = await env.DB.prepare('SELECT subscriber_id FROM unsubscribe_tokens WHERE token = ? AND expires_at > datetime("now")').bind(token).first();
  if (!result) return { success: false, message: "Invalid or expired token" };
  await env.DB.prepare('UPDATE newsletter_subscribers SET status = "unsubscribed", unsubscribed_at = datetime("now") WHERE id = ?').bind(result.subscriber_id).run();
  return { success: true };
}
__name(unsubscribe, "unsubscribe");

async function unsubscribeByEmail(email, env) {
  const clean = (email || "").toLowerCase().trim();
  if (!clean) return { success: false, message: "Email required" };
  const subscriber = await env.DB.prepare("SELECT id FROM newsletter_subscribers WHERE lower(email) = ?").bind(clean).first();
  if (!subscriber) return { success: false, message: "Email not found on our list" };
  await env.DB.prepare('UPDATE newsletter_subscribers SET status = "unsubscribed", unsubscribed_at = datetime("now") WHERE id = ?').bind(subscriber.id).run();
  return { success: true };
}
__name(unsubscribeByEmail, "unsubscribeByEmail");

async function getSubscribers(env) {
  try {
    const r = await env.DB.prepare("SELECT id, email, name, language, status, subscribed_at, unsubscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC").all();
    return r.results || [];
  } catch {
    return [];
  }
}
__name(getSubscribers, "getSubscribers");

async function deleteSubscriber(id, env) {
  await env.DB.prepare("DELETE FROM unsubscribe_tokens WHERE subscriber_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM newsletter_subscribers WHERE id = ?").bind(id).run();
}
__name(deleteSubscriber, "deleteSubscriber");

async function buildUnsubscribeLink(env, token, language) {
  const domain = await getSetting(env, "general", "domain");
  if (!domain) {
    throw new Error("Domain not configured. Please set general.domain in settings.");
  }
  const lang = await validateLanguage(language, env);
  let unsubPath = await getSetting(env, "newsletter", `unsubscribe_link_path_${lang}`);
  if (!unsubPath && lang !== "en") {
    unsubPath = await getSetting(env, "newsletter", "unsubscribe_link_path_en");
  }
  if (!unsubPath) {
    unsubPath = await getSetting(env, "newsletter", "unsubscribe_link_path");
  }
  if (!unsubPath) {
    throw new Error(`Unsubscribe link path not configured for language: ${lang}`);
  }
  const cleanDomain = domain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const cleanPath = unsubPath.replace(/^\//, "");
  return `https://${cleanDomain}/${cleanPath}?token=${token}`;
}
__name(buildUnsubscribeLink, "buildUnsubscribeLink");

async function createNewsletter(env, subject, body, language, status = "draft") {
  const lang = language === "all" ? "all" : await validateLanguage(language, env);
  const result = await env.DB.prepare(
    `INSERT INTO newsletters (subject, body, language, status, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
  ).bind(subject, body || "", lang, status).run();
  const id = result.meta ? result.meta.last_row_id : result.lastInsertRowid;
  const row = await env.DB.prepare("SELECT * FROM newsletters WHERE id = ?").bind(id).first();
  return row;
}
__name(createNewsletter, "createNewsletter");

async function getNewsletters(env) {
  const r = await env.DB.prepare("SELECT * FROM newsletters ORDER BY created_at DESC").all();
  return r.results || [];
}
__name(getNewsletters, "getNewsletters");

async function deleteNewsletter(id, env) {
  await env.DB.prepare("DELETE FROM newsletters WHERE id = ?").bind(id).run();
}
__name(deleteNewsletter, "deleteNewsletter");

async function sendNewsletter(env, subject, body, language) {
  const lang = language === "all" ? null : await validateLanguage(language, env);
  let query = `SELECT ns.id, ns.email, ns.name, ns.language, ut.token FROM newsletter_subscribers ns
                 LEFT JOIN unsubscribe_tokens ut ON ut.subscriber_id = ns.id
                 WHERE ns.status = 'active'`;
  const params = [];
  if (lang) {
    query += " AND ns.language = ?";
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
      let personalBody = body.replaceAll("{{subscriber_email}}", sub.email).replaceAll("{{subscriber_name}}", sub.name || "").replaceAll("{{unsubscribe_link}}", unsubLink);
      const ar = await getAutoReply(env, "newsletter", sub.language);
      let from = ar.from;
      if (!from || from === "") {
        from = await getDefaultFrom(env);
      }
      const res = await sendEmail(env, sub.email, subject, personalBody, from);
      if (res.success) sent++;
    }));
  }
  const result = await env.DB.prepare(
    `INSERT INTO newsletters (subject, body, language, status, created_at, sent_at, recipient_count) 
         VALUES (?, ?, ?, 'sent', datetime('now'), datetime('now'), ?)`
  ).bind(subject, body, language === "all" ? "all" : lang, sent).run();
  const newsletterId = result.meta ? result.meta.last_row_id : result.lastInsertRowid;
  const newsletter = await env.DB.prepare("SELECT * FROM newsletters WHERE id = ?").bind(newsletterId).first();
  return { newsletter, sent };
}
__name(sendNewsletter, "sendNewsletter");

function generateTicketNumber() {
  const now = /* @__PURE__ */ new Date();
  const random = Math.floor(Math.random() * 1e5).toString().padStart(5, "0");
  return `TKT-${now.getFullYear()}-${random}`;
}
__name(generateTicketNumber, "generateTicketNumber");

function computeSlaStatus(ticket, graceMap = {}) {
  if (!ticket) return "on_track";
  if (!ticket.sla_response_due || !ticket.sla_resolution_due) return "on_track";
  const now = /* @__PURE__ */ new Date();
  const rd = new Date(ticket.sla_response_due), rld = new Date(ticket.sla_resolution_due);

  const cat = ticket.category || "unclassified";
  const grace = graceMap[cat] || { resolvedGraceHours: 0, closedGraceHours: 0 };
  const resolvedGracePeriod = (grace.resolvedGraceHours || 0) * 60 * 60 * 1000;
  const closedGracePeriod = (grace.closedGraceHours || 0) * 60 * 60 * 1000;

  // Grace periods apply from when the ticket entered the resolved/closed
  // state (updated_at), not from the original resolution due date.
  const transitionedAt = ticket.updated_at ? new Date(ticket.updated_at) : rld;

  if (ticket.status === "resolved") {
    const resolutionGrace = new Date(transitionedAt.getTime() + resolvedGracePeriod);
    if (now > resolutionGrace) return "breached";
    return "on_track";
  }

  if (ticket.status === "closed") {
    const closureGrace = new Date(transitionedAt.getTime() + closedGracePeriod);
    if (now > closureGrace) return "breached";
    return "on_track";
  }

  if (now > rld) return "breached";
  if (now > rd) return "at_risk";
  return "on_track";
}
__name(computeSlaStatus, "computeSlaStatus");

// Fetch all configured SLA grace periods once, keyed by category, so
// list endpoints don't do N+1 settings lookups per ticket.
async function getAllSlaGrace(env) {
  const list = await getAllSettings(env);
  const map = {};
  for (const s of list) {
    if (s.category !== "sla") continue;
    const respMatch = s.key.match(/^(.+)_resolved_grace$/);
    const closMatch = s.key.match(/^(.+)_closed_grace$/);
    if (respMatch) {
      const cat = respMatch[1];
      map[cat] = map[cat] || { resolvedGraceHours: 0, closedGraceHours: 0 };
      map[cat].resolvedGraceHours = parseInt(s.value) || 0;
    } else if (closMatch) {
      const cat = closMatch[1];
      map[cat] = map[cat] || { resolvedGraceHours: 0, closedGraceHours: 0 };
      map[cat].closedGraceHours = parseInt(s.value) || 0;
    }
  }
  return map;
}
__name(getAllSlaGrace, "getAllSlaGrace");

async function getSLA(env, category) {
  const cat = await validateCategory(category, env);
  const resp = await getSetting(env, "sla", cat + "_response");
  const resol = await getSetting(env, "sla", cat + "_resolution");
  const resolvedGrace = await getSetting(env, "sla", cat + "_resolved_grace") || "0";
  const closedGrace = await getSetting(env, "sla", cat + "_closed_grace") || "0";
  if (!resp || !resol) {
    throw new Error(`SLA response and resolution times must be configured for category: ${cat}`);
  }
  const respHours = parseInt(resp);
  const resolHours = parseInt(resol);
  const resolvedGraceHours = parseInt(resolvedGrace);
  const closedGraceHours = parseInt(closedGrace);
  if (isNaN(respHours) || isNaN(resolHours)) {
    throw new Error(`SLA times must be valid numbers for category: ${cat}`);
  }
  return {
    responseDue: new Date(Date.now() + respHours * 36e5).toISOString(),
    resolutionDue: new Date(Date.now() + resolHours * 36e5).toISOString(),
    resolvedGraceHours: resolvedGraceHours,
    closedGraceHours: closedGraceHours
  };
}
__name(getSLA, "getSLA");

async function createTicket(data, env) {
  const ticketNumber = generateTicketNumber();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const category = await validateCategory(data.category, env);
  const language = await validateLanguage(data.language, env);
  const sla = await getSLA(env, category);
  const orderNumber = data.orderNumber || extractOrderNumber(data.subject || "") || extractOrderNumber(data.message || "");
  const subject = sanitizeSubject(data.subject || "");
  const senderName = sanitizeName(data.senderName || "");
  const result = await env.DB.prepare(`
        INSERT INTO tickets (ticket_number, category, language, status, priority, sender_name, sender_email, sender_phone, 
        order_number, subject, message, created_at, last_action, sla_response_due, sla_resolution_due, metadata, last_updated_by)
        VALUES (?, ?, ?, 'new', 'medium', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
    ticketNumber,
    category,
    language,
    senderName,
    data.senderEmail || "",
    data.senderPhone || "",
    orderNumber,
    subject,
    data.message || "",
    now,
    now,
    sla.responseDue,
    sla.resolutionDue,
    JSON.stringify(data.metadata || {}),
    data.senderEmail || ""
  ).run();
  const id = result.meta?.last_row_id || result.lastInsertRowid;
  const newTicket = await getTicket(id, env);
  if (newTicket) {
    await injectTicketIntoCache(newTicket, env);
  }
  await pushTicketNotification(newTicket || { id, ticket_number: ticketNumber, category, language, status: "new", subject }, env, "created");
  return newTicket;
}
__name(createTicket, "createTicket");

async function getTicket(id, env) {
  const ticket = await env.DB.prepare(`
        SELECT id, ticket_number, category, language, status, priority, 
               sender_name, sender_email, sender_phone, order_number,
               subject, message, created_at, updated_at, last_action, 
               sla_response_due, sla_resolution_due, assigned_to, metadata,
               last_updated_by
        FROM tickets WHERE id = ?
    `).bind(id).first();
  if (!ticket) return null;
  ticket.sla_status = computeSlaStatus(ticket, await getAllSlaGrace(env));
  const comments = await env.DB.prepare("SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC").bind(id).all();
  ticket.ticket_id = ticket.id;
  return { ...ticket, comments: comments.results || [] };
}
__name(getTicket, "getTicket");

async function updateTicket(id, data, env) {
  const updates = [], values = [];
  if (data.status) {
    updates.push("status = ?");
    values.push(data.status);
  }
  if ("assigned_to" in data) {
    updates.push("assigned_to = ?");
    values.push(data.assigned_to || null);
  }
  if (data.priority) {
    updates.push("priority = ?");
    values.push(data.priority);
  }
  if (updates.length === 0) return null;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  updates.push("last_action = ?", "updated_at = ?");
  values.push(nowIso, nowIso);
  values.push(id);
  await env.DB.prepare(`UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  const updatedTicket = await getTicket(id, env);
  if (updatedTicket) {
    await pushTicketNotification(updatedTicket, env);
    await injectTicketIntoCache(updatedTicket, env);
  }
  return updatedTicket;
}
__name(updateTicket, "updateTicket");

async function addComment(ticketId, data, env) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const result = await env.DB.prepare(`
        INSERT INTO ticket_comments (ticket_id, comment_type, author_email, content, created_at, old_status, new_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(ticketId, data.type || "public", data.authorEmail || "", data.content, now, data.oldStatus || null, data.newStatus || null).run();
  await env.DB.prepare("UPDATE tickets SET last_action = ?, updated_at = ?, last_updated_by = ? WHERE id = ?").bind(now, now, data.authorEmail || null, ticketId).run();
  const ticket = await getTicketSnapshot(ticketId, env);
  if (ticket) {
    await pushTicketNotification(ticket, env);
    await injectTicketIntoCache(ticket, env);
  }
  return { id: result.meta?.last_row_id || result.lastInsertRowid };
}
__name(addComment, "addComment");

async function getTicketByNumber(ticketNumber, env) {
  return await env.DB.prepare("SELECT * FROM tickets WHERE ticket_number = ?").bind(ticketNumber).first();
}
__name(getTicketByNumber, "getTicketByNumber");

async function getTickets(filters, env, user) {
  let query = `SELECT id, id AS ticket_id, ticket_number, category, language, status, priority,
        sender_name, sender_email, sender_phone, order_number, subject, created_at, updated_at,
        last_action, sla_response_due, sla_resolution_due, assigned_to, last_updated_by
        FROM tickets WHERE 1=1`;
  const params = [];
  if (user && user.role !== "admin") {
    if (!user.allowed_languages || user.allowed_languages.length === 0) return [];
    if (!user.allowed_categories || user.allowed_categories.length === 0) return [];
    const langPlaceholders = user.allowed_languages.map(() => "?").join(",");
    query += ` AND language IN (${langPlaceholders})`;
    params.push(...user.allowed_languages);
    const catPlaceholders = user.allowed_categories.map(() => "?").join(",");
    query += ` AND category IN (${catPlaceholders})`;
    params.push(...user.allowed_categories);
  }
  if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
    const placeholders = filters.statuses.map(() => "?").join(",");
    query += ` AND status IN (${placeholders})`;
    params.push(...filters.statuses);
  } else if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters.category) {
    query += " AND category = ?";
    params.push(filters.category);
  }
  if (filters.language) {
    query += " AND language = ?";
    params.push(filters.language);
  }
  if (filters.assigned_to) {
    query += " AND assigned_to = ?";
    params.push(filters.assigned_to);
  }
  if (filters.search) {
    const term = "%" + filters.search + "%";
    query += " AND (ticket_number LIKE ? OR sender_email LIKE ? OR sender_name LIKE ? OR subject LIKE ?)";
    params.push(term, term, term, term);
  }
  const sortMap = {
    "sla": `CASE WHEN status IN ('resolved','closed') THEN 3
                     WHEN sla_resolution_due IS NOT NULL AND datetime(sla_resolution_due) < datetime('now') THEN 0
                     WHEN sla_response_due IS NOT NULL AND datetime(sla_response_due) < datetime('now') THEN 1
                     ELSE 2 END ASC, last_action DESC`,
    "last_updated": "last_action DESC",
    "created": "created_at DESC"
  };
  const sort = filters.sort || "last_updated";
  query += ` ORDER BY ${sortMap[sort] || "last_action DESC"}`;
  const limit = filters.limit || 100;
  query += " LIMIT ?";
  params.push(limit);
  if (filters.offset) {
    query += " OFFSET ?";
    params.push(filters.offset);
  }
  const r = await env.DB.prepare(query).bind(...params).all();
  const rows = r.results || [];
  const graceMap = await getAllSlaGrace(env);
  for (const row of rows) row.sla_status = computeSlaStatus(row, graceMap);
  return rows;
}
__name(getTickets, "getTickets");

async function getTotalTicketCount(filters, env, user) {
  let query = "SELECT COUNT(*) as total FROM tickets WHERE 1=1";
  const params = [];
  if (user && user.role !== "admin") {
    if (!user.allowed_languages || user.allowed_languages.length === 0) return 0;
    if (!user.allowed_categories || user.allowed_categories.length === 0) return 0;
    const langPlaceholders = user.allowed_languages.map(() => "?").join(",");
    query += ` AND language IN (${langPlaceholders})`;
    params.push(...user.allowed_languages);
    const catPlaceholders = user.allowed_categories.map(() => "?").join(",");
    query += ` AND category IN (${catPlaceholders})`;
    params.push(...user.allowed_categories);
  }
  if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
    const placeholders = filters.statuses.map(() => "?").join(",");
    query += ` AND status IN (${placeholders})`;
    params.push(...filters.statuses);
  } else if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters.category) {
    query += " AND category = ?";
    params.push(filters.category);
  }
  if (filters.language) {
    query += " AND language = ?";
    params.push(filters.language);
  }
  if (filters.assigned_to) {
    query += " AND assigned_to = ?";
    params.push(filters.assigned_to);
  }
  if (filters.search) {
    const term = "%" + filters.search + "%";
    query += " AND (ticket_number LIKE ? OR sender_email LIKE ? OR sender_name LIKE ? OR subject LIKE ?)";
    params.push(term, term, term, term);
  }
  const r = await env.DB.prepare(query).bind(...params).first();
  return r ? r.total : 0;
}
__name(getTotalTicketCount, "getTotalTicketCount");

async function getStats(env, user) {
  let query = "SELECT status, COUNT(*) as count FROM tickets WHERE 1=1";
  const params = [];
  if (user && user.role !== "admin") {
    if (!user.allowed_languages || user.allowed_languages.length === 0) {
      return { new: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 };
    }
    if (!user.allowed_categories || user.allowed_categories.length === 0) {
      return { new: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 };
    }
    const langPlaceholders = user.allowed_languages.map(() => "?").join(",");
    query += ` AND language IN (${langPlaceholders})`;
    params.push(...user.allowed_languages);
    const catPlaceholders = user.allowed_categories.map(() => "?").join(",");
    query += ` AND category IN (${catPlaceholders})`;
    params.push(...user.allowed_categories);
  }
  query += " GROUP BY status";
  const r = params.length > 0 ? await env.DB.prepare(query).bind(...params).all() : await env.DB.prepare(query).all();
  const stats = { new: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 };
  for (const row of r.results || []) if (stats.hasOwnProperty(row.status)) stats[row.status] = row.count;
  return stats;
}
__name(getStats, "getStats");

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
            SELECT status, category, date(created_at) as day, COUNT(*) as count
            FROM tickets WHERE created_at >= datetime('now', '-30 days')
            GROUP BY status, category, date(created_at)
        `).all();
    const rows = combinedRes.results || [];
    const dailyMap = {};
    const categoryMap = {};
    for (const row of rows) {
      if (result.status.hasOwnProperty(row.status)) result.status[row.status] += row.count;
      const dayKey = row.day;
      if (!dailyMap[dayKey]) dailyMap[dayKey] = 0;
      dailyMap[dayKey] += row.count;
      if (!categoryMap[row.category]) categoryMap[row.category] = 0;
      categoryMap[row.category] += row.count;
    }
    result.daily = Object.entries(dailyMap).map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day));
    result.categories = categoryMap;
  } catch (e) {
  }
  try {
    const senderRes = await env.DB.prepare(`
            SELECT sender_email, COUNT(*) as count FROM tickets
            WHERE sender_email != '' GROUP BY sender_email ORDER BY count DESC LIMIT 10
        `).all();
    result.top_senders = senderRes.results || [];
  } catch (e) {
  }
  try {
    const slaQuery = `
            SELECT 
                COUNT(CASE WHEN status IN ('resolved','closed') OR datetime(sla_resolution_due) > datetime('now') THEN 1 END) as on_track,
                COUNT(CASE WHEN status NOT IN ('resolved','closed') AND datetime(sla_response_due) < datetime('now') AND datetime(sla_resolution_due) > datetime('now') THEN 1 END) as at_risk,
                COUNT(CASE WHEN status NOT IN ('resolved','closed') AND datetime(sla_resolution_due) < datetime('now') THEN 1 END) as breached
            FROM tickets
        `;
    const slaResult = await env.DB.prepare(slaQuery).first();
    result.sla = { on_track: slaResult.on_track || 0, at_risk: slaResult.at_risk || 0, breached: slaResult.breached || 0 };
  } catch (e) {
    result.sla = { on_track: 0, at_risk: 0, breached: 0 };
  }
  return result;
}
__name(getReports, "getReports");

function formatEmailBody(text) {
  if (!text) return "";
  const blockTagRegex = /<(?:p|div|h[1-6]|ul|ol|blockquote)[\s>]/i;
  if (blockTagRegex.test(text)) return text;
  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r\n|\r|\n/g, "</p><p>");
  html = "<p>" + html + "</p>";
  html = html.replace(/<p>\s*<\/p>/g, "");
  return html;
}
__name(formatEmailBody, "formatEmailBody");

async function sendEmail(env, to, subject, body, from) {
  if (!env.SCRIPT_URL) return { success: false, error: "SCRIPT_URL missing" };
  if (!from || from === "") return { success: false, error: "From address is required" };
  const emailConfig = await getEmailConfig(env);
  if (!emailConfig) return { success: false, error: "Email configuration missing" };
  try {
    let htmlBody = body || "";
    const footerKey = "footer_" + (from || "").replace(/[^a-z0-9]/gi, "_");
    let footer = await getSetting(env, "email", footerKey);
    if (footer === null) footer = await getSetting(env, "email", "footer_html");
    if (footer) htmlBody += "\n\n" + footer;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${htmlBody}</body></html>`;
    const safeSubject = subject ? subject.replace(/[<>]/g, "") : "";
    const params = { secret: emailConfig.secret, username: emailConfig.username, password: emailConfig.password, to, subject: safeSubject, message: fullHtml, from };
    const formBody = Object.keys(params).map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k])).join("&");
    const res = await fetch(env.SCRIPT_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formBody });
    const data = await res.json();
    return data.status === "success" ? { success: true } : { success: false, error: data.message || "Apps Script error" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
__name(sendEmail, "sendEmail");

async function sendTicketConfirmation(ticket, env, emailOverride) {
  const email = emailOverride || ticket.sender_email;
  if (!email) return { success: false, error: "No email" };
  const cat = await validateCategory(ticket.category, env);
  const lang = await validateLanguage(ticket.language, env);
  const ar = await getAutoReply(env, cat, lang);
  if (!ar || !ar.enabled) return { success: true, skipped: true };
  let subject = ar.subject, body = ar.body;
  const replacements = { "{{ticket_id}}": ticket.ticket_number, "{{sender_name}}": ticket.sender_name || "", "{{sender_email}}": ticket.sender_email || "", "{{category}}": cat, "{{subject}}": ticket.subject || "" };
  for (const [tag, val] of Object.entries(replacements)) {
    subject = subject.replaceAll(tag, val);
    body = body.replaceAll(tag, val);
  }
  const formattedBody = formatEmailBody(body);
  let from = ar.from || await getDefaultFrom(env);
  return await sendEmail(env, email, subject, formattedBody, from);
}
__name(sendTicketConfirmation, "sendTicketConfirmation");

async function sendNewsletterConfirmation(env, email, token, language) {
  const lang = await validateLanguage(language, env);
  const ar = await getAutoReply(env, "newsletter", lang);
  if (!ar || !ar.enabled) return { success: true, skipped: true };
  let subject = ar.subject, body = ar.body;
  const unsubscribeLink = await buildUnsubscribeLink(env, token, lang);
  const replacements = { "{{subscriber_email}}": email, "{{unsubscribe_link}}": unsubscribeLink };
  for (const [tag, val] of Object.entries(replacements)) {
    subject = subject.replaceAll(tag, val);
    body = body.replaceAll(tag, val);
  }
  const formattedBody = formatEmailBody(body);
  let from = ar.from || await getDefaultFrom(env);
  return await sendEmail(env, email, subject, formattedBody, from);
}
__name(sendNewsletterConfirmation, "sendNewsletterConfirmation");

function decodeRFC2047(text) {
  if (!text) return text;
  return text.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (match, charset, encoding, data) => {
    try {
      if (encoding.toUpperCase() === "B") {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder(charset || "utf-8").decode(bytes);
      } else {
        const decoded = data.replace(/=([0-9A-F]{2})/gi, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
        return new TextDecoder(charset || "utf-8").decode(new TextEncoder().encode(decoded));
      }
    } catch {
      return match;
    }
  });
}
__name(decodeRFC2047, "decodeRFC2047");

function decodeQuotedPrintable(str) {
  str = str.replace(/=\r\n/g, "").replace(/=\n/g, "");
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(str.substr(i + 1, 2))) {
      bytes.push(parseInt(str.substr(i + 1, 2), 16));
      i += 2;
    } else {
      bytes.push(str.charCodeAt(i));
    }
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}
__name(decodeQuotedPrintable, "decodeQuotedPrintable");

function decodeBase64Body(str) {
  try {
    const clean = str.replace(/[^A-Za-z0-9+/=]/g, "");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return str;
  }
}
__name(decodeBase64Body, "decodeBase64Body");

function looksLikeBase64(str) {
  const clean = str.replace(/\s+/g, "");
  return clean.length > 20 && clean.length % 4 === 0 && /^[A-Za-z0-9+/]+=*$/.test(clean);
}
__name(looksLikeBase64, "looksLikeBase64");

function decodePartBody(headerBlock, rawBody) {
  const encMatch = (headerBlock || "").match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
  const encoding = encMatch ? encMatch[1].trim().toLowerCase() : "";
  if (encoding === "base64") return decodeBase64Body(rawBody);
  if (encoding === "quoted-printable") return decodeQuotedPrintable(rawBody);
  if (!encoding && looksLikeBase64(rawBody)) return decodeBase64Body(rawBody);
  return rawBody;
}
__name(decodePartBody, "decodePartBody");

function cleanupBody(text) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
__name(cleanupBody, "cleanupBody");

function htmlToPlainText(html) {
  if (!html) return "";
  let text = html;
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = cleanupBody(text);
  return text;
}
__name(htmlToPlainText, "htmlToPlainText");

async function parseEmail(rawStream) {
  try {
    const rawText = await new Response(rawStream).text();
    let subject = "No subject", from = "unknown@example.com", body = "";
    
    const sMatch = rawText.match(/^Subject:\s*([^\r\n]+)/im);
    if (sMatch) subject = decodeRFC2047(sMatch[1].trim());
    
    const fMatch = rawText.match(/^From:\s*([^\r\n]+)/im);
    if (fMatch) {
      from = fMatch[1].trim();
      const emailMatch = from.match(/<([^>]+)>/);
      if (emailMatch) from = emailMatch[1];
    }
    
    const boundaryMatch = rawText.match(/boundary="?([^"\r\n;]+)"?/i);
    const boundary = boundaryMatch ? boundaryMatch[1] : null;
    
    let plainTextBody = "";
    let htmlBody = "";
    
    if (boundary) {
      const parts = rawText.split(`--${boundary}`);
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part || part.includes("--")) continue;
        
        if (!plainTextBody && part.includes("Content-Type: text/plain")) {
          const blankLineIdx = part.indexOf("\r\n\r\n");
          if (blankLineIdx !== -1) {
            let content = part.substring(blankLineIdx + 4);
            let decoded = decodePartBody(part, content);
            decoded = cleanupBody(decoded);
            if (decoded.length > 5) plainTextBody = decoded;
          }
        }
        
        if (!plainTextBody && !htmlBody && part.includes("Content-Type: text/html")) {
          const blankLineIdx = part.indexOf("\r\n\r\n");
          if (blankLineIdx !== -1) {
            let content = part.substring(blankLineIdx + 4);
            let decoded = decodePartBody(part, content);
            if (decoded.length > 5) htmlBody = decoded;
          }
        }
      }
    } else {
      const blankLineIdx = rawText.indexOf("\r\n\r\n");
      if (blankLineIdx !== -1) {
        body = rawText.substring(blankLineIdx + 4).trim();
      }
    }
    
    if (plainTextBody) {
      body = plainTextBody;
    } else if (htmlBody) {
      body = htmlToPlainText(htmlBody);
    } else if (!body) {
      body = "";
    }
    
    if (body && body.length > 15e3) body = body.substring(0, 15e3);
    
    return { from, subject, body };
  } catch (e) {
    console.error("Email parsing error:", e);
    return { from: "unknown@example.com", subject: "No subject", body: "" };
  }
}
__name(parseEmail, "parseEmail");

async function deleteCategoryData(env, cat) {
  if (!cat || !/^[a-z0-9\-_]+$/.test(cat)) throw new Error("Invalid category slug");
  const exactKeys = [
    { category: "category", key: cat + "_description" },
    { category: "category", key: cat + "_color" },
    { category: "sla", key: cat + "_response" },
    { category: "sla", key: cat + "_resolution" },
    { category: "auto_reply", key: cat + "_enabled" },
    { category: "auto_reply", key: cat + "_subject" },
    { category: "auto_reply", key: cat + "_body" },
    { category: "auto_reply", key: cat + "_from" }
  ];
  for (const item of exactKeys) {
    await env.DB.prepare("DELETE FROM settings WHERE category = ? AND key = ?").bind(item.category, item.key).run();
  }
  const result = await env.DB.prepare("SELECT key FROM settings WHERE category = 'auto_reply'").all();
  for (const row of result.results || []) {
    if (row.key.startsWith(cat + "_")) {
      await env.DB.prepare("DELETE FROM settings WHERE category = ? AND key = ?").bind("auto_reply", row.key).run();
    }
  }
  cache.categories = null;
  cache.autoReplies = null;
}
__name(deleteCategoryData, "deleteCategoryData");

// ─── CORS CONFIGURATION ───────────────────────────────────────────
async function getAllowedOrigins(env) {
  try {
    const origins = await getSetting(env, "system", "cors_origins");
    if (origins) {
      return origins.split(',').map(o => o.trim()).filter(Boolean);
    }
  } catch (e) {
    console.error("Failed to load CORS origins:", e.message);
  }
  // Fallback defaults
  return [
    "https://dornori.com",
    "https://www.dornori.com",
    "https://dornori.github.io",
    "https://dornori-ticketing.dornori-info.workers.dev"
  ];
}
__name(getAllowedOrigins, "getAllowedOrigins");

function getCorsHeaders(origin, allowedOrigins) {
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
__name(getCorsHeaders, "getCorsHeaders");

// ─── WORKER HANDLER ────────────────────────────────────────────
var worker_default = {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = await getAllowedOrigins(env);
    const corsHeaders = getCorsHeaders(origin, allowedOrigins);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    const json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }), "json");
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    try {
      // ─── WEBSOCKET ──────────────────────────────────────────
      if (path === "/api/admin/ws") {
        const token = url.searchParams.get("token");
        const email = await verifyToken(token, env);
        if (!email) return new Response("Unauthorized", { status: 401 });
        if (!await checkAccess(email, "tickets", "view", env)) {
          return new Response("Permission denied", { status: 403 });
        }
        if (!env.TICKET_HUB) return new Response("TICKET_HUB binding missing", { status: 500 });
        const user = await getUser(email, env);
        const id = env.TICKET_HUB.idFromName("global");
        const stub = env.TICKET_HUB.get(id);
        const hubUrl = new URL("https://ticket-hub/connect");
        hubUrl.searchParams.set("role", user.role);
        hubUrl.searchParams.set("allowed_languages", JSON.stringify(user.allowed_languages || []));
        hubUrl.searchParams.set("allowed_categories", JSON.stringify(user.allowed_categories || []));
        hubUrl.searchParams.set("email", user.email || email);
        hubUrl.searchParams.set("name", user.name || user.email || email);
        const hubRequest = new Request(hubUrl.toString(), request);
        return stub.fetch(hubRequest);
      }

      // ─── GET USER'S LOCKED TICKETS ─────────────────────────────
      if (path === "/api/admin/user-locks" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        
        if (!env.TICKET_HUB) return json({ lockedTickets: [] });
        
        const hubId = env.TICKET_HUB.idFromName("global");
        const stub = env.TICKET_HUB.get(hubId);
        const res = await stub.fetch("https://ticket-hub/user-locks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        return json(data);
      }

      // ─── TICKET LOCKING ────────────────────────────────────
      if (path.startsWith("/api/admin/ticket/") && path.includes("/lock") && method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const userEmail = await verifyToken(token, env);
        if (!userEmail) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(userEmail, "tickets", "view", env)) return json({ error: "Permission denied" }, 403);
        if (!env.TICKET_HUB) return json({ success: true });
        const id = parseInt(path.split("/")[4]);
        const user = await getUser(userEmail, env);
        const hubId = env.TICKET_HUB.idFromName("global");
        const stub = env.TICKET_HUB.get(hubId);
        const res = await stub.fetch("https://ticket-hub/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            ticketId: id, 
            email: userEmail, 
            name: user?.name || userEmail,
            force: user?.role === "admin"
          })
        });
        return json(await res.json());
      }

      // ─── RELEASE LOCK (was /unlock - renamed to avoid adblockers) ──
      if (path.startsWith("/api/admin/ticket/") && path.includes("/release") && method === "POST") {
        let token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        if (!token) {
          try {
            const beaconBody = await request.clone().json();
            token = beaconBody.token || "";
          } catch (e) {}
        }
        const userEmail = await verifyToken(token, env);
        if (!userEmail) {
          const id = parseInt(path.split("/")[4]);
          const hubId = env.TICKET_HUB.idFromName("global");
          const stub = env.TICKET_HUB.get(hubId);
          const lockCheck = await stub.fetch("https://ticket-hub/check-lock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticketId: id })
          });
          const lockData = await lockCheck.json();
          if (lockData && lockData.email) {
            const res = await stub.fetch("https://ticket-hub/release", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ticketId: id, email: lockData.email, force: true })
            });
            return json(await res.json());
          }
          return json({ error: "Unauthorized" }, 401);
        }
        if (!env.TICKET_HUB) return json({ success: true });
        const id = parseInt(path.split("/")[4]);
        const requester = await getUser(userEmail, env);
        const force = requester?.role === "admin";
        const hubId = env.TICKET_HUB.idFromName("global");
        const stub = env.TICKET_HUB.get(hubId);
        const res = await stub.fetch("https://ticket-hub/release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId: id, email: userEmail, force })
        });
        return json(await res.json());
      }

      // ─── TEST PUSH ─────────────────────────────────────────
      if (path === "/api/admin/test-push" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        await pushTicketNotification({
          ticket_number: "TKT-TEST-001",
          category: "support",
          language: "en",
          sla_status: "on_track",
          status: "new",
          subject: "Test Ticket - Hub Working!",
          sender_name: "Test User",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }, env, "created");
        return json({ success: true, message: "Test ticket sent via TICKET_HUB" });
      }

      // ─── REPORTS ───────────────────────────────────────────
      if (path === "/api/admin/reports" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "reports", "view", env)) return json({ error: "Permission denied" }, 403);
        return json({ success: true, data: await getReports(env) });
      }

      // ─── STATS ─────────────────────────────────────────────
      if (path === "/api/admin/stats" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "tickets", "view", env)) return json({ error: "Permission denied" }, 403);
        const user = await getUser(email, env);
        return json({ success: true, stats: await getStats(env, user) });
      }

      // ─── AUTO-REPLY ───────────────────────────────────────
      if (path === "/api/admin/auto-reply" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "view", env)) return json({ error: "Permission denied" }, 403);
        return json({ success: true, data: await getAllAutoReplies(env) });
      }

      if (path === "/api/admin/auto-reply" && method === "PUT") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);
        const { category, language, enabled, subject, body, from } = await request.json();
        if (!category || !language) return json({ error: "Category and language required" }, 400);
        try {
          await saveAutoReply(env, category, language, enabled, subject, body, from);
          await bumpConfigVersion(env);
          return json({ success: true });
        } catch (e) {
          return json({ error: e.message }, 400);
        }
      }

      if (path === "/api/admin/auto-reply" && method === "DELETE") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "delete", env)) return json({ error: "Permission denied" }, 403);
        const { category, language } = await request.json();
        if (!category || !language) return json({ error: "Category and language required" }, 400);
        try {
          await deleteAutoReply(env, category, language);
          await bumpConfigVersion(env);
          return json({ success: true });
        } catch (e) {
          return json({ error: e.message }, 400);
        }
      }

      // ─── EMAIL ADDRESSES ──────────────────────────────────
      if (path === "/api/admin/email-addresses" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "view", env)) return json({ error: "Permission denied" }, 403);
        const activeOnly = url.searchParams.get("active_only") === "true";
        return json({ success: true, addresses: await getEmailAddresses(env, activeOnly) });
      }

      if (path === "/api/admin/email-addresses" && method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "create", env)) return json({ error: "Permission denied" }, 403);
        const { email: newEmail, label, action, language } = await request.json();
        if (!newEmail || !label || !language) return json({ error: "Email, label and language required" }, 400);
        try {
          await addEmailAddress(env, newEmail, label, await validateCategory(action || label, env), language);
          await bumpConfigVersion(env);
          return json({ success: true });
        } catch (e) {
          return json({ error: e.message }, 400);
        }
      }

      if (path.match(/^\/api\/admin\/email-addresses\/\d+$/) && method === "PUT") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);
        const id = parseInt(path.split("/")[4]);
        const body = await request.json();
        try {
          await updateEmailAddress(env, id, body.email, body.label, await validateCategory(body.action || body.label, env), body.language, body.is_active);
          await bumpConfigVersion(env);
          return json({ success: true });
        } catch (e) {
          return json({ error: e.message }, 400);
        }
      }

      if (path.match(/^\/api\/admin\/email-addresses\/\d+$/) && method === "DELETE") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "delete", env)) return json({ error: "Permission denied" }, 403);
        await deleteEmailAddress(env, parseInt(path.split("/")[4]));
        await bumpConfigVersion(env);
        return json({ success: true });
      }

      // ─── SETTINGS ──────────────────────────────────────────
      if (path === "/api/admin/settings" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "view", env)) return json({ error: "Permission denied" }, 403);
        const settingsArray = await getAllSettings(env);
        const grouped = {};
        for (const s of settingsArray) {
          if (!grouped[s.category]) grouped[s.category] = {};
          grouped[s.category][s.key] = s.value;
        }
        return json({ success: true, data: grouped, settings: settingsArray });
      }

      if (path === "/api/admin/settings" && method === "PUT") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);
        const { settings } = await request.json();
        for (const s of settings) await updateSetting(env, s.category, s.key, s.value);
        await bumpConfigVersion(env);
        return json({ success: true });
      }

      // ─── NEWSLETTERS ──────────────────────────────────────
      if (path === "/api/admin/newsletters" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "newsletter", "view", env)) return json({ error: "Permission denied" }, 403);
        return json({ success: true, data: await getNewsletters(env) });
      }

      if (path === "/api/admin/newsletters" && method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "newsletter", "create", env)) return json({ error: "Permission denied" }, 403);
        const { subject, body, language, status } = await request.json();
        if (!subject || !body || !language) return json({ error: "Subject, body and language required" }, 400);
        try {
          if (status === "draft") {
            const n = await createNewsletter(env, subject, body, language, "draft");
            return json({ success: true, newsletter: n, sent: 0 });
          }
          const result = await sendNewsletter(env, subject, body, language);
          return json({ success: true, newsletter: result.newsletter, sent: result.sent });
        } catch (e) {
          return json({ error: e.message }, 400);
        }
      }

      if (path.match(/^\/api\/admin\/newsletters\/\d+$/) && method === "DELETE") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "newsletter", "delete", env)) return json({ error: "Permission denied" }, 403);
        await deleteNewsletter(parseInt(path.split("/")[4]), env);
        return json({ success: true });
      }

      // ─── SUBSCRIBERS ──────────────────────────────────────
      if (path === "/api/admin/subscribers" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "newsletter", "view", env)) return json({ error: "Permission denied" }, 403);
        return json({ success: true, data: await getSubscribers(env) });
      }

      if (path.match(/^\/api\/admin\/subscribers\/\d+$/) && method === "DELETE") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "newsletter", "delete", env)) return json({ error: "Permission denied" }, 403);
        await deleteSubscriber(parseInt(path.split("/")[4]), env);
        return json({ success: true });
      }

      // ─── PUBLIC SUBSCRIBE ────────────────────────────────
      if (path === "/api/subscribe" && method === "POST") {
        const { email, name, language } = await request.json();
        if (!email) return json({ error: "Email required" }, 400);
        try {
          let lang;
          try {
            lang = await validateLanguage(language, env);
          } catch (e) {
            lang = await getDefaultLanguage(env);
          }
          const { subscriber, token } = await addSubscriber(email, name || "", lang, env);
          const ticket = await createTicket({ category: "newsletter", senderName: name || "", senderEmail: email, subject: "Newsletter Subscription", message: "Subscribed via website", language: lang, metadata: { subscriberId: subscriber.id } }, env);
          await sendNewsletterConfirmation(env, email, token, lang);
          return json({ success: true, subscriberId: subscriber.id, ticketNumber: ticket.ticket_number });
        } catch (e) {
          return json({ error: e.message }, 400);
        }
      }

      if (path.startsWith("/api/unsubscribe/") && method === "GET") {
        const token = path.replace("/api/unsubscribe/", "");
        const result = await unsubscribe(token, env);
        return new Response(result.success ? "✅ Unsubscribed successfully" : "❌ Invalid or expired token", { status: result.success ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      if (path === "/api/unsubscribe-email" && method === "POST") {
        const { email } = await request.json();
        const result = await unsubscribeByEmail(email, env);
        return json(result, result.success ? 200 : 400);
      }

      // ─── PUBLIC MESSAGE ──────────────────────────────────
      if (path === "/api/message" && method === "POST") {
        const data = await request.json();
        try {
          const orderNumber = extractOrderNumber(data.subject || "") || extractOrderNumber(data.message || "");
          
          if (orderNumber) {
            const existingTicket = await getTicketByOrderNumber(orderNumber, env);
            if (existingTicket) {
              const commentContent = `Subject: ${data.subject || "No subject"}\n\nMessage: ${data.message || ""}\n\nFrom: ${data.name || "Unknown"} (${data.email || "No email"})`;
              await addComment(existingTicket.id, { 
                type: "incoming", 
                authorEmail: data.email || "unknown@example.com", 
                content: commentContent
              }, env);
              
              if (["resolved", "closed"].includes(existingTicket.status)) {
                await updateTicket(existingTicket.id, { status: "open" }, env);
              }
              
              return json({ 
                success: true, 
                message: "Message attached to existing ticket",
                ticketNumber: existingTicket.ticket_number, 
                ticketId: existingTicket.id,
                orderNumber: orderNumber
              });
            }
          }
          
          const category = await validateCategory(data.category || "support", env);
          const language = await validateLanguage(data.language, env);
          const ticket = await createTicket({ 
            category, 
            senderName: data.name || "", 
            senderEmail: data.email || "", 
            senderPhone: data.phone || "", 
            subject: data.subject || "Website Inquiry", 
            message: data.message || "", 
            language, 
            orderNumber: data.orderNumber || orderNumber, 
            metadata: { source: "website", company: data.company || "", ...(data.metadata || {}) } 
          }, env);
          if (data.email) await sendTicketConfirmation(ticket, env);
          return json({ success: true, ticketNumber: ticket.ticket_number, ticketId: ticket.id });
        } catch (e) {
          return json({ error: e.message }, 400);
        }
      }

      // ─── USER PROFILE ──────────────────────────────────────
      if (path === "/api/admin/me" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        const user = await getUser(email, env);
        return json({ success: true, user: { email: user.email, name: user.name, role: user.role, allowed_languages: user.allowed_languages, allowed_emails: user.allowed_emails, allowed_categories: user.allowed_categories, team_id: user.team_id, page_permissions: user.page_permissions || {}, effective_permissions: buildEffectivePermissions(user) } });
      }

      if (path === "/api/admin/user-profile" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        const user = await getUser(email, env);
        return json({ success: true, user: { email: user.email, name: user.name, role: user.role, allowed_languages: user.allowed_languages, allowed_emails: user.allowed_emails, allowed_categories: user.allowed_categories, team_id: user.team_id, page_permissions: user.page_permissions || {}, effective_permissions: buildEffectivePermissions(user) } });
      }

// ─── LOGIN ─────────────────────────────────────────────
      if (path === "/api/admin/login" && method === "POST") {
        const { email, password } = await request.json();
        const rateLimitKey = (email || "").toLowerCase().trim();
        if (await isLoginRateLimited(rateLimitKey, env)) return json({ error: "Too many login attempts. Try again later." }, 429);
        const user = await getUser(rateLimitKey, env);
        if (!user || await sha256(password) !== user.password_hash) {
          await recordFailedLogin(rateLimitKey, env);
          return json({ error: "Invalid credentials" }, 401);
        }
        await clearFailedLogins(rateLimitKey, env);
        
        const token = await generateToken(user.email, env);
        const online = await getAgentsOnlineCount(env);
        if (online === 0) {
          const allTickets = await getTickets({ limit: 50, statuses: ["new", "open", "in_progress", "pending"] }, env, { role: "admin" });
          await setTicketCache(allTickets);
        }
        await setAgentsOnlineCount(env, online + 1);
        return json({ success: true, token, user: { email: user.email, name: user.name, role: user.role, allowed_languages: user.allowed_languages, allowed_emails: user.allowed_emails, allowed_categories: user.allowed_categories, team_id: user.team_id, page_permissions: user.page_permissions || {}, effective_permissions: buildEffectivePermissions(user) } });
      }

      // ─── LOGOUT ────────────────────────────────────────────
      if (path === "/api/admin/logout" && method === "POST") {
        return json({ success: true });
      }

      // ─── CACHE PURGE (manual) ───────────────────────────────
      if (path === "/api/admin/cache/purge" && method === "POST") {
        const token2 = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const purgeEmail = await verifyToken(token2, env);
        if (!purgeEmail) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(purgeEmail, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);
        await purgeTicketCache();
        clearCache();
        await bumpConfigVersion(env);
        await setAgentsOnlineCount(env, 0);
        return json({ success: true });
      }

      // ─── USERS MANAGEMENT ──────────────────────────────────
      if (path === "/api/admin/users" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "users", "view", env)) return json({ error: "Permission denied" }, 403);
        const users = await env.DB.prepare("SELECT email, name, role, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions FROM users ORDER BY email").all();
        return json({ success: true, users: (users.results || []).map((u) => ({ email: u.email, name: u.name, role: u.role, allowed_languages: JSON.parse(u.allowed_languages || "[]"), allowed_emails: JSON.parse(u.allowed_emails || "[]"), allowed_categories: JSON.parse(u.allowed_categories || "[]"), team_id: u.team_id, page_permissions: (() => { try { return JSON.parse(u.page_permissions || "{}"); } catch (e) { return {}; } })() })) });
      }

      if (path === "/api/admin/users" && method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "users", "create", env)) return json({ error: "Permission denied" }, 403);
        const caller = await getUser(email, env);
        const { email: newEmail, name, password, role, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions } = await request.json();
        if (!newEmail || !name || !password || !role) return json({ error: "Missing required fields" }, 400);
        if (!VALID_ROLES.includes(role)) return json({ error: "Invalid role" }, 400);
        if (role === "admin" && caller.role !== "admin") return json({ error: "Only admins can create admin accounts" }, 403);

        const { validLangs, validCategories, validEmails } = await getValidationSets(env);
        for (const l of (allowed_languages || [])) {
          if (!validLangs.includes(l)) return json({ error: `Invalid language: ${l}` }, 400);
        }
        for (const c of (allowed_categories || [])) {
          if (!validCategories.includes(c)) return json({ error: `Invalid category: ${c}` }, 400);
        }
        for (const e of (allowed_emails || [])) {
          if (!validEmails.includes((e || "").toLowerCase())) return json({ error: `Invalid email address: ${e}` }, 400);
        }
        let finalPerms = page_permissions || {};
        if (role !== "admin" && caller.role !== "admin") finalPerms = {};

        try {
          const passwordHash = await sha256(password);
          await env.DB.prepare("INSERT INTO users (email, name, role, password_hash, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(newEmail.toLowerCase().trim(), name, role, passwordHash, JSON.stringify(allowed_languages || []), JSON.stringify(allowed_emails || []), JSON.stringify(allowed_categories || []), team_id || null, JSON.stringify(finalPerms)).run();
          clearCache();
          return json({ success: true });
        } catch (e) {
          return json({ error: e.message.includes("UNIQUE") ? "Email already exists" : e.message }, 400);
        }
      }

      if (path.startsWith("/api/admin/users/") && method === "PUT") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "users", "edit", env)) return json({ error: "Permission denied" }, 403);
        const caller = await getUser(email, env);
        const userEmail = decodeURIComponent(path.split("/")[4]);
        const target = await getUser(userEmail, env);
        if (!target) return json({ error: "User not found" }, 404);
        if (userEmail.toLowerCase() === "admin@dornori.com" && caller.role !== "admin") return json({ error: "Permission denied" }, 403);
        if (caller.role === "manager" && target.role === "admin") return json({ error: "Permission denied" }, 403);
        if (caller.role === "tl" && !(caller.team_id && target.team_id === caller.team_id && target.role === "agent")) return json({ error: "Permission denied" }, 403);

        const body = await request.json();
        const name = body.name !== undefined ? body.name : target.name;
        const role = body.role !== undefined ? body.role : target.role;
        const allowed_languages = body.allowed_languages !== undefined ? body.allowed_languages : target.allowed_languages;
        const allowed_emails = body.allowed_emails !== undefined ? body.allowed_emails : target.allowed_emails;
        const allowed_categories = body.allowed_categories !== undefined ? body.allowed_categories : target.allowed_categories;
        const team_id = body.team_id !== undefined ? body.team_id : target.team_id;
        const page_permissions = body.page_permissions !== undefined ? body.page_permissions : target.page_permissions;

        if (role && !VALID_ROLES.includes(role)) return json({ error: "Invalid role" }, 400);
        if (role === "admin" && caller.role !== "admin") return json({ error: "Only admins can grant admin role" }, 403);

        const { validLangs, validCategories, validEmails } = await getValidationSets(env);
        for (const l of (allowed_languages || [])) {
          if (!validLangs.includes(l)) return json({ error: `Invalid language: ${l}` }, 400);
        }
        for (const c of (allowed_categories || [])) {
          if (!validCategories.includes(c)) return json({ error: `Invalid category: ${c}` }, 400);
        }
        for (const e of (allowed_emails || [])) {
          if (!validEmails.includes((e || "").toLowerCase())) return json({ error: `Invalid email address: ${e}` }, 400);
        }
        let finalPerms = page_permissions;
        if (role !== "admin" && caller.role !== "admin") finalPerms = target.page_permissions;

        await env.DB.prepare("UPDATE users SET name = ?, role = ?, allowed_languages = ?, allowed_emails = ?, allowed_categories = ?, team_id = ?, page_permissions = ? WHERE email = ?").bind(name, role, JSON.stringify(allowed_languages || []), JSON.stringify(allowed_emails || []), JSON.stringify(allowed_categories || []), team_id || null, JSON.stringify(finalPerms || {}), userEmail).run();
        clearCache();
        return json({ success: true });
      }

      if (path.startsWith("/api/admin/users/") && method === "DELETE") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "users", "delete", env)) return json({ error: "Permission denied" }, 403);
        const caller = await getUser(email, env);
        const targetEmail = decodeURIComponent(path.split("/")[4]);
        if (targetEmail.toLowerCase() === "admin@dornori.com") return json({ error: "This account cannot be deleted" }, 403);
        if (targetEmail.toLowerCase() === email.toLowerCase()) return json({ error: "You cannot delete your own account" }, 403);
        if (caller.role !== "admin") return json({ error: "Permission denied" }, 403);
        await env.DB.prepare("DELETE FROM users WHERE email = ?").bind(targetEmail).run();
        clearCache();
        return json({ success: true });
      }

      // ─── TICKETS ───────────────────────────────────────────
      if (path === "/api/admin/tickets" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "tickets", "view", env)) return json({ error: "Permission denied" }, 403);
        const user = await getUser(email, env);
        const ACTIVE_STATUSES = ["new", "open", "in_progress", "pending"];
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);
        const search = (url.searchParams.get("search") || "").trim();
        const offset = (page - 1) * limit;
        const filters = { category: url.searchParams.get("category"), language: url.searchParams.get("language"), sort: url.searchParams.get("sort") || "last_updated", limit, offset, assigned_to: url.searchParams.get("assigned_to") };
        if (search) filters.search = search;
        const statuses = url.searchParams.get("statuses");
        if (statuses) filters.statuses = statuses.split(",").map((s) => s.trim());
        else filters.status = url.searchParams.get("status");
        const statusesOk = filters.statuses ? filters.statuses.every((s) => ACTIVE_STATUSES.includes(s)) : !filters.status || ACTIVE_STATUSES.includes(filters.status);
        const useCache = !search && page === 1 && statusesOk && !filters.category && !filters.language && !filters.assigned_to;
        let tickets, total;
        if (useCache) {
          let snap = await getTicketCache();
          if (!snap) {
            snap = await getTickets({ limit: 50, statuses: ACTIVE_STATUSES }, env, { role: "admin" });
            await setTicketCache(snap);
            const online = await getAgentsOnlineCount(env);
            if (online === 0) await setAgentsOnlineCount(env, 1);
          }
          const filtered = await applyTicketFilters(snap, filters, user, env);
          total = filtered.length;
          tickets = filtered.slice(0, limit);
        } else {
          tickets = await getTickets(filters, env, user);
          total = await getTotalTicketCount(filters, env, user);
        }
        const totalPages = Math.max(1, Math.ceil(total / limit));
        return json({ success: true, tickets, pagination: { page, limit, total, totalPages } });
      }

      if (path.startsWith("/api/admin/ticket/") && !path.includes("/status") && !path.includes("/comment") && !path.includes("/reply") && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "tickets", "view", env)) return json({ error: "Permission denied" }, 403);
        const ticket = await getTicket(parseInt(path.split("/")[4]), env);
        return ticket ? json({ success: true, data: ticket }) : json({ error: "Not found" }, 404);
      }

      if (path.startsWith("/api/admin/ticket/") && path.includes("/assign") && method === "PUT") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const userEmail = await verifyToken(token, env);
        if (!userEmail) return json({ error: "Unauthorized" }, 401);
        const requester = await getUser(userEmail, env);
        const id = parseInt(path.split("/")[4]);
        const { assigned_to } = await request.json();
        const existingTicket = await getTicket(id, env);
        const oldAssignee = existingTicket ? existingTicket.assigned_to : null;
        // Any agent may self-assign an unassigned ticket by opening it;
        // reassigning to someone else still requires tl/manager/admin.
        const isSelfAssign = assigned_to === userEmail && !oldAssignee;
        const isPrivileged = requester && ["tl", "manager", "admin"].includes(requester.role);
        if (!requester || !(isPrivileged || isSelfAssign)) return json({ error: "Permission denied" }, 403);
        if (!await checkAccess(userEmail, "tickets", "update", env)) return json({ error: "Permission denied" }, 403);
        let newTicket = await updateTicket(id, { assigned_to }, env);
        if (assigned_to !== oldAssignee) {
          await addComment(id, { type: "assignment", authorEmail: userEmail, content: assigned_to ? `Assigned to ${assigned_to}` : "Unassigned" }, env);
          newTicket = await getTicket(id, env);
          if (newTicket) {
            await injectTicketIntoCache(newTicket, env);
            await pushTicketNotification({ ...newTicket, assigned_to }, env, "updated");
          }
        }
        return json({ success: true, data: newTicket });
      }

      if (path.startsWith("/api/admin/ticket/") && path.includes("/status") && method === "PUT") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const userEmail = await verifyToken(token, env);
        if (!userEmail) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(userEmail, "tickets", "update", env)) return json({ error: "Permission denied" }, 403);
        const id = parseInt(path.split("/")[4]);
        const { status } = await request.json();
        const existingTicket = await getTicket(id, env);
        const oldStatus = existingTicket ? existingTicket.status : null;
        let newTicket = await updateTicket(id, { status }, env);
        if (status && oldStatus && oldStatus !== status) {
          await addComment(id, { type: "status_change", authorEmail: userEmail, content: "", oldStatus, newStatus: status }, env);
          newTicket = await getTicket(id, env);
          if (newTicket) await injectTicketIntoCache(newTicket, env);
        }
        return json({ success: true, data: newTicket });
      }

      if (path.startsWith("/api/admin/ticket/") && path.includes("/comment") && method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const userEmail = await verifyToken(token, env);
        if (!userEmail) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(userEmail, "tickets", "comment", env)) return json({ error: "Permission denied" }, 403);
        const ticketId = parseInt(path.split("/")[4]);
        const { content, type } = await request.json();
        const comment = await addComment(ticketId, { type: type || "internal", authorEmail: userEmail, content }, env);
        const ticket = await getTicket(ticketId, env);
        if (ticket) await injectTicketIntoCache(ticket, env);
        return json({ success: true, data: comment });
      }

      if (path.startsWith("/api/admin/ticket/") && path.includes("/reply") && method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const userEmail = await verifyToken(token, env);
        if (!userEmail) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(userEmail, "tickets", "reply", env)) return json({ error: "Permission denied" }, 403);
        const id = parseInt(path.split("/")[4]);
        const { from, body } = await request.json();
        const ticket = await getTicket(id, env);
        if (!ticket) return json({ error: "Not found" }, 404);
        const result = await sendEmail(env, ticket.sender_email, `Re: [${ticket.ticket_number}] ${ticket.subject}`, body, from);
        if (result.success) {
          await addComment(id, { type: "public", authorEmail: userEmail, content: "\u0001" + from + "\u0001" + body }, env);
          const updated = await getTicket(id, env);
          if (updated) await injectTicketIntoCache(updated, env);
          return json({ success: true });
        }
        return json({ success: false, error: result.error }, 500);
      }

      // ─── DELETE CATEGORY ──────────────────────────────────
      if (path.startsWith("/api/admin/category/") && method === "DELETE") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "delete", env)) return json({ error: "Permission denied" }, 403);
        const cat = decodeURIComponent(path.split("/")[4]);
        if (!cat || cat === "unclassified") return json({ error: "Cannot delete unclassified category" }, 400);
        await deleteCategoryData(env, cat);
        await bumpConfigVersion(env);
        return json({ success: true });
      }

      if (path === "/api/admin/config-version") {
        const row = await env.DB.prepare("SELECT value FROM settings WHERE category='system' AND key='config_version'").first();
        return json({ version: row ? row.value : "0" });
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error("Error:", err);
      return json({ error: err.message || "Internal server error" }, 500);
    }
  },

  // ─── EMAIL HANDLER ──────────────────────────────────────────
  async email(message, env) {
    try {
      const { from, subject, body } = await parseEmail(message.raw);
      
      const ticketRegex = /TKT-\d{4,}-\d{3,}/g;
      let ticketNumber = null;
      if (subject) {
        const m = subject.match(ticketRegex);
        if (m) ticketNumber = m[0];
      }
      if (!ticketNumber && body) {
        const m = body.match(ticketRegex);
        if (m) ticketNumber = m[0];
      }
      
      if (ticketNumber) {
        const ticket2 = await getTicketByNumber(ticketNumber, env);
        if (ticket2) {
          await addComment(ticket2.id, { type: "incoming", authorEmail: from, content: body || "(No content)" }, env);
          if (["resolved", "closed"].includes(ticket2.status)) {
            const updated = await updateTicket(ticket2.id, { status: "open" }, env);
            if (updated) await injectTicketIntoCache(updated, env);
          }
          return;
        }
      }
      
      const orderNumber = extractOrderNumber(subject || "") || extractOrderNumber(body || "");
      
      if (orderNumber) {
        const orderTicket = await getTicketByOrderNumber(orderNumber, env);
        if (orderTicket) {
          await addComment(orderTicket.id, { 
            type: "incoming", 
            authorEmail: from, 
            content: body || "(No content)" 
          }, env);
          
          if (["resolved", "closed"].includes(orderTicket.status)) {
            const updated = await updateTicket(orderTicket.id, { status: "open" }, env);
            if (updated) await injectTicketIntoCache(updated, env);
          }
          return;
        }
      }
      
      const config = await getEmailAddressConfig(env, message.to);
      const ticket = await createTicket({ 
        category: config.category, 
        senderName: from.split("@")[0] || "Unknown", 
        senderEmail: from, 
        subject: subject || "No subject", 
        message: body || "(No content)", 
        language: config.language, 
        orderNumber, 
        metadata: { source: "email", to: message.to } 
      }, env);
      if (from) await sendTicketConfirmation(ticket, env);
    } catch (err) {
      console.log("❌ Email error:", err.message);
    }
  }
};

// ─── TICKET HUB ───────────────────────────────────────────────
var TicketHub = class {
  static {
    __name(this, "TicketHub");
  }
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.locks = /* @__PURE__ */ new Map();
    this.userLocks = /* @__PURE__ */ new Map();
    this.loginAttempts = /* @__PURE__ */ new Map();
  }

  locksSnapshot() {
    const out = {};
    for (const [ticketId, lock] of this.locks.entries()) {
      out[ticketId] = { email: lock.email, name: lock.name };
    }
    return out;
  }

  getUserLockedTickets(email) {
    const tickets = [];
    for (const [ticketId, lock] of this.locks.entries()) {
      if (lock.email === email) {
        tickets.push(ticketId);
      }
    }
    return tickets;
  }

  releaseAllUserLocks(email) {
    if (!email) return [];
    const released = [];
    for (const [ticketId, lock] of this.locks.entries()) {
      if (lock.email === email) {
        this.locks.delete(ticketId);
        released.push(ticketId);
      }
    }
    this.userLocks.delete(email);
    return released;
  }

  broadcastAll(notification) {
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(notification);
      } catch (e) {
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/broadcast") {
      const notification = await request.text();
      let ticket = {};
      try {
        ticket = JSON.parse(notification).ticket || {};
      } catch (e) {
      }
      for (const ws of this.state.getWebSockets()) {
        let meta = {};
        try {
          meta = ws.deserializeAttachment() || {};
        } catch (e) {
        }
        if (meta.role === "admin") {
          try {
            ws.send(notification);
          } catch (e) {
          }
          continue;
        }
        const allowedLanguages = meta.allowed_languages || [];
        const allowedCategories = meta.allowed_categories || [];
        const langOk = !ticket.language || allowedLanguages.includes(ticket.language);
        const catOk = !ticket.category || allowedCategories.includes(ticket.category);
        if (langOk && catOk) {
          try {
            ws.send(notification);
          } catch (e) {
          }
        }
      }
      return new Response("ok");
    }

    // ─── LOGIN RATE LIMIT: CHECK ───────────────────────────────────
    if (request.method === "POST" && url.pathname === "/rl-check") {
      const RL_MAX = 5;
      const RL_WINDOW_MS = 5 * 60 * 1000;
      let body = {};
      try {
        body = await request.json();
      } catch (e) {}
      const key = body.key || "";
      const entry = this.loginAttempts.get(key);
      if (!entry || Date.now() - entry.first > RL_WINDOW_MS) {
        if (entry) this.loginAttempts.delete(key);
        return new Response(JSON.stringify({ limited: false }));
      }
      const limited = entry.count >= RL_MAX;
      const retryAfterMs = limited ? Math.max(0, entry.first + RL_WINDOW_MS - Date.now()) : 0;
      return new Response(JSON.stringify({ limited, retryAfterMs }));
    }

    // ─── LOGIN RATE LIMIT: RECORD FAILURE ──────────────────────────
    if (request.method === "POST" && url.pathname === "/rl-fail") {
      const RL_WINDOW_MS = 5 * 60 * 1000;
      let body = {};
      try {
        body = await request.json();
      } catch (e) {}
      const key = body.key || "";
      const entry = this.loginAttempts.get(key);
      if (!entry || Date.now() - entry.first > RL_WINDOW_MS) {
        this.loginAttempts.set(key, { count: 1, first: Date.now() });
      } else {
        entry.count += 1;
      }
      return new Response(JSON.stringify({ success: true }));
    }

    // ─── LOGIN RATE LIMIT: CLEAR ────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/rl-clear") {
      let body = {};
      try {
        body = await request.json();
      } catch (e) {}
      const key = body.key || "";
      this.loginAttempts.delete(key);
      return new Response(JSON.stringify({ success: true }));
    }

    // ─── GET USER LOCKS ──────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/user-locks") {
      let body = {};
      try {
        body = await request.json();
      } catch (e) {}
      
      const email = body.email;
      const lockedTickets = this.getUserLockedTickets(email);
      return new Response(JSON.stringify({ lockedTickets }));
    }

    // ─── CHECK LOCK (was /lock-check - renamed to avoid adblockers) ──
    if (request.method === "POST" && url.pathname === "/check-lock") {
      let body = {};
      try {
        body = await request.json();
      } catch (e) {}
      const ticketId = body.ticketId;
      const existing = this.locks.get(ticketId);
      if (existing) {
        return new Response(JSON.stringify({ email: existing.email, name: existing.name }));
      }
      return new Response(JSON.stringify({ email: null }));
    }

    // ─── LOCK ─────────────────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/lock") {
      const LOCK_STALE_MS = 45000;
      let body = {};
      try {
        body = await request.json();
      } catch (e) {
      }
      const ticketId = body.ticketId;
      const email = body.email;
      const name = body.name || email;
      const force = !!body.force;
      
      if (!ticketId || !email) return new Response(JSON.stringify({ success: false, error: "Missing ticketId or email" }), { status: 400 });
      
      const existing = this.locks.get(ticketId);
      
      if (existing && existing.email !== email && Date.now() - existing.ts < LOCK_STALE_MS) {
        return new Response(JSON.stringify({ 
          success: false, 
          locked_by: { email: existing.email, name: existing.name } 
        }));
      }
      
      const userTickets = this.getUserLockedTickets(email);
      
      if (userTickets.length > 0 && !userTickets.includes(ticketId) && !force) {
        const released = this.releaseAllUserLocks(email);
        for (const tid of released) {
          this.broadcastAll(JSON.stringify({ type: "ticket_unlocked", ticket_id: tid }));
        }
        this.broadcastAll(JSON.stringify({ type: "lock_sync", locks: this.locksSnapshot() }));
        console.log(`🔓 Released ${released.length} locks for ${email} to lock ticket ${ticketId}`);
      }
      
      this.locks.set(ticketId, { email, name, ts: Date.now() });
      if (!this.userLocks.has(email)) {
        this.userLocks.set(email, new Set());
      }
      this.userLocks.get(email).add(ticketId);
      
      this.broadcastAll(JSON.stringify({ type: "ticket_locked", ticket_id: ticketId, locked_by: { email, name } }));
      this.broadcastAll(JSON.stringify({ type: "lock_sync", locks: this.locksSnapshot() }));
      
      const nextAlarm = await this.state.storage.getAlarm();
      if (!nextAlarm || nextAlarm > Date.now() + LOCK_STALE_MS) {
        await this.state.storage.setAlarm(Date.now() + LOCK_STALE_MS);
      }
      return new Response(JSON.stringify({ success: true }));
    }

    // ─── RELEASE (was /unlock - renamed to avoid adblockers) ──
    if (request.method === "POST" && url.pathname === "/release") {
      let body = {};
      try {
        body = await request.json();
      } catch (e) {}
      
      const ticketId = body.ticketId;
      const email = body.email;
      const force = !!body.force;
      
      const existing = this.locks.get(ticketId);
      if (existing && (force || !email || existing.email === email)) {
        this.locks.delete(ticketId);
        if (email && this.userLocks.has(email)) {
          this.userLocks.get(email).delete(ticketId);
          if (this.userLocks.get(email).size === 0) {
            this.userLocks.delete(email);
          }
        }
        this.broadcastAll(JSON.stringify({ type: "ticket_unlocked", ticket_id: ticketId }));
        this.broadcastAll(JSON.stringify({ type: "lock_sync", locks: this.locksSnapshot() }));
        console.log(`🔓 Released ticket ${ticketId} (force: ${force})`);
      }
      return new Response(JSON.stringify({ success: true }));
    }

    if (url.pathname === "/connect" && request.headers.get("Upgrade") === "websocket") {
      const role = url.searchParams.get("role") || "agent";
      const email = url.searchParams.get("email") || "";
      const name = url.searchParams.get("name") || email;
      let allowed_languages = [];
      let allowed_categories = [];
      try {
        allowed_languages = JSON.parse(url.searchParams.get("allowed_languages") || "[]");
      } catch (e) {
      }
      try {
        allowed_categories = JSON.parse(url.searchParams.get("allowed_categories") || "[]");
      } catch (e) {
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.state.acceptWebSocket(server);
      server.serializeAttachment({ role, allowed_languages, allowed_categories, email, name, lastPing: Date.now() });
      const existingAlarm = await this.state.storage.getAlarm();
      if (!existingAlarm) await this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
      try {
        server.send(JSON.stringify({ type: "lock_sync", locks: this.locksSnapshot() }));
      } catch (e) {
      }
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        try {
          const meta = ws.deserializeAttachment() || {};
          meta.lastPing = Date.now();
          ws.serializeAttachment(meta);
        } catch (e) {
        }
      }
    } catch (e) {
    }
  }

  async alarm() {
    const IDLE_MS = 20 * 60 * 1000;
    const LOCK_STALE_MS = 30000;
    const RL_WINDOW_MS = 5 * 60 * 1000;
    const now = Date.now();
    let expiredAny = false;

    for (const [key, entry] of this.loginAttempts.entries()) {
      if (now - entry.first > RL_WINDOW_MS) {
        this.loginAttempts.delete(key);
      }
    }
    
    for (const [ticketId, lock] of this.locks.entries()) {
      if (now - lock.ts > LOCK_STALE_MS) {
        this.locks.delete(ticketId);
        if (lock.email && this.userLocks.has(lock.email)) {
          this.userLocks.get(lock.email).delete(ticketId);
          if (this.userLocks.get(lock.email).size === 0) {
            this.userLocks.delete(lock.email);
          }
        }
        this.broadcastAll(JSON.stringify({ type: "ticket_unlocked", ticket_id: ticketId }));
        expiredAny = true;
      }
    }
    if (expiredAny) {
      this.broadcastAll(JSON.stringify({ type: "lock_sync", locks: this.locksSnapshot() }));
    }
    
    for (const ws of this.state.getWebSockets()) {
      let meta = {};
      try {
        meta = ws.deserializeAttachment() || {};
      } catch (e) {
      }
      if (now - (meta.lastPing || 0) > IDLE_MS) {
        try {
          ws.close(4000, "idle timeout");
        } catch (e) {
        }
      }
    }
    
    if (this.locks.size > 0) {
      await this.state.storage.setAlarm(Date.now() + LOCK_STALE_MS);
    } else if (this.state.getWebSockets().length > 0) {
      await this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
    }
  }

  releaseLocksFor(email) {
    if (!email) return [];
    const released = this.releaseAllUserLocks(email);
    for (const ticketId of released) {
      this.broadcastAll(JSON.stringify({ type: "ticket_unlocked", ticket_id: ticketId }));
    }
    if (released.length > 0) {
      this.broadcastAll(JSON.stringify({ type: "lock_sync", locks: this.locksSnapshot() }));
    }
    return released;
  }

  async webSocketClose(ws, code, reason, wasClean) {
    try {
      let meta = {};
      try {
        meta = ws.deserializeAttachment() || {};
      } catch (e) {
      }
      
      const released = this.releaseLocksFor(meta.email);
      if (released.length > 0) {
        console.log(`🧹 Released ${released.length} locks for ${meta.email} on disconnect`);
      }
      
      const now = Date.now();
      let staleFound = false;
      for (const [ticketId, lock] of this.locks.entries()) {
        if (now - lock.ts > 15000) {
          this.locks.delete(ticketId);
          if (lock.email && this.userLocks.has(lock.email)) {
            this.userLocks.get(lock.email).delete(ticketId);
            if (this.userLocks.get(lock.email).size === 0) {
              this.userLocks.delete(lock.email);
            }
          }
          this.broadcastAll(JSON.stringify({ type: "ticket_unlocked", ticket_id: ticketId }));
          staleFound = true;
          console.log(`🧹 Force-cleaned stale lock for ticket ${ticketId}`);
        }
      }
      
      if (staleFound || released.length > 0) {
        this.broadcastAll(JSON.stringify({ type: "lock_sync", locks: this.locksSnapshot() }));
      }
      
      if (this.env.DB) {
        const row = await this.env.DB.prepare("SELECT count FROM agents_online WHERE id = 1").first();
        const next = Math.max(0, (row ? row.count : 0) - 1);
        await this.env.DB.prepare("INSERT INTO agents_online (id, count) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET count = ?").bind(next, next).run();
      }
    } catch (e) {
      console.error("WebSocket close error:", e);
    }
    try {
      ws.close(code, reason);
    } catch (e) {
    }
  }

  async webSocketError(ws, error) {
    try {
      ws.close(1011, "error");
    } catch (e) {
    }
  }
};

export {
  TicketHub,
  worker_default as default
};