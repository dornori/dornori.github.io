@echo off
setlocal enabledelayedexpansion
title Dornorium Installer - COMPLETE

echo ========================================
echo   Dornorium Installer - FINAL VERSION
echo ========================================
echo.

echo Enter your Cloudflare credentials
set /p ACCOUNT_ID="Cloudflare Account ID: "
set /p API_TOKEN="Cloudflare API Token: "
set /p WORKER_NAME="Worker name (default: dornorium): "
if "%WORKER_NAME%"=="" set WORKER_NAME=dornorium

:: ============================================
:: STEP 2: CREATE KV & D1
:: ============================================
echo Creating resources...
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/storage/kv/namespaces" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"title\":\"%WORKER_NAME%_kv\"}" > "%TEMP%\kv.json"
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/d1/database" -H "Authorization: Bearer %API_TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"%WORKER_NAME%_db\"}" > "%TEMP%\db.json"

for /f %%i in ('powershell -Command "(Get-Content '%TEMP%\kv.json' -Raw | ConvertFrom-Json).result.id"') do set "KV_ID=%%i"
for /f %%i in ('powershell -Command "(Get-Content '%TEMP%\db.json' -Raw | ConvertFrom-Json).result.uuid"') do set "DB_ID=%%i"

if "%KV_ID%"=="" (echo ERROR: KV failed. Check ID/Token. & pause & exit)
if "%DB_ID%"=="" (echo ERROR: D1 failed. Check ID/Token. & pause & exit)

:: ============================================
:: STEP 3: UPLOAD WORKER
:: ============================================
echo Creating metadata and uploading...
echo {"main_module":"worker.js","compatibility_date":"2026-07-17","bindings":[{"type":"kv_namespace","name":"TICKET_KV","namespace_id":"%KV_ID%"},{"type":"d1","name":"DB","id":"%DB_ID%"},{"type":"durable_object_namespace","name":"TICKET_HUB","class_name":"TicketHub"}],"migrations":{"tag":"v1","steps":[{"new_sqlite_classes":["TicketHub"]}]}} > "%TEMP%\metadata.json"

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
echo OK: Upload Successful.

:: Generate Random Secrets
echo Generating random secrets...
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

echo.
echo Secrets generated. Uploading to Cloudflare...
echo.

:: Setting JWT_SECRET
echo Setting JWT_SECRET...
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/secrets" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"JWT_SECRET\",\"text\":\"%JWT_SECRET%\",\"type\":\"secret_text\"}"

echo.
:: Setting ENCRYPTION_KEY
echo Setting ENCRYPTION_KEY...
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/secrets" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"ENCRYPTION_KEY\",\"text\":\"%ENCRYPTION_KEY%\",\"type\":\"secret_text\"}"


echo ========================================
echo Enabling workers.dev URL
echo ========================================

curl -v -X POST "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/scripts/%WORKER_NAME%/subdomain" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"enabled\": true, \"previews_enabled\": true}"
  
 
:: ============================================
:: STEP 7: GENERATE CONFIG.JSON
:: ============================================
echo Fetching subdomain to generate config.json...
curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/%ACCOUNT_ID%/workers/subdomain" -H "Authorization: Bearer %API_TOKEN%" > "%TEMP%\subdomain.json"

for /f %%i in ('powershell -Command "(Get-Content '%TEMP%\subdomain.json' -Raw | ConvertFrom-Json).result.subdomain"') do set "SUBDOMAIN=%%i"

echo {"API_BASE": "https://%WORKER_NAME%.!SUBDOMAIN!.workers.dev"} > config.json
echo OK: config.json created. 
  
  
  
:: ============================================
:: STEP 5: RUN SEED.SQL (ROBUST)
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




echo ========================================
echo   INSTALLATION COMPLETE AND AUTOMATED!
echo ========================================
pause