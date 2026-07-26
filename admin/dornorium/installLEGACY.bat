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

echo.
echo === Google App Credentials ===
set /p CONFIG_GOOGLE="Configure Google App credentials now? (y/N): "
if /i "%CONFIG_GOOGLE%"=="Y" (
    set /p SCRIPT_URL="Google App Script URL: "
    set /p GOOGLE_USERNAME="Google App Username: "

    :GOOGLE_PW_PROMPT
    del "%TEMP%\google_pw.txt" 2>nul
    powershell -NoProfile -Command ^
        "$p1 = Read-Host -AsSecureString 'Google App Password'; " ^
        "$p2 = Read-Host -AsSecureString 'Confirm Google App Password'; " ^
        "$b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1); " ^
        "$b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2); " ^
        "$t1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1); " ^
        "$t2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2); " ^
        "if ($t1 -ne $t2) { exit 1 } else { $t1 | Out-File -Encoding ascii '%TEMP%\google_pw.txt'; exit 0 }"
    if errorlevel 1 (
        echo Passwords did not match. Try again.
        goto GOOGLE_PW_PROMPT
    )
    set /p GOOGLE_PASSWORD=<"%TEMP%\google_pw.txt"

    :GOOGLE_SECRET_PROMPT
    del "%TEMP%\google_secret.txt" 2>nul
    powershell -NoProfile -Command ^
        "$p1 = Read-Host -AsSecureString 'Google App Secret'; " ^
        "$p2 = Read-Host -AsSecureString 'Confirm Google App Secret'; " ^
        "$b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1); " ^
        "$b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2); " ^
        "$t1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1); " ^
        "$t2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2); " ^
        "if ($t1 -ne $t2) { exit 1 } else { $t1 | Out-File -Encoding ascii '%TEMP%\google_secret.txt'; exit 0 }"
    if errorlevel 1 (
        echo Secrets did not match. Try again.
        goto GOOGLE_SECRET_PROMPT
    )
    set /p GOOGLE_SECRET=<"%TEMP%\google_secret.txt"
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
    "if ($t1 -ne $t2 -or $t1.Length -lt 12) { exit 1 } else { $t1 | Out-File -Encoding ascii '%TEMP%\admin_pw.txt'; exit 0 }"
if errorlevel 1 (
    echo Passwords did not match or were too short. Try again.
    goto ADMIN_PW_PROMPT
)

:: Load admin password (NO BOM - using ascii encoding)
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

echo Uploading secrets...
echo {"name":"JWT_SECRET","text":"%JWT_SECRET%","type":"secret_text"} > "%TEMP%\jwt_secret.json"
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/secrets" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "@%TEMP%\jwt_secret.json" > nul

echo {"name":"ENCRYPTION_KEY","text":"%ENCRYPTION_KEY%","type":"secret_text"} > "%TEMP%\enc_key.json"
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/secrets" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "@%TEMP%\enc_key.json" > nul

echo.
@echo off
setlocal enabledelayedexpansion

echo Waiting for worker to come online...
set "SUCCESS=0"
set "MAX_RETRIES=20"

for /L %%a in (1,1,%MAX_RETRIES%) do (
    set /p "=Attempt %%a of %MAX_RETRIES%: " <nul
    
    curl -s -o nul -w "%%{http_code}" "%WORKER_URL%/" > "%TEMP%\status.txt"
    set /p HTTP_STATUS=<"%TEMP%\status.txt"
    
    if "!HTTP_STATUS!"=="200" (
        echo [OK] - Worker is online!
        set "SUCCESS=1"
        goto WAIT_DONE
    ) else (
        echo [Status: !HTTP_STATUS!] - Waiting...
    )
    
    for /L %%t in (1,1,3) do (
        set /p "=." <nul
        timeout /t 1 >nul
    )
    echo.
)

:WAIT_DONE
if "!SUCCESS!"=="0" (
    echo.
    echo ========================================
    echo WARNING: Worker not ready after %MAX_RETRIES% attempts
    echo ========================================
    pause
) else (
    echo Worker is ready!
)

:: ============================================
:: SQL INSERTS - Domain & Email Settings
:: ============================================
echo.
echo Setting domain and email defaults...

set "DEFAULT_FROM=support@%SITE_DOMAIN%"
set "PASSWORD_RESET_FROM=%DEFAULT_FROM%"

powershell -NoProfile -Command ^
    "$sq = [char]39; " ^
    "$d = $env:SITE_DOMAIN; $f = $env:DEFAULT_FROM; $r = $env:PASSWORD_RESET_FROM; " ^
    "$sql = 'INSERT OR REPLACE INTO settings (category, key, value) VALUES (' + $sq + 'general' + $sq + ', ' + $sq + 'domain' + $sq + ', ' + $sq + $d + $sq + '), (' + $sq + 'email' + $sq + ', ' + $sq + 'default_from' + $sq + ', ' + $sq + $f + $sq + '), (' + $sq + 'email' + $sq + ', ' + $sq + 'password_reset_from' + $sq + ', ' + $sq + $r + $sq + ')'; " ^
    "$json = @{ sql = $sql } | ConvertTo-Json -Compress; " ^
    "[System.IO.File]::WriteAllText('%TEMP%\domain_settings.json', $json)"

curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database/%DB_ID%/query" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "@%TEMP%\domain_settings.json" > nul

echo OK: Domain and email defaults set

:: ============================================
:: SCRIPT_URL - Set if provided
:: ============================================
if not "%SCRIPT_URL%"=="" (
    echo.
    echo Setting SCRIPT_URL...
    powershell -NoProfile -Command ^
        "$sq = [char]39; " ^
        "$u = $env:SCRIPT_URL; " ^
        "$sql = 'INSERT OR REPLACE INTO settings (category, key, value) VALUES (' + $sq + 'general' + $sq + ', ' + $sq + 'script_url' + $sq + ', ' + $sq + $u + $sq + ')'; " ^
        "$json = @{ sql = $sql } | ConvertTo-Json -Compress; " ^
        "[System.IO.File]::WriteAllText('%TEMP%\script_url.json', $json)"
    
    curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database/%DB_ID%/query" ^
      -H "Authorization: Bearer %API_TOKEN%" ^
      -H "Content-Type: application/json" ^
      -d "@%TEMP%\script_url.json" > nul
    echo OK: SCRIPT_URL set
)

:: Admin User
echo.
echo Creating Admin User...
powershell -NoProfile -Command ^
    "$pass = Get-Content -Path '%TEMP%\admin_pw.txt' -Raw -Encoding Ascii; " ^
    "$pass = $pass.Trim(); " ^
    "$sha = [System.Security.Cryptography.SHA256]::Create(); " ^
    "$bytes = [System.Text.Encoding]::UTF8.GetBytes($pass); " ^
    "$hash = $sha.ComputeHash($bytes); " ^
    "$hashStr = ([System.BitConverter]::ToString($hash) -replace '-', '').ToLower(); " ^
    "$hashStr | Out-File -Encoding ascii '%TEMP%\password_hash.txt'"

for /f "delims=" %%i in (%TEMP%\password_hash.txt) do set "PASSWORD_HASH=%%i"

powershell -NoProfile -Command ^
    "$sq = [char]39; $q = [char]34; " ^
    "$e = $env:ADMIN_EMAIL; $n = $env:ADMIN_NAME; $h = $env:PASSWORD_HASH; " ^
    "$perms = '{' + $q + 'tickets' + $q + ':{' + $q + 'read' + $q + ':true,' + $q + 'write' + $q + ':true},' + $q + 'users' + $q + ':{' + $q + 'read' + $q + ':true,' + $q + 'write' + $q + ':true},' + $q + 'settings' + $q + ':{' + $q + 'read' + $q + ':true,' + $q + 'write' + $q + ':true},' + $q + 'newsletter' + $q + ':{' + $q + 'read' + $q + ':true,' + $q + 'write' + $q + ':true},' + $q + 'reports' + $q + ':{' + $q + 'read' + $q + ':true,' + $q + 'write' + $q + ':true},' + $q + 'order_reply' + $q + ':{' + $q + 'read' + $q + ':true,' + $q + 'write' + $q + ':true}}'; " ^
    "$langs = '[' + $q + 'en' + $q + ']'; " ^
    "$sql = 'INSERT OR IGNORE INTO users (email, name, role, password_hash, allowed_languages, allowed_emails, allowed_categories, team_id, page_permissions, active) VALUES (' + $sq + $e + $sq + ', ' + $sq + $n + $sq + ', ' + $sq + 'admin' + $sq + ', ' + $sq + $h + $sq + ', ' + $sq + $langs + $sq + ', ' + $sq + '[]' + $sq + ', ' + $sq + '[]' + $sq + ', NULL, ' + $sq + $perms + $sq + ', 1);'; " ^
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
:: OPTIONAL: GOOGLE APP CREDENTIALS (WITH RETRY)
:: ============================================
if /i "%CONFIG_GOOGLE%"=="Y" (
    echo.
    echo Saving encrypted Google App credentials...
    echo Waiting for worker to fully initialize...
    timeout /t 5 >nul
    
    set "RETRY_COUNT=0"
    :GOOGLE_RETRY
    set /a RETRY_COUNT+=1
    echo Attempt !RETRY_COUNT! of 10...
    
    powershell -NoProfile -Command ^
        "$ErrorActionPreference = 'Stop'; " ^
        "try { " ^
        "  $loginBody = @{ email = '%ADMIN_EMAIL%'; password = '%ADMIN_PASSWORD%' } | ConvertTo-Json; " ^
        "  $login = Invoke-RestMethod -Uri '%WORKER_URL%/api/admin/login' -Method Post -ContentType 'application/json' -Body $loginBody; " ^
        "  $token = $login.token; " ^
        "  $hdr = @{ Authorization = 'Bearer ' + $token }; " ^
        "  $encPwBody = @{ value = '%GOOGLE_PASSWORD%' } | ConvertTo-Json; " ^
        "  $encPw = Invoke-RestMethod -Uri '%WORKER_URL%/api/admin/setup/encrypt' -Method Post -ContentType 'application/json' -Headers $hdr -Body $encPwBody; " ^
        "  $encSecretBody = @{ value = '%GOOGLE_SECRET%' } | ConvertTo-Json; " ^
        "  $encSecret = Invoke-RestMethod -Uri '%WORKER_URL%/api/admin/setup/encrypt' -Method Post -ContentType 'application/json' -Headers $hdr -Body $encSecretBody; " ^
        "  $settingsBody = @{ settings = @( " ^
        "      @{ category='email_script'; key='username'; value='%GOOGLE_USERNAME%' }, " ^
        "      @{ category='email_script'; key='password'; value=$encPw.encrypted }, " ^
        "      @{ category='email_script'; key='secret'; value=$encSecret.encrypted } " ^
        "  ) } | ConvertTo-Json -Depth 5; " ^
        "  Invoke-RestMethod -Uri '%WORKER_URL%/api/admin/settings' -Method Put -ContentType 'application/json' -Headers $hdr -Body $settingsBody | Out-Null; " ^
        "  Write-Host 'OK: Google App credentials saved.'; " ^
        "  exit 0 " ^
        "} catch { " ^
        "  Write-Host ('ERROR: ' + $_.Exception.Message); " ^
        "  exit 1 " ^
        "}"
    
    if errorlevel 1 (
        if !RETRY_COUNT! LSS 20 (
            echo Retrying...
            timeout /t 5 >nul
            goto GOOGLE_RETRY
        ) else (
            echo.
            echo WARNING: Could not save Google App credentials automatically.
            echo You can configure them later in the admin panel Settings → Email.
            echo.
        )
    )
)

:: ============================================
:: OFFER CONFIG.JSON AS DOWNLOAD
:: ============================================
set "CONFIG_CONTENT={\"API_BASE\": \"%WORKER_URL%\"}"

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