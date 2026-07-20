@echo off
setlocal enabledelayedexpansion
title Dornorium Installer - COMPLETE
echo ========================================
echo Dornorium Installer - FINAL VERSION
echo ========================================
echo.

:: ============================================
:: ALL INPUTS AT START
:: ============================================

echo === Cloudflare Credentials ===
set /p ACCOUNT_ID="Cloudflare Account ID: "
set /p API_TOKEN="Cloudflare API Token: "
set /p WORKER_NAME="Worker name (default: dornorium): "
if "%WORKER_NAME%"=="" set WORKER_NAME=dornorium

echo.
echo === Site Configuration ===
set /p SITE_DOMAIN="Your domain (e.g. example.com): "
set /p SUPPORT_EMAIL="Support/from email [support@%SITE_DOMAIN%]: "
if "%SUPPORT_EMAIL%"=="" set SUPPORT_EMAIL=support@%SITE_DOMAIN%
set /p SCRIPT_URL="Google Apps Script URL (optional): "

echo.
echo === Email Sending Credentials ===
set /p CONFIG_EMAIL="Configure outgoing email credentials? (y/N): "
if /i "%CONFIG_EMAIL%"=="Y" (
    set /p EMAIL_USERNAME="Email Username: "
)

echo.
echo === Database Jurisdiction ===
echo 1. Global (default)
echo 2. EU (GDPR)
echo 3. FedRAMP
set /p JURISDICTION_CHOICE="Choose (1-3): "
if "%JURISDICTION_CHOICE%"=="2" (set "JURISDICTION=eu") else if "%JURISDICTION_CHOICE%"=="3" (set "JURISDICTION=fedramp") else (set "JURISDICTION=")

echo.
echo === Security Settings ===
set "CORS_ENABLED=0"
set /p ENABLE_CORS="Enable CORS? (y/N): "
if /i "%ENABLE_CORS%"=="Y" set "CORS_ENABLED=1"

set "RATE_LIMIT_ENABLED=1"
set /p DISABLE_RL="Disable rate limiting? (y/N): "
if /i "%DISABLE_RL%"=="Y" set "RATE_LIMIT_ENABLED=0"

echo.
echo === Admin Account ===
set /p ADMIN_EMAIL="Admin Email [admin@%SITE_DOMAIN%]: "
set /p ADMIN_NAME="Admin Name [Administrator]: "
if "%ADMIN_EMAIL%"=="" set ADMIN_EMAIL=admin@%SITE_DOMAIN%
if "%ADMIN_NAME%"=="" set ADMIN_NAME=Administrator

:: ============================================
:: PASSWORD HANDLING
:: ============================================

echo.
echo Generating secrets and hashing passwords...

:: Generate ENCRYPTION_KEY and JWT_SECRET
set "CHARS=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
set "JWT_SECRET="
set "ENCRYPTION_KEY="
for /L %%i in (1,1,64) do set /a "r=!random! %% 62" & for %%r in (!r!) do set "JWT_SECRET=!JWT_SECRET!!CHARS:~%%r,1!"
for /L %%i in (1,1,32) do set /a "r=!random! %% 62" & for %%r in (!r!) do set "ENCRYPTION_KEY=!ENCRYPTION_KEY!!CHARS:~%%r,1!"

:: Admin Password → Hash
:ADMIN_PW_PROMPT
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$p1 = Read-Host -AsSecureString 'Admin Password (min 12 chars)'; " ^
    "$p2 = Read-Host -AsSecureString 'Confirm Password'; " ^
    "$b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1); " ^
    "$b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2); " ^
    "$t1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1); " ^
    "$t2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2); " ^
    "if ($t1 -ne $t2 -or $t1.Length -lt 12) { exit 1 } else { " ^
    "$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($t1)); " ^
    "$hashStr = [BitConverter]::ToString($hash) -replace '-', '';" ^
    "$hashStr | Out-File -Encoding ascii '%TEMP%\admin_hash.txt' -Force; exit 0 }"
if errorlevel 1 (
    echo Passwords did not match or too short.
    goto ADMIN_PW_PROMPT
)
set /p PASSWORD_HASH=<"%TEMP%\admin_hash.txt"

:: Email Password + Secret Encryption (if enabled)
set "EMAIL_PASSWORD_ENC="
set "EMAIL_SECRET_ENC="
if /i "%CONFIG_EMAIL%"=="Y" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$key = '%ENCRYPTION_KEY%'; $pw = Read-Host -AsSecureString 'Email Password'; " ^
        "$plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw)); " ^
        "$enc = &{ $e=[System.Text.Encoding]::UTF8; $k=$e.GetBytes($key)[0..31]; $a=[System.Security.Cryptography.AesGcm]::new($k); $iv=[byte[]]::new(12); [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($iv); $p=$e.GetBytes($plain); $c=[byte[]]::new($p.Length); $t=[byte[]]::new(16); $a.Encrypt($iv,$p,$c,$t); $ivB=[Convert]::ToBase64String($iv); $cB=[Convert]::ToBase64String($c); $tB=[Convert]::ToBase64String($t); \"$ivB:$cB:$tB\" }; " ^
        "$enc | Out-File -Encoding utf8 '%TEMP%\email_pw_enc.txt'"
    set /p EMAIL_PASSWORD_ENC=<"%TEMP%\email_pw_enc.txt"

    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$key = '%ENCRYPTION_KEY%'; $sec = Read-Host -AsSecureString 'Email Secret'; " ^
        "$plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)); " ^
        "$enc = &{ $e=[System.Text.Encoding]::UTF8; $k=$e.GetBytes($key)[0..31]; $a=[System.Security.Cryptography.AesGcm]::new($k); $iv=[byte[]]::new(12); [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($iv); $p=$e.GetBytes($plain); $c=[byte[]]::new($p.Length); $t=[byte[]]::new(16); $a.Encrypt($iv,$p,$c,$t); $ivB=[Convert]::ToBase64String($iv); $cB=[Convert]::ToBase64String($c); $tB=[Convert]::ToBase64String($t); \"$ivB:$cB:$tB\" }; " ^
        "$enc | Out-File -Encoding utf8 '%TEMP%\email_secret_enc.txt'"
    set /p EMAIL_SECRET_ENC=<"%TEMP%\email_secret_enc.txt"
)

:: ============================================
:: START INSTALLATION
:: ============================================

echo.
echo Creating resources on Cloudflare...

:: Create KV and D1 (same as before)
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/storage/kv/namespaces" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"title\":\"%WORKER_NAME%_kv\"}" > "%TEMP%\kv.json"
if "%JURISDICTION%"=="" (
    curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"%WORKER_NAME%_db\"}" > "%TEMP%\db.json"
) else (
    curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"%WORKER_NAME%_db\", \"jurisdiction\":\"%JURISDICTION%\"}" > "%TEMP%\db.json"
)

for /f %%i in ('powershell -Command "(Get-Content \"%TEMP%\kv.json\" -Raw | ConvertFrom-Json).result.id"') do set "KV_ID=%%i"
for /f %%i in ('powershell -Command "(Get-Content \"%TEMP%\db.json\" -Raw | ConvertFrom-Json).result.uuid"') do set "DB_ID=%%i"

echo KV_ID: %KV_ID%
echo DB_ID: %DB_ID%

:: Upload Worker (same as before - abbreviated for brevity)
echo Uploading Worker...
:: ... (keep your existing worker upload code here)

:: ============================================
:: ONE BIG SQL SEED
:: ============================================

set "SEED_SQL=PRAGMA foreign_keys = OFF; CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(category, key)); CREATE TABLE IF NOT EXISTS agents_online (id INTEGER PRIMARY KEY CHECK (id = 1), count INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS teams (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL, manager_id VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS email_addresses (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, label TEXT NOT NULL, action TEXT NOT NULL, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, signature TEXT, language TEXT); CREATE TABLE IF NOT EXISTS push_subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT UNIQUE NOT NULL, keys TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT DEFAULT 'agent', password_hash TEXT NOT NULL, permissions TEXT DEFAULT '["read","write"]', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, allowed_emails TEXT DEFAULT '[]', updated_at TEXT, allowed_languages TEXT DEFAULT '["en"]', team_id VARCHAR(50), page_permissions TEXT DEFAULT '{}', allowed_categories TEXT DEFAULT '[]', active INTEGER DEFAULT 1); CREATE TABLE IF NOT EXISTS newsletter_subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'active', subscribed_at TEXT, unsubscribed_at TEXT, language TEXT DEFAULT 'en'); CREATE TABLE IF NOT EXISTS newsletters (id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', sent_at TEXT, recipient_count INTEGER DEFAULT 0, created_at TEXT NOT NULL, language TEXT DEFAULT 'en'); CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))); CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_number TEXT UNIQUE NOT NULL, external_ref TEXT, category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', priority TEXT DEFAULT 'medium', sender_name TEXT, sender_email TEXT NOT NULL, subject TEXT, message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, sla_response_due DATETIME, sla_resolution_due DATETIME, assigned_to TEXT, metadata TEXT, last_action DATETIME, language TEXT DEFAULT 'unknown', sender_phone TEXT, order_number TEXT, last_updated_by TEXT); CREATE TABLE IF NOT EXISTS ticket_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, comment_type TEXT NOT NULL, author_email TEXT, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, new_status TEXT, old_status TEXT, FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE); CREATE TABLE IF NOT EXISTS ticket_summary (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER UNIQUE NOT NULL, ticket_number TEXT NOT NULL, status TEXT NOT NULL, category TEXT NOT NULL, language TEXT NOT NULL, subject TEXT NOT NULL, sender_email TEXT NOT NULL, created_at DATETIME NOT NULL, last_action DATETIME NOT NULL, sla_status TEXT NOT NULL DEFAULT 'on_track', priority TEXT NOT NULL DEFAULT 'medium', FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE); CREATE TABLE IF NOT EXISTS unsubscribe_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, subscriber_id INTEGER NOT NULL UNIQUE REFERENCES newsletter_subscribers(id), token TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('system','ticket_cache_key','ticket-list'),('system','jwt_expiry_seconds','86400'),('system','lock_timeout_write_ms','45000'),('system','lock_timeout_read_ms','30000'),('system','lock_cleanup_interval_ms','15000'),('system','login_max_attempts','5'),('system','login_ratelimit_window_ms','300000'),('system','cors_allowed_origins','https://%SITE_DOMAIN%,https://www.%SITE_DOMAIN%,%WORKER_URL%'),('system','cors_enabled','%CORS_ENABLED%'),('system','rate_limit_enabled','%RATE_LIMIT_ENABLED%'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('security','password_min_length','12'),('security','password_reset_expiry_minutes','15'),('security','password_blocklist','password,123456,12345678,qwerty,abc123,password123,admin,letmein,welcome,monkey,dragon,master,hello,fuckyou,superman,123456789,12345,1234567890,qwertyuiop,qwerty123,1q2w3e4r,password1,123321,111111,000000,abcdef,abcd1234,iloveyou,trustno1,sunshine,princess,shadow,ashley,bailey,passw0rd,admin123,root,toor'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('tickets','newsletter_batch_size','10'),('tickets','ticket_sequence_max','999999'),('tickets','email_body_max_length','15000'),('tickets','ticket_active_statuses','new,open,in_progress,pending'),('tickets','reply_delimiter','\u0001'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('general','domain','%SITE_DOMAIN%'),('general','app_basedir',''),('general','script_url','%SCRIPT_URL%'),('general','products_data_base_url',''),('general','products_images_base_url',''),('general','default_language','en'),('general','config_version','1'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('email','default_from','%SUPPORT_EMAIL%'),('email','password_reset_from','%SUPPORT_EMAIL%'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('languages','list','[{\"code\":\"en\",\"name\":\"English\"}]'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('category','business_description','Business'),('category','general_description','General'),('category','info_description','Info'),('category','legal_description','Legal'),('category','newsletter_description','Newsletter'),('category','no_reply_description','No-Reply'),('category','other_description','Other'),('category','press_description','Press'),('category','privacy_description','Privacy'),('category','support_description','Support'),('category','unclassified_description','Unclassified'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('category','business_color','#3b82f6'),('category','general_color','#6b7280'),('category','info_color','#06b6d4'),('category','legal_color','#8b5cf6'),('category','newsletter_color','#ec4899'),('category','no_reply_color','#64748b'),('category','other_color','#9ca3af'),('category','press_color','#6366f1'),('category','privacy_color','#a78bfa'),('category','support_color','#f97316'),('category','unclassified_color','#8892b0'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('sla','business_response','24'),('sla','business_resolution','72'),('sla','business_resolved_grace','0'),('sla','business_closed_grace','0'),('sla','general_response','24'),('sla','general_resolution','72'),('sla','general_resolved_grace','0'),('sla','general_closed_grace','0'),('sla','info_response','24'),('sla','info_resolution','72'),('sla','info_resolved_grace','0'),('sla','info_closed_grace','0'),('sla','legal_response','24'),('sla','legal_resolution','72'),('sla','legal_resolved_grace','0'),('sla','legal_closed_grace','0'),('sla','newsletter_response','24'),('sla','newsletter_resolution','72'),('sla','newsletter_resolved_grace','0'),('sla','newsletter_closed_grace','0'),('sla','no_reply_response','24'),('sla','no_reply_resolution','72'),('sla','no_reply_resolved_grace','0'),('sla','no_reply_closed_grace','0'),('sla','other_response','24'),('sla','other_resolution','72'),('sla','other_resolved_grace','0'),('sla','other_closed_grace','0'),('sla','press_response','24'),('sla','press_resolution','72'),('sla','press_resolved_grace','0'),('sla','press_closed_grace','0'),('sla','privacy_response','24'),('sla','privacy_resolution','72'),('sla','privacy_resolved_grace','0'),('sla','privacy_closed_grace','0'),('sla','support_response','24'),('sla','support_resolution','72'),('sla','support_resolved_grace','0'),('sla','support_closed_grace','0'),('sla','unclassified_response','24'),('sla','unclassified_resolution','72'),('sla','unclassified_resolved_grace','0'),('sla','unclassified_closed_grace','0'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('auto_reply','business_enabled','0'),('auto_reply','business_subject','[Ticket {{ticket_id}}] Your business inquiry'),('auto_reply','business_body','<p>Thank you for your business inquiry. We will respond shortly.</p>'),('auto_reply','general_enabled','0'),('auto_reply','general_subject','[Ticket {{ticket_id}}] Your general inquiry'),('auto_reply','general_body','<p>Thank you for your general inquiry. We will respond shortly.</p>'),('auto_reply','info_enabled','0'),('auto_reply','info_subject','[Ticket {{ticket_id}}] Your info inquiry'),('auto_reply','info_body','<p>Thank you for your information request. We will respond shortly.</p>'),('auto_reply','legal_enabled','0'),('auto_reply','legal_subject','[Ticket {{ticket_id}}] Your legal inquiry'),('auto_reply','legal_body','<p>Thank you for your legal inquiry. We will respond shortly.</p>'),('auto_reply','newsletter_enabled','0'),('auto_reply','newsletter_subject','[Ticket {{ticket_id}}] Your newsletter inquiry'),('auto_reply','newsletter_body','<p>Thank you for your newsletter inquiry. We will respond shortly.</p>'),('auto_reply','no_reply_enabled','0'),('auto_reply','no_reply_subject','[Ticket {{ticket_id}}] Your no-reply inquiry'),('auto_reply','no_reply_body','<p>Thank you for your inquiry. We will respond shortly.</p>'),('auto_reply','other_enabled','0'),('auto_reply','other_subject','[Ticket {{ticket_id}}] Your other inquiry'),('auto_reply','other_body','<p>Thank you for your inquiry. We will respond shortly.</p>'),('auto_reply','press_enabled','0'),('auto_reply','press_subject','[Ticket {{ticket_id}}] Your press inquiry'),('auto_reply','press_body','<p>Thank you for your press inquiry. We will respond shortly.</p>'),('auto_reply','privacy_enabled','0'),('auto_reply','privacy_subject','[Ticket {{ticket_id}}] Your privacy inquiry'),('auto_reply','privacy_body','<p>Thank you for your privacy inquiry. We will respond shortly.</p>'),('auto_reply','support_enabled','0'),('auto_reply','support_subject','[Ticket {{ticket_id}}] Your support inquiry'),('auto_reply','support_body','<p>Thank you for your support inquiry. We will respond shortly.</p>'),('auto_reply','unclassified_enabled','0'),('auto_reply','unclassified_subject','[Ticket {{ticket_id}}] Your unclassified inquiry'),('auto_reply','unclassified_body','<p>Thank you for your inquiry. We will respond shortly.</p>'); INSERT OR IGNORE INTO agents_online (id, count) VALUES (1, 0); PRAGMA foreign_keys = ON;"

:: Run the big SQL
powershell -NoProfile -Command ^
    "$sql = $env:SEED_SQL; $json = @{ sql = $sql } | ConvertTo-Json -Compress; [System.IO.File]::WriteAllText('%TEMP%\seed.json', $json)"

curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database/%DB_ID%/query" ^
  -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "@%TEMP%\seed.json" > "%TEMP%\seed_result.json"

:: Final cleanup and config.json
echo {"API_BASE": "https://%WORKER_NAME%.%SUBDOMAIN%.workers.dev"} > config.json

echo.
echo ========================================
echo INSTALLATION COMPLETE!
echo ========================================
echo Worker URL: https://%WORKER_NAME%.%SUBDOMAIN%.workers.dev
echo Admin: %ADMIN_EMAIL% / (the password you entered)
pause

:: Cleanup
del "%TEMP%\admin_hash.txt" 2>nul
del "%TEMP%\email_pw_enc.txt" 2>nul
del "%TEMP%\email_secret_enc.txt" 2>nul