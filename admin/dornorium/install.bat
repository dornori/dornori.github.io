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
:: STEP 1B: SITE CONFIGURATION
:: ============================================
echo.
set /p SITE_DOMAIN="Your domain (e.g. example.com): "
set /p SUPPORT_EMAIL="Support/from email address [support@%SITE_DOMAIN%]: "
if "%SUPPORT_EMAIL%"=="" set SUPPORT_EMAIL=support@%SITE_DOMAIN%
set /p SCRIPT_URL="Google Apps Script URL (optional, press Enter to skip): "

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

echo Fetching subdomain...
curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/subdomain" -H "Authorization: Bearer %API_TOKEN%" > "%TEMP%\subdomain.json"
for /f %%i in ('powershell -Command "(Get-Content \"%TEMP%\subdomain.json\" -Raw | ConvertFrom-Json).result.subdomain"') do set "SUBDOMAIN=%%i"
set "WORKER_URL=https://%WORKER_NAME%.%SUBDOMAIN%.workers.dev"

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
:: STEP 5B: CORS ENFORCEMENT
:: ============================================
echo.
echo ========================================
echo CORS ENFORCEMENT
echo ========================================
echo.
echo By default CORS enforcement is DISABLED so that login cannot be
echo accidentally locked out by a misconfigured domain list.
echo.
set "CORS_ENABLED=0"
set /p ENABLE_CORS="Enable CORS enforcement now? (y/N): "
if /i "%ENABLE_CORS%"=="Y" (
    echo.
    echo ****************************************************************
    echo  WARNING: If the domains below are wrong, incomplete, or you
    echo  later change your site domain without updating this list,
    echo  YOU AND ALL USERS WILL BE UNABLE TO LOG IN.
    echo  Allowed origins will be set to:
    echo    https://%SITE_DOMAIN%
    echo    https://www.%SITE_DOMAIN%
    echo    %WORKER_URL%
    echo ****************************************************************
    echo.
    set /p CORS_CONFIRM="Are you certain you want to enable CORS? (y/N): "
    if /i "!CORS_CONFIRM!"=="Y" (
        set "CORS_ENABLED=1"
        echo OK: CORS enforcement will be enabled.
    ) else (
        set "CORS_ENABLED=0"
        echo CORS enforcement NOT enabled. Allowed-origins values are still saved for later use.
    )
) else (
    echo CORS enforcement left disabled.
)

:: ============================================
:: STEP 5C: RATE LIMITING
:: ============================================
echo.
echo ========================================
echo LOGIN RATE LIMITING
echo ========================================
echo.
echo Rate limiting is enabled by default to protect against brute-force
echo login attempts. It does not risk locking legitimate users out.
echo.
set "RATE_LIMIT_ENABLED=1"
set /p DISABLE_RL="Disable login rate limiting? (y/N): "
if /i "%DISABLE_RL%"=="Y" (
    set "RATE_LIMIT_ENABLED=0"
    echo Rate limiting disabled.
) else (
    echo OK: Rate limiting will remain enabled.
)

:: ============================================
:: STEP 6: RUN MIGRATIONS + CREATE ADMIN USER
:: ============================================
echo.
echo ========================================
echo Running Database Migrations
echo ========================================

set "SEED_SQL=PRAGMA foreign_keys = OFF; CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(category, key)); CREATE TABLE IF NOT EXISTS agents_online (id INTEGER PRIMARY KEY CHECK (id = 1), count INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS teams (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100) NOT NULL, manager_id VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS email_addresses (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, label TEXT NOT NULL, action TEXT NOT NULL, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, signature TEXT, language TEXT); CREATE TABLE IF NOT EXISTS push_subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT UNIQUE NOT NULL, keys TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT DEFAULT 'agent', password_hash TEXT NOT NULL, permissions TEXT DEFAULT '["read","write"]', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, allowed_emails TEXT DEFAULT '[]', updated_at TEXT, allowed_languages TEXT DEFAULT '["en"]', team_id VARCHAR(50), page_permissions TEXT DEFAULT '{}', allowed_categories TEXT DEFAULT '[]', active INTEGER DEFAULT 1); CREATE TABLE IF NOT EXISTS newsletter_subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'active', subscribed_at TEXT, unsubscribed_at TEXT, language TEXT DEFAULT 'en'); CREATE TABLE IF NOT EXISTS newsletters (id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', sent_at TEXT, recipient_count INTEGER DEFAULT 0, created_at TEXT NOT NULL, language TEXT DEFAULT 'en'); CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))); CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_number TEXT UNIQUE NOT NULL, external_ref TEXT, category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', priority TEXT DEFAULT 'medium', sender_name TEXT, sender_email TEXT NOT NULL, subject TEXT, message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, sla_response_due DATETIME, sla_resolution_due DATETIME, assigned_to TEXT, metadata TEXT, last_action DATETIME, language TEXT DEFAULT 'unknown', sender_phone TEXT, order_number TEXT, last_updated_by TEXT); CREATE TABLE IF NOT EXISTS ticket_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, comment_type TEXT NOT NULL, author_email TEXT, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, new_status TEXT, old_status TEXT, FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE); CREATE TABLE IF NOT EXISTS ticket_summary (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER UNIQUE NOT NULL, ticket_number TEXT NOT NULL, status TEXT NOT NULL, category TEXT NOT NULL, language TEXT NOT NULL, subject TEXT NOT NULL, sender_email TEXT NOT NULL, created_at DATETIME NOT NULL, last_action DATETIME NOT NULL, sla_status TEXT NOT NULL DEFAULT 'on_track', priority TEXT NOT NULL DEFAULT 'medium', FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE); CREATE TABLE IF NOT EXISTS unsubscribe_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, subscriber_id INTEGER NOT NULL UNIQUE REFERENCES newsletter_subscribers(id), token TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('system','ticket_cache_key','ticket-list'),('system','jwt_expiry_seconds','86400'),('system','lock_timeout_write_ms','45000'),('system','lock_timeout_read_ms','30000'),('system','lock_cleanup_interval_ms','15000'),('system','login_max_attempts','5'),('system','login_ratelimit_window_ms','300000'),('system','cors_allowed_origins','https://%SITE_DOMAIN%,https://www.%SITE_DOMAIN%,%WORKER_URL%'),('system','cors_enabled','%CORS_ENABLED%'),('system','rate_limit_enabled','%RATE_LIMIT_ENABLED%'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('security','password_min_length','12'),('security','password_reset_expiry_minutes','15'),('security','password_blocklist','password,123456,12345678,qwerty,abc123,password123,admin,letmein,welcome,monkey,dragon,master,hello,fuckyou,superman,123456789,12345,1234567890,qwertyuiop,qwerty123,1q2w3e4r,password1,123321,111111,000000,abcdef,abcd1234,iloveyou,trustno1,sunshine,princess,shadow,ashley,bailey,passw0rd,admin123,root,toor'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('tickets','newsletter_batch_size','10'),('tickets','ticket_sequence_max','999999'),('tickets','email_body_max_length','15000'),('tickets','ticket_active_statuses','new,open,in_progress,pending'),('tickets','reply_delimiter','\u0001'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('general','domain','%SITE_DOMAIN%'),('general','app_basedir',''),('general','script_url','%SCRIPT_URL%'),('general','products_data_base_url',''),('general','products_images_base_url',''),('general','default_language','en'),('general','config_version','1'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('email','default_from','%SUPPORT_EMAIL%'),('email','password_reset_from','%SUPPORT_EMAIL%'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('category','business_description','Business'),('category','general_description','General'),('category','info_description','Info'),('category','legal_description','Legal'),('category','newsletter_description','Newsletter'),('category','no_reply_description','No-Reply'),('category','other_description','Other'),('category','payment_description','Payment'),('category','press_description','Press'),('category','privacy_description','Privacy'),('category','support_description','Support'),('category','unclassified_description','Unclassified'); INSERT OR IGNORE INTO settings (category, key, value) VALUES ('category','business_color','#3b82f6'),('category','general_color','#6b7280'),('category','info_color','#06b6d4'),('category','legal_color','#8b5cf6'),('category','newsletter_color','#ec4899'),('category','no_reply_color','#64748b'),('category','other_color','#9ca3af'),('category','payment_color','#10b981'),('category','press_color','#6366f1'),('category','privacy_color','#a78bfa'),('category','support_color','#f97316'),('category','unclassified_color','#8892b0'); INSERT OR IGNORE INTO agents_online (id, count) VALUES (1, 0); PRAGMA foreign_keys = ON;"

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
set /p ADMIN_EMAIL="Admin Email [admin@%SITE_DOMAIN%]: "
set /p ADMIN_NAME="Admin Name [Administrator]: "
if "%ADMIN_EMAIL%"=="" set ADMIN_EMAIL=admin@%SITE_DOMAIN%
if "%ADMIN_NAME%"=="" set ADMIN_NAME=Administrator

:ADMIN_PW_PROMPT
del "%TEMP%\admin_pw.txt" 2>nul
powershell -NoProfile -Command ^
    "$p1 = Read-Host -AsSecureString 'Admin Password (min 12 chars)'; " ^
    "$p2 = Read-Host -AsSecureString 'Confirm Password'; " ^
    "$b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1); " ^
    "$b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2); " ^
    "$t1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1); " ^
    "$t2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2); " ^
    "if ($t1 -ne $t2 -or $t1.Length -lt 12) { exit 1 } else { $t1 | Out-File -Encoding utf8 '%TEMP%\admin_pw.txt'; exit 0 }"
if errorlevel 1 (
    echo Passwords did not match or were too short. Try again.
    goto ADMIN_PW_PROMPT
)
set /p ADMIN_PASSWORD=<"%TEMP%\admin_pw.txt"

:: Generate SHA256 hash
powershell -NoProfile -Command ^
    "$pass = '%ADMIN_PASSWORD%'; " ^
    "$sha = [System.Security.Cryptography.SHA256]::Create(); " ^
    "$bytes = [System.Text.Encoding]::UTF8.GetBytes($pass); " ^
    "$hash = $sha.ComputeHash($bytes); " ^
    "$hashStr = ([System.BitConverter]::ToString($hash) -replace '-', '').ToLower(); " ^
    "$hashStr | Out-File -Encoding ascii '%TEMP%\password_hash.txt'"

for /f "delims=" %%i in (%TEMP%\password_hash.txt) do set "PASSWORD_HASH=%%i"

set "ADMIN_SQL=INSERT OR IGNORE INTO users (email, name, role, password_hash, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions, active) VALUES ('%ADMIN_EMAIL%', '%ADMIN_NAME%', 'admin', '%PASSWORD_HASH%', '["en"]', '[]', '[]', NULL, '{"tickets":{"read":true,"write":true},"users":{"read":true,"write":true},"settings":{"read":true,"write":true},"newsletter":{"read":true,"write":true},"reports":{"read":true,"write":true},"order_reply":{"read":true,"write":true}}', 1);"

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
:: OPTIONAL: EMAIL SENDING CREDENTIALS
:: ============================================
echo.
set /p CONFIG_EMAIL="Configure outgoing email credentials now? (y/N): "
if /i "%CONFIG_EMAIL%"=="Y" (
    set /p EMAIL_USERNAME="Email Username: "

    :EMAIL_PW_PROMPT
    del "%TEMP%\email_pw.txt" 2>nul
    powershell -NoProfile -Command ^
        "$p1 = Read-Host -AsSecureString 'Email Password'; " ^
        "$p2 = Read-Host -AsSecureString 'Confirm Email Password'; " ^
        "$b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1); " ^
        "$b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2); " ^
        "$t1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1); " ^
        "$t2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2); " ^
        "if ($t1 -ne $t2) { exit 1 } else { $t1 | Out-File -Encoding utf8 '%TEMP%\email_pw.txt'; exit 0 }"
    if errorlevel 1 (
        echo Passwords did not match. Try again.
        goto EMAIL_PW_PROMPT
    )
    set /p EMAIL_PASSWORD=<"%TEMP%\email_pw.txt"

    :EMAIL_SECRET_PROMPT
    del "%TEMP%\email_secret.txt" 2>nul
    powershell -NoProfile -Command ^
        "$p1 = Read-Host -AsSecureString 'Email Secret'; " ^
        "$p2 = Read-Host -AsSecureString 'Confirm Email Secret'; " ^
        "$b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1); " ^
        "$b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2); " ^
        "$t1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1); " ^
        "$t2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2); " ^
        "if ($t1 -ne $t2) { exit 1 } else { $t1 | Out-File -Encoding utf8 '%TEMP%\email_secret.txt'; exit 0 }"
    if errorlevel 1 (
        echo Secrets did not match. Try again.
        goto EMAIL_SECRET_PROMPT
    )
    set /p EMAIL_SECRET=<"%TEMP%\email_secret.txt"

    set "EMAIL_USERNAME_ENV=%EMAIL_USERNAME%"
    set "EMAIL_PASSWORD_ENV=%EMAIL_PASSWORD%"
    set "EMAIL_SECRET_ENV=%EMAIL_SECRET%"
    set "ADMIN_EMAIL_ENV=%ADMIN_EMAIL%"
    set "ADMIN_PASSWORD_ENV=%ADMIN_PASSWORD%"
    set "WORKER_URL_ENV=%WORKER_URL%"

    echo Saving encrypted email credentials...
    powershell -NoProfile -Command ^
        "$ErrorActionPreference = 'Stop'; " ^
        "try { " ^
        "  $loginBody = @{ email = $env:ADMIN_EMAIL_ENV; password = $env:ADMIN_PASSWORD_ENV } | ConvertTo-Json; " ^
        "  $login = Invoke-RestMethod -Uri ($env:WORKER_URL_ENV + '/api/admin/login') -Method Post -ContentType 'application/json' -Body $loginBody; " ^
        "  $token = $login.token; " ^
        "  $hdr = @{ Authorization = 'Bearer ' + $token }; " ^
        "  $encPwBody = @{ value = $env:EMAIL_PASSWORD_ENV } | ConvertTo-Json; " ^
        "  $encPw = Invoke-RestMethod -Uri ($env:WORKER_URL_ENV + '/api/admin/setup/encrypt') -Method Post -ContentType 'application/json' -Headers $hdr -Body $encPwBody; " ^
        "  $encSecretBody = @{ value = $env:EMAIL_SECRET_ENV } | ConvertTo-Json; " ^
        "  $encSecret = Invoke-RestMethod -Uri ($env:WORKER_URL_ENV + '/api/admin/setup/encrypt') -Method Post -ContentType 'application/json' -Headers $hdr -Body $encSecretBody; " ^
        "  $settingsBody = @{ settings = @( " ^
        "      @{ category='email_script'; key='username'; value=$env:EMAIL_USERNAME_ENV }, " ^
        "      @{ category='email_script'; key='password'; value=$encPw.encrypted }, " ^
        "      @{ category='email_script'; key='secret'; value=$encSecret.encrypted } " ^
        "  ) } | ConvertTo-Json -Depth 5; " ^
        "  Invoke-RestMethod -Uri ($env:WORKER_URL_ENV + '/api/admin/settings') -Method Put -ContentType 'application/json' -Headers $hdr -Body $settingsBody | Out-Null; " ^
        "  Write-Host 'OK: Email credentials saved.'; " ^
        "} catch { " ^
        "  Write-Host ('ERROR: ' + $_.Exception.Message); " ^
        "}"
)

:: ============================================
:: FINALIZE
:: ============================================
echo {"API_BASE": "%WORKER_URL%"} > config.json

echo.
echo ========================================
echo INSTALLATION COMPLETE!
echo ========================================
echo Worker URL: %WORKER_URL%
echo Config file: config.json created
echo.
pause