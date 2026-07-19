@echo off
setlocal enabledelayedexpansion
title Dornorium Installer - COMPLETE
echo ========================================
echo Dornorium Installer - FINAL VERSION
echo ========================================
echo.

:: ============================================
:: STEP 1: GATHER CREDENTIALS
:: ============================================
echo Enter your Cloudflare credentials
set /p ACCOUNT_ID="Cloudflare Account ID: "
set /p API_TOKEN="Cloudflare API Token: "
set /p WORKER_NAME="Worker name (default: dornorium): "
if "%WORKER_NAME%"=="" set WORKER_NAME=dornorium

:: ============================================
:: STEP 2: CREATE KV & D1
:: ============================================
echo.
echo Creating resources...
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/storage/kv/namespaces" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"title\":\"%WORKER_NAME%_kv\"}" > "%TEMP%\kv.json"
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"%WORKER_NAME%_db\"}" > "%TEMP%\db.json"

for /f %%i in ('powershell -Command "(Get-Content \"%TEMP%\kv.json\" -Raw | ConvertFrom-Json).result.id"') do set "KV_ID=%%i"
for /f %%i in ('powershell -Command "(Get-Content \"%TEMP%\db.json\" -Raw | ConvertFrom-Json).result.uuid"') do set "DB_ID=%%i"

if "%KV_ID%"=="" (echo ERROR: KV creation failed. & pause & exit)
if "%DB_ID%"=="" (echo ERROR: D1 creation failed. & pause & exit)

echo KV_ID: %KV_ID%
echo DB_ID: %DB_ID%

:: ============================================
:: STEP 3: UPLOAD WORKER
:: ============================================
echo.
echo Uploading Worker...
echo {"main_module":"worker.js","compatibility_date":"2026-07-17","bindings":[{"type":"kv_namespace","name":"TICKET_KV","namespace_id":"%KV_ID%"},{"type":"d1","name":"DB","id":"%DB_ID%"},{"type":"durable_object_namespace","name":"TICKET_HUB","class_name":"TicketHub"}],"migrations":{"tag":"v1","steps":[{"new_sqlite_classes":["TicketHub"]}]}} > "%TEMP%\metadata.json"

curl -X PUT "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -F "metadata=@%TEMP%\metadata.json;type=application/json" ^
  -F "worker.js=@worker.js;type=application/javascript+module" --silent > "%TEMP%\upload.json"

findstr /C:"\"success\":" "%TEMP%\upload.json" >nul
if errorlevel 1 (
    echo ERROR: Worker upload failed.
    type "%TEMP%\upload.json"
    pause
    exit
)
echo OK: Worker uploaded successfully.

:: ============================================
:: STEP 4: SET SECRETS
:: ============================================
echo.
echo Generating secrets...
set "CHARS=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
set "JWT_SECRET="
set "ENCRYPTION_KEY="
for /L %%i in (1,1,64) do (
    set /a "r=!random! %% 62"
    for %%r in (!r!) do set "JWT_SECRET=!JWT_SECRET!!CHARS:~%%r,1!"
)
for /L %%i in (1,1,32) do (
    set /a "r=!random! %% 62"
    for %%r in (!r!) do set "ENCRYPTION_KEY=!ENCRYPTION_KEY!!CHARS:~%%r,1!"
)

curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/secrets" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"JWT_SECRET\",\"text\":\"%JWT_SECRET%\",\"type\":\"secret_text\"}"
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/secrets" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"ENCRYPTION_KEY\",\"text\":\"%ENCRYPTION_KEY%\",\"type\":\"secret_text\"}"

echo OK: Secrets set.

:: ============================================
:: STEP 5: ENABLE SUBDOMAIN
:: ============================================
echo Enabling workers.dev subdomain...
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/subdomain" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"enabled\": true, \"previews_enabled\": true}"

:: ============================================
:: STEP 6: RUN MIGRATIONS + CREATE ADMIN USER
:: ============================================
echo.
echo ========================================
echo Running Database Migrations
echo ========================================

set "SEED_SQL=PRAGMA foreign_keys = OFF; CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(category, key)); CREATE TABLE IF NOT EXISTS agents_online (id INTEGER PRIMARY KEY CHECK (id = 1), count INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS teams (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL, manager_id VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS email_addresses (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, label TEXT NOT NULL, action TEXT NOT NULL, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, signature TEXT, language TEXT); CREATE TABLE IF NOT EXISTS push_subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT UNIQUE NOT NULL, keys TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT DEFAULT 'agent', password_hash TEXT NOT NULL, permissions TEXT DEFAULT '[\"read\",\"write\"]', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, allowed_emails TEXT DEFAULT '[]', updated_at TEXT, allowed_languages TEXT DEFAULT '[\"en\"]', team_id VARCHAR(50), page_permissions TEXT DEFAULT '{}', allowed_categories JSON, active INTEGER DEFAULT 1); CREATE TABLE IF NOT EXISTS newsletter_subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'active', subscribed_at TEXT, unsubscribed_at TEXT, language TEXT DEFAULT 'en'); CREATE TABLE IF NOT EXISTS newsletters (id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', sent_at TEXT, recipient_count INTEGER DEFAULT 0, created_at TEXT NOT NULL, language TEXT DEFAULT 'en'); CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))); CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_number TEXT UNIQUE NOT NULL, external_ref TEXT, category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', priority TEXT DEFAULT 'medium', sender_name TEXT, sender_email TEXT NOT NULL, subject TEXT, message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, sla_response_due DATETIME, sla_resolution_due DATETIME, assigned_to TEXT, metadata TEXT, last_action DATETIME, language TEXT DEFAULT 'unknown', sender_phone TEXT, order_number TEXT, last_updated_by TEXT); CREATE TABLE IF NOT EXISTS ticket_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, comment_type TEXT NOT NULL, author_email TEXT, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, new_status TEXT, old_status TEXT, FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE); CREATE TABLE IF NOT EXISTS ticket_summary (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER UNIQUE NOT NULL, ticket_number TEXT NOT NULL, status TEXT NOT NULL, category TEXT NOT NULL, language TEXT NOT NULL, subject TEXT NOT NULL, sender_email TEXT NOT NULL, created_at DATETIME NOT NULL, last_action DATETIME NOT NULL, sla_status TEXT NOT NULL DEFAULT 'on_track', priority TEXT NOT NULL DEFAULT 'medium', FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE); CREATE TABLE IF NOT EXISTS unsubscribe_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, subscriber_id INTEGER NOT NULL UNIQUE REFERENCES newsletter_subscribers(id), token TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('system','ticket_cache_key','ticket-list'),('system','jwt_expiry_seconds','86400'),('system','lock_timeout_write_ms','45000'),('system','lock_timeout_read_ms','30000'),('system','lock_cleanup_interval_ms','15000'),('system','login_max_attempts','5'),('system','login_ratelimit_window_ms','300000'),('system','cors_allowed_origins','https://dornori.com,https://www.dornori.com,https://dornori.github.io,https://dornori-ticketing.dornori-info.workers.dev'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('security','password_min_length','12'),('security','password_reset_expiry_minutes','15'),('security','password_blocklist','password,123456,12345678,qwerty,abc123,password123,admin,letmein,welcome,monkey,dragon,master,hello,fuckyou,superman,123456789,12345,1234567890,qwertyuiop,qwerty123,1q2w3e4r,password1,123321,111111,000000,abcdef,abcd1234,iloveyou,trustno1,sunshine,princess,shadow,ashley,bailey,passw0rd,admin123,root,toor'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('tickets','newsletter_batch_size','10'),('tickets','ticket_sequence_max','999999'),('tickets','email_body_max_length','15000'),('tickets','ticket_active_statuses','new,open,in_progress,pending'),('tickets','reply_delimiter','\u0001'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('general','domain','dornori.com'),('general','app_basedir',''),('general','script_url','https://script.google.com/macros/s/AKfycbze4FmS48tbSYaTN2JvEB9Gmha8OgcKMKtf57D6XeK7X4x-pYfgMZJipU10pyGmhm_P/exec'),('general','email_script_username','dornori'),('general','products_data_base_url',''),('general','products_images_base_url',''),('general','default_language','en'),('general','config_version','1'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('email','default_from','support@dornori.com'),('email','password_reset_from','support@dornori.com'); INSERT OR IGNORE INTO agents_online (id, count) VALUES (1, 0); PRAGMA foreign_keys = ON;"

powershell -NoProfile -Command ^
    "$sql = $env:SEED_SQL; " ^
    "$json = @{ sql = $sql } | ConvertTo-Json -Compress; " ^
    "[System.IO.File]::WriteAllText('%TEMP%\migrate.json', $json)"

curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database/%DB_ID%/query" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "@%TEMP%\migrate.json" > "%TEMP%\migrate_result.json"

findstr /C:"\"success\":true" "%TEMP%\migrate_result.json" >nul
if errorlevel 1 (
    echo ERROR: Migration failed.
    type "%TEMP%\migrate_result.json"
    pause
    exit
)
echo OK: Database migrations completed.

:: ============================================
:: CREATE INITIAL ADMIN USER
:: ============================================
echo.
echo ========================================
echo INITIAL ADMIN USER SETUP
echo ========================================
echo.
set /p ADMIN_EMAIL="Admin Email [admin@dornori.com]: "
set /p ADMIN_NAME="Admin Name [Administrator]: "
set /p ADMIN_PASSWORD="Admin Password (min 12 chars): "

if "%ADMIN_EMAIL%"=="" set ADMIN_EMAIL=admin@dornori.com
if "%ADMIN_NAME%"=="" set ADMIN_NAME=Administrator
if "%ADMIN_PASSWORD%"=="" (
    echo ERROR: Password cannot be empty.
    pause
    exit
)

:: Generate SHA256 hash
powershell -NoProfile -Command ^
    "$pass = '%ADMIN_PASSWORD%'; " ^
    "$sha = [System.Security.Cryptography.SHA256]::Create(); " ^
    "$bytes = [System.Text.Encoding]::UTF8.GetBytes($pass); " ^
    "$hash = $sha.ComputeHash($bytes); " ^
    "$hashStr = [System.BitConverter]::ToString($hash) -replace '-', ''; " ^
    "$hashStr | Out-File -Encoding ascii '%TEMP%\password_hash.txt'"

for /f "delims=" %%i in (%TEMP%\password_hash.txt) do set "PASSWORD_HASH=%%i"

set "ADMIN_SQL=INSERT OR IGNORE INTO users (email, name, role, password_hash, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions, active) VALUES ('%ADMIN_EMAIL%', '%ADMIN_NAME%', 'admin', '%PASSWORD_HASH%', '[\"en\"]', '[]', '[]', NULL, '{}', 1);"

powershell -NoProfile -Command ^
    "$sql = $env:ADMIN_SQL; " ^
    "$json = @{ sql = $sql } | ConvertTo-Json -Compress; " ^
    "[System.IO.File]::WriteAllText('%TEMP%\admin.json', $json)"

curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database/%DB_ID%/query" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "@%TEMP%\admin.json" > "%TEMP%\admin_result.json"

findstr /C:"\"success\":true" "%TEMP%\admin_result.json" >nul
if errorlevel 1 (
    echo WARNING: Admin user may not have been created.
) else (
    echo.
    echo ========================================
    echo ADMIN ACCOUNT CREATED SUCCESSFULLY!
    echo ========================================
    echo Email: %ADMIN_EMAIL%
    echo Password: %ADMIN_PASSWORD%
    echo Role: admin
    echo.
    echo Please save these credentials immediately!
    echo ========================================
)

:: ============================================
:: FINALIZE
:: ============================================
echo.
echo Fetching subdomain...
curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/subdomain" -H "Authorization: Bearer %API_TOKEN%" > "%TEMP%\subdomain.json"
for /f %%i in ('powershell -Command "(Get-Content \"%TEMP%\subdomain.json\" -Raw | ConvertFrom-Json).result.subdomain"') do set "SUBDOMAIN=%%i"

echo {"API_BASE": "https://%WORKER_NAME%.%SUBDOMAIN%.workers.dev"} > config.json

echo.
echo ========================================
echo INSTALLATION COMPLETE!
echo ========================================
echo Worker URL: https://%WORKER_NAME%.%SUBDOMAIN%.workers.dev
echo Config file: config.json created
echo.
pause
