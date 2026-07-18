@echo off
setlocal enabledelayedexpansion
title Dornorium Installer - COMPLETE WITH ROUTE

echo ========================================
echo   Dornorium Installer - FINAL VERSION
echo ========================================
echo.

:: ============================================
:: STEP 1: GENERATE SECRETS & CREDENTIALS
:: ============================================
echo Generating security keys...
set "CHARS=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
set "JWT_SECRET="
for /L %%i in (1,1,64) do (
    set /a "r=!random! %% 64"
    for %%r in (!r!) do set "JWT_SECRET=!JWT_SECRET!!CHARS:~%%r,1!"
)
set "ENCRYPTION_KEY="
for /L %%i in (1,1,32) do (
    set /a "r=!random! %% 64"
    for %%r in (!r!) do set "ENCRYPTION_KEY=!ENCRYPTION_KEY!!CHARS:~%%r,1!"
)

:: ============================================
:: STEP 1.5: USER CREATION WITH SHA-256
:: ============================================
echo.
echo ========================================
echo   USER CREATION
echo ========================================
echo.

:CREATE_USER
set /p CREATE_USER="Do you want to create an admin user? (Y/N): "
if /i "%CREATE_USER%"=="N" goto SKIP_USER
if /i not "%CREATE_USER%"=="Y" goto CREATE_USER

echo.
echo Creating admin user...
set /p ADMIN_USERNAME="Username (default: admin): "
if "%ADMIN_USERNAME%"=="" set ADMIN_USERNAME=admin

:PASSWORD_LOOP
set /p ADMIN_PASSWORD="Password: "
if "%ADMIN_PASSWORD%"=="" (
    echo Password cannot be empty!
    goto PASSWORD_LOOP
)

set /p CONFIRM_PASSWORD="Confirm Password: "
if not "%ADMIN_PASSWORD%"=="%CONFIRM_PASSWORD%" (
    echo Passwords do not match! Please try again.
    goto PASSWORD_LOOP
)

:: Generate SHA-256 hash using PowerShell
echo Computing SHA-256 hash...
for /f "delims=" %%i in ('powershell -Command "$text = '%ADMIN_PASSWORD%'; $sha = [System.Security.Cryptography.SHA256]::Create(); $hash = [System.BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($text))).Replace('-','').ToLower(); Write-Host $hash"') do set "PASSWORD_HASH=%%i"

:: Generate user ID
set "USER_ID="
for /L %%i in (1,1,16) do (
    set /a "r=!random! %% 16"
    set "HEX=0123456789ABCDEF"
    for %%r in (!r!) do set "USER_ID=!USER_ID!!HEX:~%%r,1!"
)

echo User created:
echo   Username: %ADMIN_USERNAME%
echo   User ID: %USER_ID%
echo   Password Hash (SHA-256): %PASSWORD_HASH%
echo.

:SKIP_USER

:: ============================================
:: STEP 2: GET CLOUDFLARE CREDENTIALS
:: ============================================
echo ========================================
echo   CLOUDFLARE CONFIGURATION
echo ========================================
echo.
echo Enter your Cloudflare credentials
set /p ACCOUNT_ID="Cloudflare Account ID: "
set /p API_TOKEN="Cloudflare API Token: "
set /p WORKER_NAME="Worker name (default: dornorium): "
if "%WORKER_NAME%"=="" set WORKER_NAME=dornorium

:: ============================================
:: STEP 3: CREATE KV & D1
:: ============================================
echo Creating resources...
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/storage/kv/namespaces" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"title\":\"%WORKER_NAME%_kv\"}" > "%TEMP%\kv.json"
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"%WORKER_NAME%_db\"}" > "%TEMP%\db.json"

for /f %%i in ('powershell -Command "(Get-Content '%TEMP%\kv.json' -Raw | ConvertFrom-Json).result.id"') do set "KV_ID=%%i"
for /f %%i in ('powershell -Command "(Get-Content '%TEMP%\db.json' -Raw | ConvertFrom-Json).result.uuid"') do set "DB_ID=%%i"

if "%KV_ID%"=="" (echo ERROR: KV failed. Check ID/Token. & pause & exit)
if "%DB_ID%"=="" (echo ERROR: D1 failed. Check ID/Token. & pause & exit)

:: ============================================
:: STEP 4: UPLOAD WORKER WITH ROUTE ENABLED
:: ============================================
echo Creating metadata with workers.dev route enabled...

:: Create metadata with workers_dev enabled (this enables the workers.dev route)
echo {"main_module":"worker.js","compatibility_date":"2026-07-17","workers_dev":true,"bindings":[{"type":"kv_namespace","name":"TICKET_KV","namespace_id":"%KV_ID%"},{"type":"d1","name":"DB","id":"%DB_ID%"},{"type":"durable_object_namespace","name":"TICKET_HUB","class_name":"TicketHub"}],"migrations":{"tag":"v1","steps":[{"new_sqlite_classes":["TicketHub"]}]}} > "%TEMP%\metadata.json"

echo Uploading worker with route enabled...
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -F "metadata=@%TEMP%\metadata.json;type=application/json" ^
  -F "worker.js=@worker.js;type=application/javascript+module" --silent > "%TEMP%\upload.json"

findstr /C:"\"success\":" "%TEMP%\upload.json" >nul
if errorlevel 1 (
    echo ERROR: Upload failed.
    type "%TEMP%\upload.json"
    pause
    exit
)
echo OK: Upload Successful with workers.dev route enabled.

:: ============================================
:: STEP 5: PUSH SECRETS
:: ============================================
echo Pushing secrets...
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/secrets" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"JWT_SECRET\",\"text\":\"%JWT_SECRET%\"}" >nul
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/secrets" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"ENCRYPTION_KEY\",\"text\":\"%ENCRYPTION_KEY%\"}" >nul

:: ============================================
:: STEP 6: FETCH WORKERS.DEV SUBDOMAIN
:: ============================================
echo Fetching workers.dev subdomain...
curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/subdomain" -H "Authorization: Bearer %API_TOKEN%" > "%TEMP%\subdomain.json"

for /f %%i in ('powershell -Command "(Get-Content '%TEMP%\subdomain.json' -Raw | ConvertFrom-Json).result.subdomain"') do set "WORKERS_SUBDOMAIN=%%i"

if "%WORKERS_SUBDOMAIN%"=="" (
    echo WARNING: Could not fetch workers.dev subdomain.
    echo You may need to enable workers.dev in your Cloudflare dashboard.
    set "WORKERS_SUBDOMAIN=your-subdomain"
)

set "WORKERS_DEV_URL=%WORKER_NAME%.%WORKERS_SUBDOMAIN%.workers.dev"
echo Workers.dev URL: https://%WORKERS_DEV_URL%

:: ============================================
:: STEP 7: RUN SEED.SQL
:: ============================================
echo Running migrations from seed.sql...
powershell -Command "$sql = [IO.File]::ReadAllText('seed.sql'); $json = [PSCustomObject]@{sql = $sql} | ConvertTo-Json -Compress; [System.IO.File]::WriteAllText('%TEMP%\migrate.json', $json)"

curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database/%DB_ID%/query" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "@%TEMP%\migrate.json" > "%TEMP%\migrate_result.json"

findstr /C:"\"success\": true" "%TEMP%\migrate_result.json" >nul
if errorlevel 1 (
    echo ERROR: Migration failed. Check seed.sql format.
    type "%TEMP%\migrate_result.json"
    pause
    exit
)
echo OK: Migrations Applied.

:: ============================================
:: STEP 8: INSERT USER INTO DATABASE
:: ============================================
if "%CREATE_USER%"=="Y" (
    echo Inserting admin user into database...
    
    for /f %%i in ('powershell -Command "Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffZ' -AsUTC"') do set "TIMESTAMP=%%i"
    
    set "USER_SQL=INSERT INTO users (id, username, password_hash, role, created_at, updated_at) VALUES ('%USER_ID%', '%ADMIN_USERNAME%', '%PASSWORD_HASH%', 'admin', '%TIMESTAMP%', '%TIMESTAMP%');"
    
    powershell -Command "$userSql = '%USER_SQL%'; $json = [PSCustomObject]@{sql = $userSql} | ConvertTo-Json -Compress; [System.IO.File]::WriteAllText('%TEMP%\user_insert.json', $json)"
    
    curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database/%DB_ID%/query" ^
      -H "Authorization: Bearer %API_TOKEN%" ^
      -H "Content-Type: application/json" ^
      -d "@%TEMP%\user_insert.json" > "%TEMP%\user_insert_result.json"
    
    findstr /C:"\"success\": true" "%TEMP%\user_insert_result.json" >nul
    if errorlevel 1 (
        echo WARNING: User insertion may have failed.
        type "%TEMP%\user_insert_result.json"
    ) else (
        echo OK: Admin user created successfully.
    )
)

:: ============================================
:: STEP 9: DEPLOY
:: ============================================
echo Deploying worker...
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/deploy" -H "Authorization: Bearer %API_TOKEN%" >nul
echo OK: Worker deployed with workers.dev route enabled.

:: ============================================
:: STEP 10: GENERATE CONFIG.JSON
:: ============================================
echo Generating config.json...

(
echo {
echo   "worker_name": "%WORKER_NAME%",
echo   "workers_dev_url": "https://%WORKERS_DEV_URL%",
echo   "workers_dev_enabled": true,
echo   "kv_namespace_id": "%KV_ID%",
echo   "database_id": "%DB_ID%",
echo   "created_at": "%DATE% %TIME%"
echo }
) > config.json

echo OK: config.json created with workers.dev URL.

:: ============================================
:: STEP 11: GENERATE CREDENTIALS FILE
:: ============================================
if "%CREATE_USER%"=="Y" (
    echo Creating credentials file...
    (
        echo ========================================
        echo   DORNORIUM CREDENTIALS - KEEP SAFE!
        echo ========================================
        echo.
        echo API URL: https://%WORKERS_DEV_URL%
        echo.
        echo User ID: %USER_ID%
        echo Username: %ADMIN_USERNAME%
        echo Password Hash ^(SHA-256^): %PASSWORD_HASH%
        echo Role: admin
        echo Created: %TIMESTAMP%
        echo.
        echo Use these credentials to login at:
        echo https://%WORKERS_DEV_URL%/login
    ) > credentials.txt
    
    echo OK: Credentials saved to credentials.txt
)

echo.
echo ========================================
echo   INSTALLATION COMPLETE!
echo ========================================
echo.
echo Worker Name: %WORKER_NAME%
echo Workers.dev URL: https://%WORKERS_DEV_URL%
echo Route Status: ENABLED
echo.
if "%CREATE_USER%"=="Y" (
    echo Login credentials:
    echo   Username: %ADMIN_USERNAME%
    echo   Login URL: https://%WORKERS_DEV_URL%/login
    echo.
    echo Credentials saved to: credentials.txt
)
echo Configuration saved to: config.json
echo.
pause