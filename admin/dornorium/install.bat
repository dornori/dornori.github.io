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
set /p SUPPORT_EMAIL="Support/from email address [support@%SITE_DOMAIN%]: "
if "%SUPPORT_EMAIL%"=="" set SUPPORT_EMAIL=support@%SITE_DOMAIN%
set /p SCRIPT_URL="Google Apps Script URL (optional, press Enter to skip): "

echo.
echo === Email Sending Credentials ===
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
set /p ENABLE_CORS="Enable CORS enforcement? (y/N): "
if /i "%ENABLE_CORS%"=="Y" set "CORS_ENABLED=1"

set "RATE_LIMIT_ENABLED=1"
set /p DISABLE_RL="Disable login rate limiting? (y/N): "
if /i "%DISABLE_RL%"=="Y" set "RATE_LIMIT_ENABLED=0"

echo.
echo === Admin Account ===
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

:: CRITICAL: Load the admin password from the temp file
set /p ADMIN_PASSWORD=<"%TEMP%\admin_pw.txt"

:: ============================================
:: INSTALLATION STARTS
:: ============================================

echo.
echo Creating resources...
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/storage/kv/namespaces" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"title\":\"%WORKER_NAME%_kv\"}" > "%TEMP%\kv.json"

if "%JURISDICTION%"=="" (
    curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"%WORKER_NAME%_db\"}" > "%TEMP%\db.json"
) else (
    curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"%WORKER_NAME%_db\", \"jurisdiction\":\"%JURISDICTION%\"}" > "%TEMP%\db.json"
)

for /f %%i in ('powershell -Command "(Get-Content \"%TEMP%\kv.json\" -Raw | ConvertFrom-Json).result.id"') do set "KV_ID=%%i"
for /f %%i in ('powershell -Command "(Get-Content \"%TEMP%\db.json\" -Raw | ConvertFrom-Json).result.uuid"') do set "DB_ID=%%i"

if "%KV_ID%"=="" (echo ERROR: KV creation failed. & pause & exit)
if "%DB_ID%"=="" (echo ERROR: D1 creation failed. & pause & exit)

echo KV_ID: %KV_ID%
echo DB_ID: %DB_ID%

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


echo Enabling subdomain...
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/subdomain" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"enabled\": true, \"previews_enabled\": true}"


echo Fetching subdomain...
curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/subdomain" -H "Authorization: Bearer %API_TOKEN%" > "%TEMP%\subdomain.json"
for /f %%i in ('powershell -Command "(Get-Content \"%TEMP%\subdomain.json\" -Raw | ConvertFrom-Json).result.subdomain"') do set "SUBDOMAIN=%%i"
set "WORKER_URL=https://%WORKER_NAME%.%SUBDOMAIN%.workers.dev"



:: Secrets
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
:: FINAL ACTIVATION / WARMUP - Wait for 200
:: ============================================

echo.
echo Warming up Cloudflare Worker...
echo Waiting for /api/admin/config-version to return 200...

set "MAX_RETRIES=10"
set "RETRY=0"
set "SUCCESS=0"

:WAIT_LOOP
set /a RETRY+=1

for /f %%i in ('curl -s -w "%%{http_code}" -o nul %WORKER_URL%/api/admin/config-version 2^>nul') do set "HTTP_CODE=%%i"

echo Attempt !RETRY!/!MAX_RETRIES! - Status: !HTTP_CODE!

if "!HTTP_CODE!"=="200" (
    echo.
    echo SUCCESS: Worker is ready ^(200 OK^)!
    set "SUCCESS=1"
    goto WAIT_DONE
)

if !RETRY! LSS !MAX_RETRIES! (
    timeout /t 3 >nul
    goto WAIT_LOOP
)

:WAIT_DONE
if "!SUCCESS!"=="0" (
    echo.
    echo WARNING: Worker did not return 200 after !MAX_RETRIES! attempts.
    echo It might still be starting up or have an error.
    echo Check Cloudflare dashboard ^→ Workers ^→ Logs for details.
    pause
)

:: Admin User
echo.
echo Creating Admin User...
powershell -NoProfile -Command ^
    "$pass = Get-Content -Path '%TEMP%\admin_pw.txt' -Raw -Encoding UTF8; " ^
    "$pass = $pass.Trim(); " ^
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
if /i "%CONFIG_EMAIL%"=="Y" (
    set "EMAIL_USERNAME_ENV=%EMAIL_USERNAME%"
    set "EMAIL_PASSWORD_ENV=%EMAIL_PASSWORD%"
    set "EMAIL_SECRET_ENV=%EMAIL_SECRET%"
    set "ADMIN_EMAIL_ENV=%ADMIN_EMAIL%"
    set "ADMIN_PASSWORD_ENV=%ADMIN_PASSWORD%"
    set "WORKER_URL_ENV=%WORKER_URL%"

    echo.
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
:: OFFER CONFIG.JSON AS DOWNLOAD
:: ============================================
:: Create the config content
set "CONFIG_CONTENT={\"API_BASE\": \"%WORKER_URL%\"}"

:: Write simple HTML using echo with minimal special characters
echo ^<html^>^<body^>^<script^> > "%TEMP%\download_config.html" 2>nul
echo var configData = '%CONFIG_CONTENT%'; >> "%TEMP%\download_config.html" 2>nul
echo var blob = new Blob([configData], {type: 'application/json'}); >> "%TEMP%\download_config.html" 2>nul
echo var url = window.URL.createObjectURL(blob); >> "%TEMP%\download_config.html" 2>nul
echo var a = document.createElement('a'); >> "%TEMP%\download_config.html" 2>nul
echo a.href = url; >> "%TEMP%\download_config.html" 2>nul
echo a.download = 'config.json'; >> "%TEMP%\download_config.html" 2>nul
echo document.body.appendChild(a); >> "%TEMP%\download_config.html" 2>nul
echo a.click(); >> "%TEMP%\download_config.html" 2>nul
echo document.write('Download started! If it didn\'t work, right-click and save as...'); >> "%TEMP%\download_config.html" 2>nul
echo ^</script^>^</body^>^</html^> >> "%TEMP%\download_config.html" 2>nul

:: Open in browser
start "" "%TEMP%\download_config.html" >nul 2>&1
echo.
echo ========================================
echo INSTALLATION COMPLETE!
echo ========================================
echo Worker URL: %WORKER_URL%
echo.
echo A browser window opened - config.json should download automatically.
echo If not, right-click the page and select "Save As..."
echo.
pause >nul