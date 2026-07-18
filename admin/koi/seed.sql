-- ============================================================
-- SETTINGS TABLE (must exist first)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(category, key)
);

-- ============================================================
-- SYSTEM CONFIGURATION
-- ============================================================
INSERT OR IGNORE INTO settings (category, key, value) VALUES
('system', 'ticket_cache_key', 'ticket-list'),
('system', 'jwt_expiry_seconds', '86400'),
('system', 'lock_timeout_write_ms', '45000'),
('system', 'lock_timeout_read_ms', '30000'),
('system', 'lock_cleanup_interval_ms', '15000'),
('system', 'login_max_attempts', '5'),
('system', 'login_ratelimit_window_ms', '300000'),
('system', 'cors_allowed_origins', 'https://dornori.com,https://www.dornori.com,https://dornori.github.io,https://dornori-ticketing.dornori-info.workers.dev');

-- ============================================================
-- SECURITY
-- ============================================================
INSERT OR IGNORE INTO settings (category, key, value) VALUES
('security', 'password_min_length', '12'),
('security', 'password_reset_expiry_minutes', '15'),
('security', 'password_blocklist', 'password,123456,12345678,qwerty,abc123,password123,admin,letmein,welcome,monkey,dragon,master,hello,fuckyou,superman,123456789,12345,1234567890,qwertyuiop,qwerty123,1q2w3e4r,password1,123321,111111,000000,abcdef,abcd1234,iloveyou,trustno1,sunshine,princess,shadow,ashley,bailey,passw0rd,admin123,root,toor');

-- ============================================================
-- TICKETS & EMAIL
-- ============================================================
INSERT OR IGNORE INTO settings (category, key, value) VALUES
('tickets', 'newsletter_batch_size', '10'),
('tickets', 'ticket_sequence_max', '999999'),
('tickets', 'email_body_max_length', '15000'),
('tickets', 'ticket_active_statuses', 'new,open,in_progress,pending'),
('tickets', 'reply_delimiter', '\u0001');

-- ============================================================
-- GENERAL (URLs & Domain)
-- ============================================================
INSERT OR IGNORE INTO settings (category, key, value) VALUES
('general', 'domain', 'dornori.com'),
('general', 'app_basedir', ''),
('general', 'script_url', 'https://script.google.com/macros/s/AKfycbze4FmS48tbSYaTN2JvEB9Gmha8OgcKMKtf57D6XeK7X4x-pYfgMZJipU10pyGmhm_P/exec'),
('general', 'email_script_username', 'dornori'),
('general', 'products_data_base_url', ''),
('general', 'products_images_base_url', ''),
('general', 'default_language', 'en'),
('general', 'config_version', '1');

-- ============================================================
-- EMAIL
-- ============================================================
INSERT OR IGNORE INTO settings (category, key, value) VALUES
('email', 'default_from', 'support@dornori.com'),
('email', 'password_reset_from', 'support@dornori.com');

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  password_hash TEXT NOT NULL,
  allowed_languages TEXT DEFAULT '[]',
  allowed_emails TEXT DEFAULT '[]',
  allowed_categories TEXT DEFAULT '[]',
  team_id INTEGER,
  page_permissions TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TICKETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'unclassified',
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'medium',
  sender_name TEXT,
  sender_email TEXT,
  sender_phone TEXT,
  order_number TEXT,
  subject TEXT,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_action TEXT DEFAULT (datetime('now')),
  sla_response_due TEXT,
  sla_resolution_due TEXT,
  assigned_to TEXT,
  metadata TEXT DEFAULT '{}',
  last_updated_by TEXT
);

-- ============================================================
-- TICKET COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'internal',
  author_email TEXT,
  content TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  old_status TEXT,
  new_status TEXT,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

-- ============================================================
-- EMAIL ADDRESSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS email_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  label TEXT NOT NULL,
  action TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- NEWSLETTER SUBSCRIBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'active',
  subscribed_at TEXT DEFAULT (datetime('now')),
  unsubscribed_at TEXT
);

-- ============================================================
-- UNSUBSCRIBE TOKENS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS unsubscribe_tokens (
  subscriber_id INTEGER PRIMARY KEY,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (subscriber_id) REFERENCES newsletter_subscribers(id)
);

-- ============================================================
-- NEWSLETTERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS newsletters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  body TEXT,
  language TEXT NOT NULL DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  sent_at TEXT,
  recipient_count INTEGER DEFAULT 0
);

-- ============================================================
-- PASSWORD RESETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- AGENTS ONLINE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS agents_online (
  id INTEGER PRIMARY KEY DEFAULT 1,
  count INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO agents_online (id, count) VALUES (1, 0);

-- ============================================================
-- DONE
-- ============================================================