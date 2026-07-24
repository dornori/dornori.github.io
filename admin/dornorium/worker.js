// @ts-nocheck

var cache = {
  settings: new Map(),
  users: new Map(),
  categories: null,
  languages: null,
  autoReplies: null,
  settingsTimestamp: 0,
  usersTimestamp: 0
};

var TICKET_CACHE_URL = null;
var TOKEN_EXPIRY_SECONDS = null;
var LOCK_STALE_WRITE_MS = null;
var LOCK_STALE_READ_MS = null;
var LOCK_CLEANUP_THRESHOLD_MS = null;
var LOGIN_MAX_ATTEMPTS = null;
var LOGIN_WINDOW_MS = null;
var CORS_ALLOWED_ORIGINS = null;
var CORS_ENABLED = null;
var RATE_LIMIT_ENABLED = null;
var PASSWORD_MIN_LENGTH = null;
var PASSWORD_RESET_EXPIRY_MINUTES = null;
var COMMON_PASSWORDS = null;
var NEWSLETTER_BATCH_SIZE = null;
var TICKET_SEQUENCE_MAX = null;
var EMAIL_BODY_MAX_LENGTH = null;
var ACTIVE_STATUSES = null;
var REPLY_DELIMITER = null;
var DOMAIN = null;
var APP_BASEDIR = null;
var PRODUCTS_DATA_BASE_URL = null;
var PRODUCTS_IMAGES_BASE_URL = null;
var SCRIPT_URL = null;
var EMAIL_SCRIPT_USERNAME = null;
var EMAIL_SCRIPT_SECRET = null;
var EMAIL_SCRIPT_PASSWORD = null;
var configLoaded = false;
var dbInitialized = false;

// Database initialization SQL
const SEED_SQL = `PRAGMA foreign_keys = OFF; CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(category, key)); CREATE TABLE IF NOT EXISTS agents_online (id INTEGER PRIMARY KEY CHECK (id = 1), count INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS teams (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL, manager_id VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS email_addresses (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, label TEXT NOT NULL, action TEXT NOT NULL, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, signature TEXT, language TEXT); CREATE TABLE IF NOT EXISTS push_subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT UNIQUE NOT NULL, keys TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT DEFAULT 'agent', password_hash TEXT NOT NULL, permissions TEXT DEFAULT '["read","write"]', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, allowed_emails TEXT DEFAULT '[]', updated_at TEXT, allowed_languages TEXT DEFAULT '["en"]', team_id VARCHAR(50), page_permissions TEXT DEFAULT '{}', allowed_categories TEXT DEFAULT '[]', active INTEGER DEFAULT 1); CREATE TABLE IF NOT EXISTS newsletter_subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'active', subscribed_at TEXT, unsubscribed_at TEXT, language TEXT DEFAULT 'en'); CREATE TABLE IF NOT EXISTS newsletters (id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', sent_at TEXT, recipient_count INTEGER DEFAULT 0, created_at TEXT NOT NULL, language TEXT DEFAULT 'en'); CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))); CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_number TEXT UNIQUE NOT NULL, external_ref TEXT, category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', priority TEXT DEFAULT 'medium', sender_name TEXT, sender_email TEXT NOT NULL, subject TEXT, message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, sla_response_due DATETIME, sla_resolution_due DATETIME, assigned_to TEXT, metadata TEXT, last_action DATETIME, language TEXT DEFAULT 'unknown', sender_phone TEXT, order_number TEXT, last_updated_by TEXT); CREATE TABLE IF NOT EXISTS ticket_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, comment_type TEXT NOT NULL, author_email TEXT, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, new_status TEXT, old_status TEXT, FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE); CREATE TABLE IF NOT EXISTS ticket_summary (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER UNIQUE NOT NULL, ticket_number TEXT NOT NULL, status TEXT NOT NULL, category TEXT NOT NULL, language TEXT NOT NULL, subject TEXT NOT NULL, sender_email TEXT NOT NULL, created_at DATETIME NOT NULL, last_action DATETIME NOT NULL, sla_status TEXT NOT NULL DEFAULT 'on_track', priority TEXT NOT NULL DEFAULT 'medium', FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE); CREATE TABLE IF NOT EXISTS unsubscribe_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, subscriber_id INTEGER NOT NULL UNIQUE REFERENCES newsletter_subscribers(id), token TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('system','ticket_cache_key','ticket-list'),('system','jwt_expiry_seconds','86400'),('system','lock_timeout_write_ms','45000'),('system','lock_timeout_read_ms','30000'),('system','lock_cleanup_interval_ms','15000'),('system','login_max_attempts','5'),('system','login_ratelimit_window_ms','300000'),('system','cors_allowed_origins',''),('system','cors_enabled','1'),('system','rate_limit_enabled','1'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('security','password_min_length','12'),('security','password_reset_expiry_minutes','15'),('security','password_blocklist','password,123456,12345678,qwerty,abc123,password123,admin,letmein,welcome,monkey,dragon,master,hello,fuckyou,superman,123456789,12345,1234567890,qwertyuiop,qwerty123,1q2w3e4r,password1,123321,111111,000000,abcdef,abcd1234,iloveyou,trustno1,sunshine,princess,shadow,ashley,bailey,passw0rd,admin123,root,toor'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('tickets','newsletter_batch_size','10'),('tickets','ticket_sequence_max','999999'),('tickets','email_body_max_length','15000'),('tickets','ticket_active_statuses','new,open,in_progress,pending'),('tickets','reply_delimiter','\u0001'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('general','domain',''),('general','app_basedir',''),('general','script_url',''),('general','products_data_base_url',''),('general','products_images_base_url',''),('general','default_language','en'),('general','config_version','1'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('email','default_from',''),('email','password_reset_from',''); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('cloudflare','account_id',''),('cloudflare','api_token',''); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('languages','list','[{\"code\":\"en\",\"name\":\"English\"}]'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('category','business_description','Business'),('category','general_description','General'),('category','info_description','Info'),('category','legal_description','Legal'),('category','newsletter_description','Newsletter'),('category','no_reply_description','No-Reply'),('category','other_description','Other'),('category','press_description','Press'),('category','privacy_description','Privacy'),('category','support_description','Support'),('category','unclassified_description','Unclassified'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('category','business_color','#3b82f6'),('category','general_color','#6b7280'),('category','info_color','#06b6d4'),('category','legal_color','#8b5cf6'),('category','newsletter_color','#ec4899'),('category','no_reply_color','#64748b'),('category','other_color','#9ca3af'),('category','press_color','#6366f1'),('category','privacy_color','#a78bfa'),('category','support_color','#f97316'),('category','unclassified_color','#8892b0'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('sla','business_response','24'),('sla','business_resolution','72'),('sla','business_resolved_grace','0'),('sla','business_closed_grace','0'),('sla','general_response','24'),('sla','general_resolution','72'),('sla','general_resolved_grace','0'),('sla','general_closed_grace','0'),('sla','info_response','24'),('sla','info_resolution','72'),('sla','info_resolved_grace','0'),('sla','info_closed_grace','0'),('sla','legal_response','24'),('sla','legal_resolution','72'),('sla','legal_resolved_grace','0'),('sla','legal_closed_grace','0'),('sla','newsletter_response','24'),('sla','newsletter_resolution','72'),('sla','newsletter_resolved_grace','0'),('sla','newsletter_closed_grace','0'),('sla','no_reply_response','24'),('sla','no_reply_resolution','72'),('sla','no_reply_resolved_grace','0'),('sla','no_reply_closed_grace','0'),('sla','other_response','24'),('sla','other_resolution','72'),('sla','other_resolved_grace','0'),('sla','other_closed_grace','0'),('sla','press_response','24'),('sla','press_resolution','72'),('sla','press_resolved_grace','0'),('sla','press_closed_grace','0'),('sla','privacy_response','24'),('sla','privacy_resolution','72'),('sla','privacy_resolved_grace','0'),('sla','privacy_closed_grace','0'),('sla','support_response','24'),('sla','support_resolution','72'),('sla','support_resolved_grace','0'),('sla','support_closed_grace','0'),('sla','unclassified_response','24'),('sla','unclassified_resolution','72'),('sla','unclassified_resolved_grace','0'),('sla','unclassified_closed_grace','0'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('auto_reply','business_enabled','0'),('auto_reply','business_subject','[Ticket {{ticket_id}}] Your business inquiry'),('auto_reply','business_body','<p>Thank you for your business inquiry. We will respond shortly.</p>'),('auto_reply','general_enabled','0'),('auto_reply','general_subject','[Ticket {{ticket_id}}] Your general inquiry'),('auto_reply','general_body','<p>Thank you for your general inquiry. We will respond shortly.</p>'),('auto_reply','info_enabled','0'),('auto_reply','info_subject','[Ticket {{ticket_id}}] Your info inquiry'),('auto_reply','info_body','<p>Thank you for your information request. We will respond shortly.</p>'),('auto_reply','legal_enabled','0'),('auto_reply','legal_subject','[Ticket {{ticket_id}}] Your legal inquiry'),('auto_reply','legal_body','<p>Thank you for your legal inquiry. We will respond shortly.</p>'),('auto_reply','newsletter_enabled','0'),('auto_reply','newsletter_subject','[Ticket {{ticket_id}}] Your newsletter inquiry'),('auto_reply','newsletter_body','<p>Thank you for your newsletter inquiry. We will respond shortly.</p>'),('auto_reply','no_reply_enabled','0'),('auto_reply','no_reply_subject','[Ticket {{ticket_id}}] Your no-reply inquiry'),('auto_reply','no_reply_body','<p>Thank you for your inquiry. We will respond shortly.</p>'),('auto_reply','other_enabled','0'),('auto_reply','other_subject','[Ticket {{ticket_id}}] Your other inquiry'),('auto_reply','other_body','<p>Thank you for your inquiry. We will respond shortly.</p>'),('auto_reply','press_enabled','0'),('auto_reply','press_subject','[Ticket {{ticket_id}}] Your press inquiry'),('auto_reply','press_body','<p>Thank you for your press inquiry. We will respond shortly.</p>'),('auto_reply','privacy_enabled','0'),('auto_reply','privacy_subject','[Ticket {{ticket_id}}] Your privacy inquiry'),('auto_reply','privacy_body','<p>Thank you for your privacy inquiry. We will respond shortly.</p>'),('auto_reply','support_enabled','0'),('auto_reply','support_subject','[Ticket {{ticket_id}}] Your support inquiry'),('auto_reply','support_body','<p>Thank you for your support inquiry. We will respond shortly.</p>'),('auto_reply','unclassified_enabled','0'),('auto_reply','unclassified_subject','[Ticket {{ticket_id}}] Your unclassified inquiry'),('auto_reply','unclassified_body','<p>Thank you for your inquiry. We will respond shortly.</p>'); INSERT OR IGNORE INTO agents_online (id, count) VALUES (1, 0); PRAGMA foreign_keys = ON;`;

async function initializeDatabase(env) {
  if (dbInitialized || !env.DB) return;
  
  try {
    await env.DB.exec(SEED_SQL);
    dbInitialized = true;
    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    dbInitialized = true;
  }
}

async function loadConfig(env) {
  if (configLoaded) return;

  TICKET_CACHE_URL = "https://cache/" + ((await getSetting(env, "system", "ticket_cache_key")) || "ticket-list");
  TOKEN_EXPIRY_SECONDS = parseInt((await getSetting(env, "system", "jwt_expiry_seconds")) || "86400", 10);
  LOCK_STALE_WRITE_MS = parseInt((await getSetting(env, "system", "lock_timeout_write_ms")) || "45000", 10);
  LOCK_STALE_READ_MS = parseInt((await getSetting(env, "system", "lock_timeout_read_ms")) || "30000", 10);
  LOCK_CLEANUP_THRESHOLD_MS = parseInt((await getSetting(env, "system", "lock_cleanup_interval_ms")) || "15000", 10);
  LOGIN_MAX_ATTEMPTS = parseInt((await getSetting(env, "system", "login_max_attempts")) || "5", 10);
  LOGIN_WINDOW_MS = parseInt((await getSetting(env, "system", "login_ratelimit_window_ms")) || "300000", 10);

  const corsRaw = await getSetting(env, "system", "cors_allowed_origins");
  CORS_ALLOWED_ORIGINS = corsRaw
    ? corsRaw.split(",").map((o) => o.trim()).filter(Boolean)
    : ["https://dornori.com", "https://www.dornori.com", "https://dornori.github.io", "https://dornori-ticketing.dornori-info.workers.dev"];
  CORS_ENABLED = (await getSetting(env, "system", "cors_enabled")) === "1";
  RATE_LIMIT_ENABLED = (await getSetting(env, "system", "rate_limit_enabled")) !== "0";

  PASSWORD_MIN_LENGTH = parseInt((await getSetting(env, "security", "password_min_length")) || "12", 10);
  PASSWORD_RESET_EXPIRY_MINUTES = parseInt((await getSetting(env, "security", "password_reset_expiry_minutes")) || "15", 10);

  const blocklistRaw = await getSetting(env, "security", "password_blocklist");
  COMMON_PASSWORDS = blocklistRaw
    ? blocklistRaw.split(",").map((p) => p.trim()).filter(Boolean)
    : ['password', '123456', '12345678', 'qwerty', 'abc123',
       'password123', 'admin', 'letmein', 'welcome', 'monkey',
       'dragon', 'master', 'hello', 'fuckyou', 'superman',
       '123456789', '12345', '1234567890', 'qwertyuiop',
       'qwerty123', '1q2w3e4r', 'password1', '123321',
       '111111', '000000', 'abcdef', 'abcd1234', 'iloveyou',
       'trustno1', 'sunshine', 'princess', 'shadow', 'ashley',
       'bailey', 'passw0rd', 'admin123', 'root', 'toor'];

  NEWSLETTER_BATCH_SIZE = parseInt((await getSetting(env, "tickets", "newsletter_batch_size")) || "10", 10);
  TICKET_SEQUENCE_MAX = parseInt((await getSetting(env, "tickets", "ticket_sequence_max")) || "999999", 10);
  EMAIL_BODY_MAX_LENGTH = parseInt((await getSetting(env, "tickets", "email_body_max_length")) || "15000", 10);

  const statusesRaw = await getSetting(env, "tickets", "ticket_active_statuses");
  ACTIVE_STATUSES = statusesRaw
    ? statusesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : ["new", "open", "in_progress", "pending"];

  REPLY_DELIMITER = (await getSetting(env, "tickets", "reply_delimiter")) || "\u0001";

  DOMAIN = (await getSetting(env, "general", "domain")) || "";
  APP_BASEDIR = (await getSetting(env, "general", "app_basedir")) || "";
  PRODUCTS_DATA_BASE_URL = (await getSetting(env, "general", "products_data_base_url")) || "";
  PRODUCTS_IMAGES_BASE_URL = (await getSetting(env, "general", "products_images_base_url")) || "";
  SCRIPT_URL = (await getSetting(env, "general", "script_url")) || env.SCRIPT_URL || "";

  EMAIL_SCRIPT_USERNAME = await getSetting(env, "email_script", "username") || "";
  const encSecret = await getSetting(env, "email_script", "secret");
  EMAIL_SCRIPT_SECRET = encSecret ? await decrypt(encSecret, env) : "";
  const encPassword = await getSetting(env, "email_script", "password");
  EMAIL_SCRIPT_PASSWORD = encPassword ? await decrypt(encPassword, env) : "";

  configLoaded = true;
}

async function encrypt(plaintext, env) {
  const keyStr = (env.ENCRYPTION_KEY || "").trim();
  if (!keyStr) throw new Error("ENCRYPTION_KEY not configured");
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyStr).slice(0, 32);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  const ivB64 = btoa(String.fromCharCode(...iv));
  const dataB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  return `${ivB64}:${dataB64}`;
}

async function decrypt(encryptedData, env) {
  if (!encryptedData || !encryptedData.includes(":")) return encryptedData;
 const keyStr = (env.ENCRYPTION_KEY || "").trim();
  if (!keyStr) throw new Error("ENCRYPTION_KEY not configured");
  const [ivB64, dataB64] = encryptedData.split(":");
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyStr).slice(0, 32);
  const iv = new Uint8Array(atob(ivB64).split("").map((c) => c.charCodeAt(0)));
  const ciphertext = new Uint8Array(atob(dataB64).split("").map((c) => c.charCodeAt(0)));
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

function validatePasswordStrength(password) {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { valid: false, errors };
  }
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&* etc.)');
  }
  
  if (COMMON_PASSWORDS.some(common => common.toLowerCase() === password.toLowerCase())) {
    errors.push('This password is too common. Please choose a more unique password.');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

async function callCloudflareAPI(method, endpoint, body, env) {
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN not configured in Worker environment variables");

  const url = endpoint.startsWith("http") ? endpoint : `https://api.cloudflare.com/client/v4${endpoint}`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  const options = { method, headers };
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    const text = await res.text();
    throw new Error(`Cloudflare API returned non-JSON (${res.status}): ${text.substring(0, 200)}`);
  }

  if (!res.ok || !data.success) {
    const errors = data.errors?.map(e => `${e.message} (code: ${e.code})`).join(", ") || `HTTP ${res.status}`;
    throw new Error(errors);
  }
  return data;
}


async function validateAndHashPassword(password, env) {
  const result = validatePasswordStrength(password);
  if (!result.valid) {
    throw new Error(result.errors[0]);
  }
  return await sha256(password);
}

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

async function setTicketCache(tickets) {
  try {
    const res = new Response(JSON.stringify({ tickets }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=86400" }
    });
    await caches.default.put(TICKET_CACHE_URL, res);
  } catch (e) {
  }
}

async function purgeTicketCache() {
  try {
    await caches.default.delete(TICKET_CACHE_URL);
  } catch (e) {
  }
}

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

function clearCache() {
  cache.settings.clear();
  cache.users.clear();
  cache.categories = null;
  cache.languages = null;
  cache.autoReplies = null;
  configLoaded = false;
}

async function bumpConfigVersion(env) {
  const version = Date.now().toString();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO settings (category, key, value, updated_at) VALUES ('system', 'config_version', ?, datetime('now'))`
  ).bind(version).run();
  clearCache();
  return version;
}

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
    exp: Math.floor(Date.now() / 1e3) + TOKEN_EXPIRY_SECONDS,
    iat: Math.floor(Date.now() / 1e3)
  };
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signatureInput = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

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

async function sha256(m) {
  const b = new TextEncoder().encode(m);
  const h = await crypto.subtle.digest("SHA-256", b);
  return [...new Uint8Array(h)].map(b2 => b2.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password) {
  return await sha256(password);
}

async function verifyPassword(password, storedHash) {
  return await sha256(password) === storedHash;
}

const ROLE_RESOURCES = {
  admin: {
    tickets: ['read', 'write'],
    users: ['read', 'write'],
    settings: ['read', 'write'],
    newsletter: ['read', 'write'],
    reports: ['read', 'write'],
    order_reply: ['read', 'write']
  },
  manager: {
    tickets: ['read', 'write'],
    users: ['read'],
    settings: ['read'],
    newsletter: ['read', 'write'],
    reports: ['read', 'write'],
    order_reply: ['read', 'write']
  },
  tl: {
    tickets: ['read', 'write'],
    users: ['read'],
    newsletter: ['read'],
    reports: ['read'],
    order_reply: ['read']
  },
  agent: {
    tickets: ['read', 'write'],
    newsletter: [],
    reports: [],
    users: [],
    settings: [],
    order_reply: ['read']
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
  if (user.role === 'admin') return true;

  const fineAction = Object.keys(PERM_ACTION_MAP).includes(action) ? action : null;
  const coarseAction = PERM_ACTION_MAP[action] || (['read', 'write'].includes(action) ? action : null);
  if (!coarseAction) return false;

  const override = user.page_permissions?.[resource];
  if (override && fineAction && typeof override[fineAction] === 'boolean') {
    return override[fineAction];
  }

  const resources = ROLE_RESOURCES[user.role] || {};
  const allowed = resources[resource] || [];
  return allowed.includes(coarseAction);
}

const PERMISSION_RESOURCES = ['tickets', 'users', 'settings', 'newsletter', 'reports', 'order_reply'];

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

async function checkAccess(email, resource, action, env) {
  return await hasPermission(email, resource, action, env);
}

function getHubStub(env) {
  if (!env.TICKET_HUB) return null;
  const id = env.TICKET_HUB.idFromName("global");
  return env.TICKET_HUB.get(id);
}

async function isLoginRateLimited(key, env) {
  if (!RATE_LIMIT_ENABLED) return false;
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

function sanitizeSubject(text) {
  if (!text) return "";
  let cleaned = text.replace(/[\x00-\x1F\x7F]/g, " ");
  cleaned = cleaned.replace(/<[^>]*>/g, "");
  return cleaned.replace(/\s+/g, " ").trim();
}

function extractOrderNumber(text) {
  if (!text) return null;
  const orderRegex = /\b(DOR-\d{8}-[A-Z0-9]+)\b/i;
  const m = text.match(orderRegex);
  return m ? m[0].toUpperCase() : null;
}

function sanitizeName(text) {
  if (!text) return "";
  let cleaned = text.replace(/[\x00-\x1F\x7F]/g, "");
  cleaned = cleaned.replace(/[^\p{L}\p{N}\p{Emoji}\s\.\-']/gu, "");
  return cleaned.trim();
}

function normalizeCategory(c) {
  if (!c) return "unclassified";
  return String(c).trim().toLowerCase().replace(/\s+/g, "-");
}

async function getDefaultLanguage(env) {
  const lang = await getSetting(env, "general", "default_language");
  if (!lang) {
    throw new Error("Default language not configured. Please set general.default_language in settings.");
  }
  return lang;
}

async function getDefaultFrom(env) {
  const from = await getSetting(env, "email", "default_from");
  if (!from) {
    throw new Error("Default from address not configured. Please set email.default_from in settings.");
  }
  return from;
}

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

async function getAllSettings(env) {
  try {
    const r = await env.DB.prepare("SELECT * FROM settings ORDER BY category, key").all();
    return r.results || [];
  } catch {
    return [];
  }
}

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

async function getKnownCategories(env) {
  if (cache.categories !== null) {
    return cache.categories;
  }
  const cats = new Set(["unclassified"]);
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
      last_updated: ticket.updated_at || ticket.created_at || (new Date()).toISOString()
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

async function getAgentsOnlineCount(env) {
  const row = await env.DB.prepare("SELECT count FROM agents_online WHERE id = 1").first();
  return row ? row.count : 0;
}

async function setAgentsOnlineCount(env, n) {
  const value = Math.max(0, n);
  await env.DB.prepare("INSERT INTO agents_online (id, count) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET count = ?").bind(value, value).run();
  return value;
}

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
  const rank = (t) => {
    if (["resolved", "closed"].includes(t.status)) return 3;
    if (t.sla_resolution_due && new Date(t.sla_resolution_due) < new Date()) return 0;
    if (t.sla_response_due && new Date(t.sla_response_due) < new Date()) return 1;
    return 2;
  };
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

async function getTicketByOrderNumber(orderNumber, env) {
  if (!orderNumber) return null;
  return await env.DB.prepare("SELECT * FROM tickets WHERE order_number = ? LIMIT 1").bind(orderNumber).first();
}

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

async function getEmailAddresses(env, activeOnly = false) {
  try {
    const q = activeOnly ? "SELECT * FROM email_addresses WHERE is_active = 1 ORDER BY label" : "SELECT * FROM email_addresses ORDER BY label";
    const r = await env.DB.prepare(q).all();
    return r.results || [];
  } catch {
    return [];
  }
}

async function addEmailAddress(env, email, label, action, language) {
  if (!language) {
    throw new Error("Language is required for email address configuration");
  }
  await validateLanguage(language, env);
  await env.DB.prepare("INSERT INTO email_addresses (email, label, action, language) VALUES (?, ?, ?, ?)").bind(email, label, action, language).run();
}

async function updateEmailAddress(env, id, email, label, action, language, is_active) {
  if (language) {
    await validateLanguage(language, env);
  }
  await env.DB.prepare('UPDATE email_addresses SET email = ?, label = ?, action = ?, language = ?, is_active = ?, updated_at = datetime("now") WHERE id = ?').bind(email, label, action, language, is_active, id).run();
}

async function deleteEmailAddress(env, id) {
  await env.DB.prepare("DELETE FROM email_addresses WHERE id = ?").bind(id).run();
}

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

async function unsubscribe(token, env) {
  const result = await env.DB.prepare('SELECT subscriber_id FROM unsubscribe_tokens WHERE token = ? AND expires_at > datetime("now")').bind(token).first();
  if (!result) return { success: false, message: "Invalid or expired token" };
  await env.DB.prepare('UPDATE newsletter_subscribers SET status = "unsubscribed", unsubscribed_at = datetime("now") WHERE id = ?').bind(result.subscriber_id).run();
  return { success: true };
}

async function unsubscribeByEmail(email, env) {
  const clean = (email || "").toLowerCase().trim();
  if (!clean) return { success: false, message: "Email required" };
  const subscriber = await env.DB.prepare("SELECT id FROM newsletter_subscribers WHERE lower(email) = ?").bind(clean).first();
  if (!subscriber) return { success: false, message: "Email not found on our list" };
  await env.DB.prepare('UPDATE newsletter_subscribers SET status = "unsubscribed", unsubscribed_at = datetime("now") WHERE id = ?').bind(subscriber.id).run();
  return { success: true };
}

async function getSubscribers(env) {
  try {
    const r = await env.DB.prepare("SELECT id, email, name, language, status, subscribed_at, unsubscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC").all();
    return r.results || [];
  } catch {
    return [];
  }
}

async function deleteSubscriber(id, env) {
  await env.DB.prepare("DELETE FROM unsubscribe_tokens WHERE subscriber_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM newsletter_subscribers WHERE id = ?").bind(id).run();
}

async function buildUnsubscribeLink(env, token, language) {
  const domain = DOMAIN;
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

async function createNewsletter(env, subject, body, language, status = "draft") {
  const lang = language === "all" ? "all" : await validateLanguage(language, env);
  const result = await env.DB.prepare(
    `INSERT INTO newsletters (subject, body, language, status, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
  ).bind(subject, body || "", lang, status).run();
  const id = result.meta ? result.meta.last_row_id : result.lastInsertRowid;
  const row = await env.DB.prepare("SELECT * FROM newsletters WHERE id = ?").bind(id).first();
  return row;
}

async function getNewsletters(env) {
  const r = await env.DB.prepare("SELECT * FROM newsletters ORDER BY created_at DESC").all();
  return r.results || [];
}

async function deleteNewsletter(id, env) {
  await env.DB.prepare("DELETE FROM newsletters WHERE id = ?").bind(id).run();
}

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
  const BATCH_SIZE = NEWSLETTER_BATCH_SIZE;
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

async function getNextTicketSequence(language, env) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const langCode = (language || "en").toUpperCase().slice(0, 2);
  const sequenceKey = `ticket_seq_${langCode}${yy}`;
  
  try {
    const row = await env.DB.prepare(
      `SELECT value FROM settings WHERE category = 'system' AND key = ?`
    ).bind(sequenceKey).first();
    
    let nextSeq = 1;
    if (row && row.value) {
      nextSeq = parseInt(row.value) + 1;
    }
    
    if (nextSeq > TICKET_SEQUENCE_MAX) {
      throw new Error(`Ticket sequence overflow for ${langCode}${yy}`);
    }
    
    await env.DB.prepare(
      `INSERT OR REPLACE INTO settings (category, key, value, updated_at) 
       VALUES ('system', ?, ?, datetime('now'))`
    ).bind(sequenceKey, String(nextSeq)).run();
    
    return nextSeq;
  } catch (e) {
    console.error("Sequence generation error:", e);
    throw e;
  }
}

async function generateTicketNumber(language, env) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const langCode = (language || "en").toUpperCase().slice(0, 2);
  
  const sequence = await getNextTicketSequence(language, env);
  const paddedSeq = String(sequence).padStart(6, "0");
  
  return `TKT-${langCode}${yy}${paddedSeq}`;
}

function computeSlaStatus(ticket, graceMap = {}) {
  if (!ticket) return "on_track";
  if (!ticket.sla_response_due || !ticket.sla_resolution_due) return "on_track";
  const now = new Date();
  const rd = new Date(ticket.sla_response_due), rld = new Date(ticket.sla_resolution_due);

  const cat = ticket.category || "unclassified";
  const grace = graceMap[cat] || { resolvedGraceHours: 0, closedGraceHours: 0 };
  const resolvedGracePeriod = (grace.resolvedGraceHours || 0) * 60 * 60 * 1000;
  const closedGracePeriod = (grace.closedGraceHours || 0) * 60 * 60 * 1000;

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

async function createTicket(data, env) {
  const now = (new Date()).toISOString();
  const category = await validateCategory(data.category, env);
  const language = await validateLanguage(data.language, env);
  const ticketNumber = await generateTicketNumber(language, env);
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
  const nowIso = (new Date()).toISOString();
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

async function addComment(ticketId, data, env) {
  const now = (new Date()).toISOString();
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

async function getTicketByNumber(ticketNumber, env) {
  return await env.DB.prepare("SELECT * FROM tickets WHERE ticket_number = ?").bind(ticketNumber).first();
}

async function getTickets(filters, env, user) {
  let query = `SELECT id, id AS ticket_id, ticket_number, category, language, status, priority,
        sender_name, sender_email, sender_phone, order_number, subject, created_at, updated_at,
        last_action, sla_response_due, sla_resolution_due, assigned_to, last_updated_by, metadata
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

function formatEmailBody(text) {
  if (!text) return "";
  const blockTagRegex = /<(?:p|div|h[1-6]|ul|ol|blockquote|table)[\s>]/i;
  if (blockTagRegex.test(text)) return text;
  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r\n|\r|\n/g, "</p><p>");
  html = "<p>" + html + "</p>";
  html = html.replace(/<p>\s*<\/p>/g, "");
  return html;
}

async function createPasswordResetToken(env, email) {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const tokenHash = await sha256(token);
  const expiresAt = Math.floor(Date.now() / 1e3) + PASSWORD_RESET_EXPIRY_MINUTES * 60;
  await env.DB.prepare("INSERT INTO password_resets (token_hash, email, expires_at) VALUES (?, ?, ?)").bind(tokenHash, email, expiresAt).run();
  return token;
}

async function consumePasswordResetToken(env, token) {
  const tokenHash = await sha256(token || "");
  const row = await env.DB.prepare("SELECT * FROM password_resets WHERE token_hash = ?").bind(tokenHash).first();
  if (!row) return null;
  if (row.used) return null;
  if (Math.floor(Date.now() / 1e3) > row.expires_at) return null;
  await env.DB.prepare("UPDATE password_resets SET used = 1 WHERE token_hash = ?").bind(tokenHash).run();
  return row.email;
}

async function sendEmail(env, to, subject, body, from) {
  if (!SCRIPT_URL || !from) return { success: false, error: "Missing config" };
  if (!EMAIL_SCRIPT_SECRET || !EMAIL_SCRIPT_PASSWORD) return { success: false, error: "Email credentials not configured" };
  try {
    let htmlBody = body || "";
    const footer = await getSetting(env, "email", "footer_" + (from || "").replace(/[^a-z0-9]/gi, "_")) || await getSetting(env, "email", "footer_html");
    if (footer) htmlBody += /<[a-z][\s\S]*>/i.test(htmlBody) ? "<br /><br />" + footer : "\n\n" + footer;
    const params = { secret: EMAIL_SCRIPT_SECRET, username: EMAIL_SCRIPT_USERNAME, password: EMAIL_SCRIPT_PASSWORD, to, subject: (subject || "").replace(/[<>]/g, ""), message: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${htmlBody}</body></html>`, from };
    const formBody = Object.keys(params).map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k])).join("&");
    const res = await fetch(SCRIPT_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formBody });
    const data = await res.json();
    return data.status === "success" ? { success: true } : { success: false, error: data.message || "Error" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function escHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function parseTicketMeta(ticket) {
  if (!ticket) return {};
  try { return typeof ticket.metadata === "object" && ticket.metadata ? ticket.metadata : JSON.parse(ticket.metadata || "{}"); }
  catch (e) { return {}; }
}

async function getProductUrls(env) {
  const domain = (DOMAIN || "").replace(/\/+$/, "");
  function withDomain(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const base = domain.startsWith("http") ? domain : domain ? "https://" + domain : "";
    return base + (url.startsWith("/") ? "" : "/") + url;
  }
  const dataBaseUrl = withDomain((PRODUCTS_DATA_BASE_URL || "").replace(/\/+$/, ""));
  const imagesBaseUrl = withDomain((PRODUCTS_IMAGES_BASE_URL || "").replace(/\/+$/, ""));
  return { domain, dataBaseUrl, imagesBaseUrl };
}

async function fetchProductNames(urls, lang) {
  try {
    if (!urls.dataBaseUrl) return {};
    const res = await fetch(`${urls.dataBaseUrl}/${lang}/products.json`);
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    return {};
  }
}

function normalizeProductImages(data) {
  if (!Array.isArray(data)) return data || {};
  const out = {};
  for (const item of data) {
    if (item.id) out[item.id] = { images: item.images || [], image: item.image || "" };
  }
  return out;
}

async function fetchProductImages(urls) {
  try {
    if (!urls.imagesBaseUrl) return {};
    const res = await fetch(`${urls.imagesBaseUrl}/products.json`);
    if (!res.ok) return {};
    return normalizeProductImages(await res.json());
  } catch (e) {
    return {};
  }
}

async function fetchOrderLabels(urls, lang) {
  try {
    if (!urls.dataBaseUrl) return {};
    const res = await fetch(`${urls.dataBaseUrl}/${lang}/orders.json`);
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    return {};
  }
}

function resolveProductId(item, catalogs) {
  let id = item.product_id || item.productId || item.id || item.sku ||
    item.item_id || item.itemId || item.variant_id || item.variantId ||
    item.slug || null;
  if (id) return id;
  const itemName = (item.name || item.title || "").trim().toLowerCase();
  if (itemName) {
    for (const catalog of catalogs) {
      if (!catalog) continue;
      for (const [key, val] of Object.entries(catalog)) {
        const candidates = [val.name, val.label].filter(Boolean).map((s) => String(s).toLowerCase());
        if (candidates.includes(itemName)) return key;
      }
    }
  }
  return null;
}

function resolveImgUrl(domain, raw) {
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  const base = domain.startsWith("http") ? domain : domain ? "https://" + domain : "";
  return base + (raw.startsWith("/") ? "" : "/") + raw;
}

function renderOrderItemsHtml(meta, langProducts, labels) {
  const order = (meta && meta.order) || {};
  const items = order.items || [];
  if (!items.length) return "";
  const currency = meta.currency || "EUR";
  const totals = order.totals || {};
  const subtotal = parseFloat(totals.subtotal || 0);
  const discount = parseFloat(totals.discount || 0);
  const shipping = parseFloat(totals.shipping || 0);
  const tax = parseFloat(totals.tax || 0);
  const calculatedTotal = subtotal + shipping + tax;
  
  let html = '<table style="border-collapse:collapse;width:100%;margin:12px 0;font-family:Arial,sans-serif;font-size:14px;">';
  if (labels.product || labels.qty || labels.unit_price || labels.total) {
    html += '<tr style="border-bottom:1px solid #ddd;">';
    if (labels.product) html += `<th style="padding:10px;text-align:left;">${escHtml(labels.product)}</th>`;
    if (labels.qty) html += `<th style="padding:10px;text-align:center;">${escHtml(labels.qty)}</th>`;
    if (labels.unit_price) html += `<th style="padding:10px;text-align:right;">${escHtml(labels.unit_price)}</th>`;
    if (labels.total) html += `<th style="padding:10px;text-align:right;">${escHtml(labels.total)}</th>`;
    html += "</tr>";
  }
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const productId = resolveProductId(item, [langProducts]);
    let name = item.name;
    if (productId && langProducts[productId]) name = langProducts[productId].name || item.name;
    name = escHtml(String(name || "Product"));
    const qty = Math.max(1, parseInt(item.qty || item.quantity || 1, 10));
    const price = Math.max(0, parseFloat(item.price || 0));
    if (isNaN(price) || isNaN(qty)) continue;
    const lineTotal = (price * qty).toFixed(2);
    const itemDiscount = parseFloat(item.discount) || 0;
    const hasItemDiscount = itemDiscount > 0 && item.originalPrice != null;
    const unitPriceCell = hasItemDiscount
      ? `<s style="opacity:.55;">${currency} ${parseFloat(item.originalPrice).toFixed(2)}</s><br/>${currency} ${price.toFixed(2)} <span style="display:inline-block;background:#c8a96e;color:#1a1714;font-size:11px;font-weight:bold;padding:1px 6px;border-radius:3px;margin-left:4px;">-${itemDiscount}%</span>`
      : `${currency} ${price.toFixed(2)}`;
    html += '<tr style="border-bottom:1px solid #eee;">';
    html += `<td style="padding:10px;">${name}</td><td style="padding:10px;text-align:center;">${qty}</td><td style="padding:10px;text-align:right;">${unitPriceCell}</td><td style="padding:10px;text-align:right;font-weight:bold;">${currency} ${lineTotal}</td></tr>`;
  }
  html += '<tr style="border-top:2px solid #ddd;background:#f9f9f9;">';
  html += `<td colspan="3" style="padding:12px;text-align:right;font-weight:bold;">${labels.subtotal ? escHtml(labels.subtotal) : "Subtotal"}</td><td style="padding:12px;text-align:right;">${currency} ${subtotal.toFixed(2)}</td></tr>`;
  if (discount > 0) {
    html += '<tr style="border-bottom:1px solid #eee;background:#f9f9f9;">';
    html += `<td colspan="3" style="padding:12px;text-align:right;font-weight:bold;">${labels.discount ? escHtml(labels.discount) : "Discount"}</td><td style="padding:12px;text-align:right;">-${currency} ${discount.toFixed(2)}</td></tr>`;
  }
  if (shipping > 0) {
    html += '<tr style="border-bottom:1px solid #eee;background:#f9f9f9;">';
    html += `<td colspan="3" style="padding:12px;text-align:right;font-weight:bold;">${labels.shipping ? escHtml(labels.shipping) : "Shipping"}</td><td style="padding:12px;text-align:right;">${currency} ${shipping.toFixed(2)}</td></tr>`;
  }
  if (tax > 0) {
    html += '<tr style="border-bottom:1px solid #eee;background:#f9f9f9;">';
    html += `<td colspan="3" style="padding:12px;text-align:right;font-weight:bold;">${labels.tax ? escHtml(labels.tax) : "Tax"}</td><td style="padding:12px;text-align:right;">${currency} ${tax.toFixed(2)}</td></tr>`;
  }
  html += '<tr style="border-top:2px solid #ddd;background:#e8f4f8;">';
  html += `<td colspan="3" style="padding:12px;text-align:right;font-weight:bold;">${labels.total ? escHtml(labels.total) : "Total"}</td><td style="padding:12px;text-align:right;font-weight:bold;">${currency} ${calculatedTotal.toFixed(2)}</td></tr>`;
  html += "</table>";
  return html;
}

function renderOrderItemsWithImagesHtml(meta, langProducts, genericProducts, labels, domain) {
  const order = (meta && meta.order) || {};
  const items = order.items || [];
  if (!items.length) return "";
  const currency = meta.currency || "EUR";
  const totals = order.totals || {};
  const subtotal = parseFloat(totals.subtotal || 0);
  const discount = parseFloat(totals.discount || 0);
  const shipping = parseFloat(totals.shipping || 0);
  const tax = parseFloat(totals.tax || 0);
  const calculatedTotal = subtotal + shipping + tax;
  
  let html = '<table style="border-collapse:collapse;width:100%;margin:12px 0;font-family:Arial,sans-serif;font-size:14px;">';
  if (labels.image || labels.product || labels.qty || labels.unit_price || labels.total) {
    html += '<tr style="border-bottom:1px solid #ddd;">';
    if (labels.image) html += `<th style="padding:10px;text-align:left;">${escHtml(labels.image)}</th>`;
    if (labels.product) html += `<th style="padding:10px;text-align:left;">${escHtml(labels.product)}</th>`;
    if (labels.qty) html += `<th style="padding:10px;text-align:center;">${escHtml(labels.qty)}</th>`;
    if (labels.unit_price) html += `<th style="padding:10px;text-align:right;">${escHtml(labels.unit_price)}</th>`;
    if (labels.total) html += `<th style="padding:10px;text-align:right;">${escHtml(labels.total)}</th>`;
    html += "</tr>";
  }
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const productId = resolveProductId(item, [langProducts, genericProducts]);
    let name = item.name;
    if (productId && langProducts[productId]) name = langProducts[productId].name || item.name;
    name = escHtml(String(name || "Product"));
    let imgHtml = '<div style="width:60px;height:60px;background:#f0f0f0;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">No image</div>';
    if (productId && genericProducts[productId] && genericProducts[productId].image) {
      const imgUrl = escHtml(resolveImgUrl(domain, genericProducts[productId].image));
      imgHtml = `<img src="${imgUrl}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;" alt="${name}" />`;
    }
    const qty = Math.max(1, parseInt(item.qty || item.quantity || 1, 10));
    const price = Math.max(0, parseFloat(item.price || 0));
    if (isNaN(price) || isNaN(qty)) continue;
    const lineTotal = (price * qty).toFixed(2);
    const itemDiscount = parseFloat(item.discount) || 0;
    const hasItemDiscount = itemDiscount > 0 && item.originalPrice != null;
    const unitPriceCell = hasItemDiscount
      ? `<s style="opacity:.55;">${currency} ${parseFloat(item.originalPrice).toFixed(2)}</s><br/>${currency} ${price.toFixed(2)} <span style="display:inline-block;background:#c8a96e;color:#1a1714;font-size:11px;font-weight:bold;padding:1px 6px;border-radius:3px;margin-left:4px;">-${itemDiscount}%</span>`
      : `${currency} ${price.toFixed(2)}`;
    html += '<tr style="border-bottom:1px solid #eee;">';
    html += `<td style="padding:10px;text-align:center;">${imgHtml}</td><td style="padding:10px;">${name}</td><td style="padding:10px;text-align:center;">${qty}</td><td style="padding:10px;text-align:right;">${unitPriceCell}</td><td style="padding:10px;text-align:right;font-weight:bold;">${currency} ${lineTotal}</td></tr>`;
  }
  html += '<tr style="border-top:2px solid #ddd;background:#f9f9f9;">';
  html += `<td colspan="4" style="padding:12px;"></td><td colspan="1" style="padding:12px;text-align:right;font-weight:bold;">${labels.subtotal ? escHtml(labels.subtotal) : "Subtotal"} ${currency} ${subtotal.toFixed(2)}</td></tr>`;
  if (discount > 0) {
    html += '<tr style="border-bottom:1px solid #eee;background:#f9f9f9;">';
    html += `<td colspan="4" style="padding:12px;"></td><td colspan="1" style="padding:12px;text-align:right;font-weight:bold;">${labels.discount ? escHtml(labels.discount) : "Discount"} -${currency} ${discount.toFixed(2)}</td></tr>`;
  }
  if (shipping > 0) {
    html += '<tr style="border-bottom:1px solid #eee;background:#f9f9f9;">';
    html += `<td colspan="4" style="padding:12px;"></td><td colspan="1" style="padding:12px;text-align:right;font-weight:bold;">${labels.shipping ? escHtml(labels.shipping) : "Shipping"} ${currency} ${shipping.toFixed(2)}</td></tr>`;
  }
  if (tax > 0) {
    html += '<tr style="border-bottom:1px solid #eee;background:#f9f9f9;">';
    html += `<td colspan="4" style="padding:12px;"></td><td colspan="1" style="padding:12px;text-align:right;font-weight:bold;">${labels.tax ? escHtml(labels.tax) : "Tax"} ${currency} ${tax.toFixed(2)}</td></tr>`;
  }
  html += '<tr style="border-top:2px solid #ddd;background:#e8f4f8;">';
  html += `<td colspan="4" style="padding:12px;"></td><td style="padding:12px;text-align:right;font-weight:bold;">${labels.total ? escHtml(labels.total) : "Total"} ${currency} ${calculatedTotal.toFixed(2)}</td></tr>`;
  html += "</table>";
  return html;
}

function renderOrderSummaryHtml(meta, labels) {
  const order = (meta && meta.order) || {};
  const totals = order.totals || {};
  const currency = meta.currency || "EUR";
  if (!order.items || !order.items.length) return "";
  
  const subtotal = parseFloat(totals.subtotal || 0);
  const discount = parseFloat(totals.discount || 0);
  const shipping = parseFloat(totals.shipping || 0);
  const tax = parseFloat(totals.tax || 0);
  const calculatedTotal = subtotal + shipping + tax;
  
  let html = '<div style="padding:12px;background:#f5f5f5;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;margin:12px 0;">';
  html += `<div style="margin-bottom:8px;">${labels.order_ref ? escHtml(labels.order_ref) + ": " : "<strong>Order Reference:</strong> "}${escHtml(order.reference || "N/A")}</div>`;
  html += `<div style="margin-bottom:8px;">${labels.subtotal ? escHtml(labels.subtotal) + ": " : "<strong>Subtotal:</strong> "}${currency} ${subtotal.toFixed(2)}</div>`;
  if (discount > 0) html += `<div style="margin-bottom:8px;">${labels.discount ? escHtml(labels.discount) + ": " : "<strong>Discount:</strong> "}-${currency} ${discount.toFixed(2)}</div>`;
  if (shipping > 0) html += `<div style="margin-bottom:8px;">${labels.shipping ? escHtml(labels.shipping) + ": " : "<strong>Shipping:</strong> "}${currency} ${shipping.toFixed(2)}</div>`;
  if (tax > 0) html += `<div style="margin-bottom:8px;">${labels.tax ? escHtml(labels.tax) + ": " : "<strong>Tax:</strong> "}${currency} ${tax.toFixed(2)}</div>`;
  html += `<div style="padding-top:8px;border-top:1px solid #ddd;"><strong>${labels.total ? escHtml(labels.total) + ":" : "Total:"}</strong> ${currency} ${calculatedTotal.toFixed(2)}</div></div>`;
  return html;
}

function renderOrderCustomerHtml(meta, labels) {
  const customer = meta && meta.order && meta.order.customer;
  if (!customer || !(customer.name || customer.email || customer.phone)) return "";
  let html = '<div style="padding:12px;background:#f5f5f5;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;margin:12px 0;">';
  if (customer.name) html += `<div style="margin-bottom:8px;"><strong>${labels.name ? escHtml(labels.name) + ":" : "Name:"}</strong> ${escHtml(customer.name)}</div>`;
  if (customer.email) html += `<div style="margin-bottom:8px;"><strong>${labels.email ? escHtml(labels.email) + ":" : "Email:"}</strong> ${escHtml(customer.email)}</div>`;
  if (customer.phone) html += `<div><strong>${labels.phone ? escHtml(labels.phone) + ":" : "Phone:"}</strong> ${escHtml(customer.phone)}</div>`;
  html += "</div>";
  return html;
}

function renderOrderShippingHtml(meta, labels) {
  const customer = meta && meta.order && meta.order.customer;
  if (!customer || !customer.shipping_address) return "";
  const prefix = labels.shipping_address ? `<div style="font-weight:bold;margin-bottom:4px;">${escHtml(labels.shipping_address)}</div>` : "";
  return `<div style="padding:12px;background:#f5f5f5;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;margin:12px 0;">${prefix}<div style="white-space:pre-wrap;">${escHtml(customer.shipping_address)}</div></div>`;
}

async function applyOrderTags(html, ticket, env) {
  if (!ticket || !html) return html;
  const meta = parseTicketMeta(ticket);
  const lang = meta.language || ticket.language || "en";
  let out = html;

  const needsNames = out.includes("{{order_items_with_names}}") || out.includes("{{order_items}}");
  const needsImages = out.includes("{{order_items_with_images}}");
  const needsLabels = needsNames || needsImages ||
    out.includes("{{order_summary}}") || out.includes("{{order_customer}}") || out.includes("{{order_shipping}}");

  let urls = { domain: "", dataBaseUrl: "", imagesBaseUrl: "" };
  let langProducts = {}, genericProducts = {}, labels = {};
  if (needsNames || needsImages || needsLabels) urls = await getProductUrls(env);
  if (needsNames || needsImages) langProducts = await fetchProductNames(urls, lang);
  if (needsImages) genericProducts = await fetchProductImages(urls);
  if (needsLabels) labels = await fetchOrderLabels(urls, lang);

  if (out.includes("{{order_items_with_names}}")) {
    out = out.replaceAll("{{order_items_with_names}}", renderOrderItemsHtml(meta, langProducts, labels));
  }
  if (out.includes("{{order_items_with_images}}")) {
    out = out.replaceAll("{{order_items_with_images}}", renderOrderItemsWithImagesHtml(meta, langProducts, genericProducts, labels, urls.domain));
  }
  if (out.includes("{{order_items}}")) {
    out = out.replaceAll("{{order_items}}", renderOrderItemsHtml(meta, langProducts, labels));
  }
  out = out.replaceAll("{{order_summary}}", renderOrderSummaryHtml(meta, labels));
  out = out.replaceAll("{{order_customer}}", renderOrderCustomerHtml(meta, labels));
  out = out.replaceAll("{{order_shipping}}", renderOrderShippingHtml(meta, labels));
  out = out.replaceAll("{{order_reference}}", escHtml((meta.order && meta.order.reference) || ticket.order_number || ""));
  out = out.replaceAll("{{ticket_number}}", escHtml(ticket.ticket_number || ""));
  return out;
}

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
  subject = await applyOrderTags(subject, ticket, env);
  body = await applyOrderTags(body, ticket, env);
  const formattedBody = formatEmailBody(body);
  let from = ar.from || await getDefaultFrom(env);
  return await sendEmail(env, email, subject, formattedBody, from);
}

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

function looksLikeBase64(str) {
  const clean = str.replace(/\s+/g, "");
  return clean.length > 20 && clean.length % 4 === 0 && /^[A-Za-z0-9+/]+=*$/.test(clean);
}

function decodePartBody(headerBlock, rawBody) {
  const encMatch = (headerBlock || "").match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
  const encoding = encMatch ? encMatch[1].trim().toLowerCase() : "";
  if (encoding === "base64") return decodeBase64Body(rawBody);
  if (encoding === "quoted-printable") return decodeQuotedPrintable(rawBody);
  if (!encoding && looksLikeBase64(rawBody)) return decodeBase64Body(rawBody);
  return rawBody;
}

function cleanupBody(text) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

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
    
    if (htmlBody) {
      body = htmlBody;
    } else if (plainTextBody) {
      body = plainTextBody;
    } else if (!body) {
      body = "";
    }
    
    if (body && body.length > EMAIL_BODY_MAX_LENGTH) body = body.substring(0, EMAIL_BODY_MAX_LENGTH);
    
    return { from, subject, body };
  } catch (e) {
    console.error("Email parsing error:", e);
    return { from: "unknown@example.com", subject: "No subject", body: "" };
  }
}

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

async function getAllowedOrigins(env) {
  return CORS_ALLOWED_ORIGINS;
}

function getCorsHeaders(origin, allowedOrigins) {
  if (!CORS_ENABLED) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
  }

  if (origin && allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
  }

  return {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

var worker_default = {
  async fetch(request, env, ctx) {
    await initializeDatabase(env);
    await loadConfig(env);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = await getAllowedOrigins(env);
    const corsHeaders = getCorsHeaders(origin, allowedOrigins);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    try {
      if (path === "/api/admin/debug-env" && method === "GET") {
        return json({ 
          hasKey: typeof env.ENCRYPTION_KEY !== 'undefined',
          allKeys: Object.keys(env).filter(k => k.includes('KEY') || k.includes('SECRET') || k.includes('ENCRYPT'))
        });
      }

      
  // 👇 ADD THIS RIGHT HERE 👇
  if (path === "/api/admin/debug-token" && method === "GET") {
    const token = env.CLOUDFLARE_API_TOKEN;
    return json({ 
      tokenExists: typeof token !== 'undefined',
      tokenLength: token ? token.length : 0,
      tokenFirst4: token ? token.substring(0, 4) : 'none',
      allKeys: Object.keys(env) // Show ALL keys without filtering
    });
  }

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

      if (path === "/api/admin/test-push" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        await pushTicketNotification({
          ticket_number: "TKT-EN25000001",
          category: "support",
          language: "en",
          sla_status: "on_track",
          status: "new",
          subject: "Test Ticket - Hub Working!",
          sender_name: "Test User",
          updated_at: (new Date()).toISOString()
        }, env, "created");
        return json({ success: true, message: "Test ticket sent via TICKET_HUB" });
      }

      if (path === "/api/admin/reports" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "reports", "view", env)) return json({ error: "Permission denied" }, 403);
        return json({ success: true, data: await getReports(env) });
      }

      if (path === "/api/admin/stats" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "tickets", "view", env)) return json({ error: "Permission denied" }, 403);
        const user = await getUser(email, env);
        return json({ success: true, stats: await getStats(env, user) });
      }

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
        const { settings } = await request.json();
        const isOrderReplyWrite = Array.isArray(settings) && settings.length > 0 && settings.every((s) =>
          s.category === "order_template" || (s.category === "auto_reply" && String(s.key || "").startsWith("payment_"))
        );
        const requiredResource = isOrderReplyWrite ? "order_reply" : "settings";
        if (!await checkAccess(email, requiredResource, "edit", env)) return json({ error: "Permission denied" }, 403);
        for (const s of settings) await updateSetting(env, s.category, s.key, s.value);
        await bumpConfigVersion(env);
        configLoaded = false;
        await loadConfig(env);
        return json({ success: true });
      }

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
          const allTickets = await getTickets({ limit: 50, statuses: ACTIVE_STATUSES }, env, { role: "admin" });
          await setTicketCache(allTickets);
        }
        await setAgentsOnlineCount(env, online + 1);
        return json({ success: true, token, user: { email: user.email, name: user.name, role: user.role, allowed_languages: user.allowed_languages, allowed_emails: user.allowed_emails, allowed_categories: user.allowed_categories, team_id: user.team_id, page_permissions: user.page_permissions || {}, effective_permissions: buildEffectivePermissions(user) } });
      }

      if (path === "/api/admin/logout" && method === "POST") {
        return json({ success: true });
      }

      if (path === "/api/admin/forgot-password" && method === "POST") {
        const { email } = await request.json();
        const cleanEmail = (email || "").toLowerCase().trim();
        const genericResponse = { success: true, message: "If an account exists for that address, a reset link has been sent." };
        if (!cleanEmail) return json(genericResponse);
        if (await isLoginRateLimited("reset:" + cleanEmail, env)) return json({ error: "Too many requests. Try again later." }, 429);
        await recordFailedLogin("reset:" + cleanEmail, env);

        const user = await getUser(cleanEmail, env);
        if (user) {
          const token = await createPasswordResetToken(env, user.email);
          const domainRaw = DOMAIN || "";
          const cleanDomain = domainRaw.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
          const basedirRaw = APP_BASEDIR || "";
          const cleanBasedir = basedirRaw.trim().replace(/^\/+/, "").replace(/\/+$/, "");
          const base = cleanDomain ? `https://${cleanDomain}` : "";
          const pathPrefix = cleanBasedir ? `/${cleanBasedir}` : "";
          const resetLink = `${base}${pathPrefix}/reset-password.html?token=${token}`;
          const from = (await getSetting(env, "email", "password_reset_from")) || (await getSetting(env, "email", "default_from"));
          if (from) {
            const body = `<p>Hi ${user.name || ""},</p><p>We received a request to reset your EdgeDesk password. Click the link below to choose a new password. This link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes.</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`;
            await sendEmail(env, user.email, "Reset your EdgeDesk password", body, from);
          }
        }
        return json(genericResponse);
      }

      if (path === "/api/admin/reset-password" && method === "POST") {
        const { token, password } = await request.json();
        
        if (!token || !password) {
          return json({ error: "Token and password are required." }, 400);
        }
        
        let passwordHash;
        try {
          passwordHash = await validateAndHashPassword(password, env);
        } catch (e) {
          return json({ error: e.message }, 400);
        }
        
        const email = await consumePasswordResetToken(env, token);
        if (!email) return json({ error: "This reset link is invalid or has expired." }, 400);

        await env.DB.prepare("UPDATE users SET password_hash = ? WHERE LOWER(email) = ?")
          .bind(passwordHash, email.toLowerCase()).run();
        cache.users.delete(email.toLowerCase());
        return json({ success: true, message: "Password updated. You can now log in." });
      }

      if (path === "/api/admin/validate-reset-token" && method === "POST") {
        const { token } = await request.json();
        
        if (!token) {
          return json({ valid: false, message: "No token provided" }, 400);
        }
        
        try {
          const tokenHash = await sha256(token);
          const row = await env.DB.prepare(
            "SELECT expires_at, used FROM password_resets WHERE token_hash = ?"
          ).bind(tokenHash).first();
          
          if (!row) {
            return json({ valid: false, message: "Invalid or expired token" });
          }
          
          if (row.used === 1) {
            return json({ valid: false, message: "This token has already been used" });
          }
          
          const now = Math.floor(Date.now() / 1000);
          if (now > row.expires_at) {
            return json({ valid: false, message: "This reset link has expired" });
          }
          
          return json({ 
            valid: true, 
            expires_at: row.expires_at,
            message: "Token is valid"
          });
        } catch (e) {
          console.error("Validate token error:", e);
          return json({ valid: false, message: "Error validating token" }, 500);
        }
      }

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

        let passwordHash;
        try {
          passwordHash = await validateAndHashPassword(password, env);
        } catch (e) {
          return json({ error: e.message }, 400);
        }

        try {
          await env.DB.prepare("INSERT INTO users (email, name, role, password_hash, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(newEmail.toLowerCase().trim(), name, role, passwordHash, JSON.stringify(allowed_languages || []), JSON.stringify(allowed_emails || []), JSON.stringify(allowed_categories || []), team_id || null, JSON.stringify(finalPerms)).run();
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

        if (body.password) {
          let passwordHash;
          try {
            passwordHash = await validateAndHashPassword(body.password, env);
          } catch (e) {
            return json({ error: e.message }, 400);
          }
          await env.DB.prepare("UPDATE users SET password_hash = ? WHERE email = ?")
            .bind(passwordHash, userEmail).run();
        }

        await env.DB.prepare("UPDATE users SET name = ?, role = ?, allowed_languages = ?, allowed_emails = ?, allowed_categories = ?, team_id = ?, page_permissions = ? WHERE email = ?")
          .bind(name, role, JSON.stringify(allowed_languages || []), JSON.stringify(allowed_emails || []), JSON.stringify(allowed_categories || []), team_id || null, JSON.stringify(finalPerms || {}), userEmail).run();
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
        if (targetEmail.toLowerCase() === email.toLowerCase()) return json({ error: "You cannot delete your own account" }, 403);
        if (caller.role !== "admin") return json({ error: "Permission denied" }, 403);
        await env.DB.prepare("DELETE FROM users WHERE email = ?").bind(targetEmail).run();
        clearCache();
        return json({ success: true });
      }

      if (path === "/api/admin/tickets" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "tickets", "view", env)) return json({ error: "Permission denied" }, 403);
        const user = await getUser(email, env);
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
          await addComment(id, { type: "public", authorEmail: userEmail, content: REPLY_DELIMITER + from + REPLY_DELIMITER + body }, env);
          const updated = await getTicket(id, env);
          if (updated) await injectTicketIntoCache(updated, env);
          return json({ success: true });
        }
        return json({ success: false, error: result.error }, 500);
      }

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

      if (path === "/api/admin/setup/encrypt" && method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);
        const { value } = await request.json();
        if (!value) return json({ error: "Value required" }, 400);
        try {
          const encrypted = await encrypt(value, env);
          return json({ success: true, encrypted });
        } catch (e) {
          return json({ error: e.message }, 500);
        }
      }

      // ============================================================
      // CLOUDFLARE EMAIL ROUTING SETUP APIs
      // ============================================================

// Verify the stored Cloudflare API token is valid
if (path === "/api/admin/setup/verify-token" && method === "GET") {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  const email = await verifyToken(token, env);
  if (!email) return json({ error: "Unauthorized" }, 401);
  if (!await checkAccess(email, "settings", "view", env)) return json({ error: "Permission denied" }, 403);

  try {
    // Instead of verifying the token directly, try to list zones
    // If this works, the token is valid and has Zone:Read permission
    const data = await callCloudflareAPI("GET", "/zones?per_page=1", null, env);
    return json({ 
      success: true, 
      tokenValid: true,
      message: "Cloudflare API token is valid",
      zones: data.result || []
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 400);
  }
}

      // Create zone (add domain to Cloudflare)
      if (path === "/api/admin/setup/cloudflare-zone" && method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);

        const { domain, accountId } = await request.json();
        if (!domain) return json({ error: "Domain required" }, 400);

        try {
          let finalAccountId = accountId;
          
          // If not provided in request, try to get from DB (plain text, not encrypted)
          if (!finalAccountId) {
            finalAccountId = await getSetting(env, 'cloudflare', 'account_id');
          }
          
          // Fall back to env var
          if (!finalAccountId) {
            finalAccountId = env.CLOUDFLARE_ACCOUNT_ID;
          }
          
          if (!finalAccountId) {
            return json({ error: "Cloudflare Account ID not configured. Please set it in settings." }, 400);
          }

          const data = await callCloudflareAPI("POST", "/zones", {
            name: domain,
            account: { id: finalAccountId },
            type: "full",
            jump_start: false
          }, env);

          const zone = data.result;
          return json({
            success: true,
            zoneId: zone.id,
            name: zone.name,
            status: zone.status,
            nameServers: zone.name_servers || [],
            originalNameServers: zone.original_name_servers || []
          });
        } catch (e) {
          return json({ success: false, error: e.message }, 400);
        }
      }

      // Get zone status (poll this until status === "active")
      if (path.startsWith("/api/admin/setup/cloudflare-zone/") && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "view", env)) return json({ error: "Permission denied" }, 403);

        const zoneId = path.split("/")[5];
        try {
          const data = await callCloudflareAPI("GET", `/zones/${zoneId}`, null, env);
          const zone = data.result;
          return json({
            success: true,
            zoneId: zone.id,
            name: zone.name,
            status: zone.status,
            nameServers: zone.name_servers || [],
            originalNameServers: zone.original_name_servers || []
          });
        } catch (e) {
          return json({ success: false, error: e.message }, 400);
        }
      }

      // Enable Email Routing on a zone
      if (path === "/api/admin/setup/email-routing" && method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);

        const { zoneId } = await request.json();
        if (!zoneId) return json({ error: "zoneId required" }, 400);

        try {
          const data = await callCloudflareAPI("POST", `/zones/${zoneId}/email/routing/enable`, null, env);
          return json({ success: true, routing: data.result });
        } catch (e) {
          return json({ success: false, error: e.message }, 400);
        }
      }

      // Create DNS records (MX, SPF, DKIM) required for Email Routing.
      // Cloudflare exposes the exact records a zone needs via GET .../email/routing/dns
      // (not hardcoded here, so this keeps working if CF changes MX hosts / DKIM key).
      if (path === "/api/admin/setup/email-dns" && method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);

        const { zoneId } = await request.json();
        if (!zoneId) return json({ error: "zoneId required" }, 400);

        try {
          // Ask Cloudflare what records this zone currently needs.
          const needed = await callCloudflareAPI("GET", `/zones/${zoneId}/email/routing/dns`, null, env);
          const requiredRecords = needed.result || [];

          if (!requiredRecords.length) {
            return json({ success: true, created: 0, message: "No records needed - already configured" });
          }

          const results = [];
          const errors = [];
          for (const rec of requiredRecords) {
            try {
              const body = {
                type: rec.type,
                name: rec.name,
                content: rec.content,
                ttl: rec.ttl || 3600,
                proxied: false
              };
              if (rec.priority !== undefined) body.priority = rec.priority;
              const r = await callCloudflareAPI("POST", `/zones/${zoneId}/dns_records`, body, env);
              results.push(r.result);
            } catch (e) {
              // Record may already exist (e.g. re-running after a partial failure) - not fatal.
              errors.push(`${rec.type} ${rec.name}: ${e.message}`);
            }
          }

          if (errors.length && !results.length) {
            return json({ success: false, error: errors.join("; ") }, 400);
          }
          return json({ success: true, created: results.length, errors: errors.length ? errors : undefined });
        } catch (e) {
          return json({ success: false, error: e.message }, 400);
        }
      }

      // Get Email Routing status
      if (path.startsWith("/api/admin/setup/email-routing/") && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "view", env)) return json({ error: "Permission denied" }, 403);

        const zoneId = path.split("/")[5];
        try {
          const data = await callCloudflareAPI("GET", `/zones/${zoneId}/email/routing`, null, env);
          return json({ success: true, routing: data.result });
        } catch (e) {
          return json({ success: false, error: e.message }, 400);
        }
      }

      // Create a routing rule (catch-all or specific address) → sends to this Worker
      if (path === "/api/admin/setup/routing-rule" && method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);

        const { zoneId, emailPattern, workerName } = await request.json();
        if (!zoneId) return json({ error: "zoneId required" }, 400);

        const worker = workerName || env.WORKER_NAME || "";
        if (!worker) return json({ error: "Worker name required. Set WORKER_NAME environment variable or pass workerName in body." }, 400);

        try {
          // Resolve domain name for the zone (needed to build full email address)
          const zoneData = await callCloudflareAPI("GET", `/zones/${zoneId}`, null, env);
          const domainName = zoneData.result.name;

          let matchers;
          if (!emailPattern || emailPattern === "*" || emailPattern === "*@*" || emailPattern === `*@${domainName}`) {
            matchers = [{ type: "all" }];
          } else if (emailPattern.includes("@")) {
            matchers = [{ type: "literal", field: "to", value: emailPattern }];
          } else {
            matchers = [{ type: "literal", field: "to", value: `${emailPattern}@${domainName}` }];
          }

          const data = await callCloudflareAPI("POST", `/zones/${zoneId}/email/routing/rules`, {
            name: `Route to ${worker}`,
            enabled: true,
            priority: 0,
            matchers: matchers,
            actions: [{ type: "worker", value: [worker] }]
          }, env);

          return json({ success: true, rule: data.result });
        } catch (e) {
          return json({ success: false, error: e.message }, 400);
        }
      }

      // List routing rules for a zone
      if (path.startsWith("/api/admin/setup/routing-rules/") && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "view", env)) return json({ error: "Permission denied" }, 403);

        const zoneId = path.split("/")[5];
        try {
          const data = await callCloudflareAPI("GET", `/zones/${zoneId}/email/routing/rules`, null, env);
          return json({ success: true, rules: data.result || [] });
        } catch (e) {
          return json({ success: false, error: e.message }, 400);
        }
      }

      // List DNS records for a zone (useful to verify MX/SPF/DKIM were auto-created)
      if (path.startsWith("/api/admin/setup/dns-records/") && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "view", env)) return json({ error: "Permission denied" }, 403);

        const zoneId = path.split("/")[5];
        try {
          const data = await callCloudflareAPI("GET", `/zones/${zoneId}/dns_records`, null, env);
          return json({ success: true, records: data.result || [] });
        } catch (e) {
          return json({ success: false, error: e.message }, 400);
        }
      }

      // Delete a single DNS record (used to clear conflicting non-Cloudflare MX
      // records that block Email Routing from being enabled)
      if (path.startsWith("/api/admin/setup/dns-records/") && method === "DELETE") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);

        const parts = path.split("/");
        const zoneId = parts[5];
        const recordId = parts[6];
        if (!zoneId || !recordId) return json({ error: "zoneId and recordId required" }, 400);

        try {
          await callCloudflareAPI("DELETE", `/zones/${zoneId}/dns_records/${recordId}`, null, env);
          return json({ success: true });
        } catch (e) {
          return json({ success: false, error: e.message }, 400);
        }
      }

      // List verified destination addresses (account-level)
      if (path === "/api/admin/setup/destination-addresses" && method === "GET") {
        const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
        const email = await verifyToken(token, env);
        if (!email) return json({ error: "Unauthorized" }, 401);
        if (!await checkAccess(email, "settings", "view", env)) return json({ error: "Permission denied" }, 403);

        const accountId = url.searchParams.get("accountId") || env.CLOUDFLARE_ACCOUNT_ID || "";
        if (!accountId) return json({ error: "accountId required" }, 400);

        try {
          const data = await callCloudflareAPI("GET", `/accounts/${accountId}/email/routing/addresses`, null, env);
          return json({ success: true, addresses: data.result || [] });
        } catch (e) {
          return json({ success: false, error: e.message }, 400);
        }
      }
// List all zones (needed to find existing domains)
if (path === "/api/admin/setup/cloudflare-zones" && method === "GET") {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  const email = await verifyToken(token, env);
  if (!email) return json({ error: "Unauthorized" }, 401);
  if (!await checkAccess(email, "settings", "view", env)) return json({ error: "Permission denied" }, 403);

  try {
    const data = await callCloudflareAPI("GET", "/zones", null, env);
    return json({ success: true, zones: data.result || [] });
  } catch (e) {
    return json({ success: false, error: e.message }, 400);
  }
}

// Delete a routing rule
if (path.startsWith("/api/admin/setup/routing-rule/") && method === "DELETE") {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  const email = await verifyToken(token, env);
  if (!email) return json({ error: "Unauthorized" }, 401);
  if (!await checkAccess(email, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);

  const ruleId = path.split("/")[5];
  const { zoneId } = await request.json();
  if (!zoneId || !ruleId) return json({ error: "zoneId and ruleId required" }, 400);

  try {
    const data = await callCloudflareAPI("DELETE", `/zones/${zoneId}/email/routing/rules/${ruleId}`, null, env);
    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: e.message }, 400);
  }
}

// Update a routing rule (toggle enabled/disabled)
if (path.startsWith("/api/admin/setup/routing-rule/") && method === "PUT") {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  const email = await verifyToken(token, env);
  if (!email) return json({ error: "Unauthorized" }, 401);
  if (!await checkAccess(email, "settings", "edit", env)) return json({ error: "Permission denied" }, 403);

  const ruleId = path.split("/")[5];
  const { zoneId, rule } = await request.json();
  if (!zoneId || !ruleId || !rule) return json({ error: "zoneId, ruleId and rule required" }, 400);

  try {
    const data = await callCloudflareAPI("PUT", `/zones/${zoneId}/email/routing/rules/${ruleId}`, rule, env);
    return json({ success: true, rule: data.result });
  } catch (e) {
    return json({ success: false, error: e.message }, 400);
  }
}

      return json({ error: "Not found" }, 404); 
    } catch (err) {
      console.error("Error:", err);
      return json({ error: err.message || "Internal server error" }, 500);
    }
  },

  async email(message, env) {
    try {
      await loadConfig(env);
      const { from, subject, body } = await parseEmail(message.raw);
      
      const ticketRegex = /TKT-[A-Z]{2}\d{2}\d{6}/g;
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

var TicketHub = class {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.locks = new Map();
    this.userLocks = new Map();
    this.loginAttempts = new Map();
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
    await loadConfig(this.env);
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

    if (request.method === "POST" && url.pathname === "/rl-check") {
      const RL_MAX = LOGIN_MAX_ATTEMPTS;
      const RL_WINDOW_MS = LOGIN_WINDOW_MS;
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

    if (request.method === "POST" && url.pathname === "/rl-fail") {
      const RL_WINDOW_MS = LOGIN_WINDOW_MS;
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

    if (request.method === "POST" && url.pathname === "/rl-clear") {
      let body = {};
      try {
        body = await request.json();
      } catch (e) {}
      const key = body.key || "";
      this.loginAttempts.delete(key);
      return new Response(JSON.stringify({ success: true }));
    }

    if (request.method === "POST" && url.pathname === "/user-locks") {
      let body = {};
      try {
        body = await request.json();
      } catch (e) {}
      
      const email = body.email;
      const lockedTickets = this.getUserLockedTickets(email);
      return new Response(JSON.stringify({ lockedTickets }));
    }

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

    if (request.method === "POST" && url.pathname === "/lock") {
      const LOCK_STALE_MS = LOCK_STALE_WRITE_MS;
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
    await loadConfig(this.env);
    const IDLE_MS = 20 * 60 * 1000;
    const LOCK_STALE_MS = LOCK_STALE_READ_MS;
    const RL_WINDOW_MS = LOGIN_WINDOW_MS;
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
      await loadConfig(this.env);
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
        if (now - lock.ts > LOCK_CLEANUP_THRESHOLD_MS) {
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