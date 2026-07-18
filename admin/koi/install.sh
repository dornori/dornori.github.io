#!/bin/bash

# ============================================================
# Dornorium Installer (macOS/Linux)
# ============================================================

echo "========================================"
echo "  Dornorium Installer - Unix/macOS"
echo "========================================"

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "ERROR: 'jq' is not installed. Please install it to continue."
    exit 1
fi

# 1. GENERATE SECRETS
echo "Generating security keys..."
JWT_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9+/ | head -c 64)
ENCRYPTION_KEY=$(head /dev/urandom | tr -dc A-Za-z0-9+/ | head -c 32)

read -p "Cloudflare Account ID: " ACCOUNT_ID
read -p "Cloudflare API Token: " API_TOKEN
read -p "Worker name (default: dornorium): " WORKER_NAME
WORKER_NAME=${WORKER_NAME:-dornorium}

# 2. CREATE KV & D1
echo "Creating resources..."
KV_JSON=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${WORKER_NAME}_kv\"}")

DB_JSON=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${WORKER_NAME}_db\"}")

KV_ID=$(echo "$KV_JSON" | jq -r '.result.id')
DB_ID=$(echo "$DB_JSON" | jq -r '.result.uuid')

if [ "$KV_ID" == "null" ] || [ "$DB_ID" == "null" ]; then
    echo "ERROR: Resource creation failed. Check API Token and Account ID."
    exit 1
fi

# 3. UPLOAD WORKER
echo "Creating metadata and uploading..."
# Create metadata.json using jq
jq -n \
  --arg main "worker.js" \
  --arg date "2026-07-17" \
  --arg kv_name "TICKET_KV" \
  --arg kv_id "$KV_ID" \
  --arg db_name "DB" \
  --arg db_id "$DB_ID" \
  '{
    main_module: $main,
    compatibility_date: $date,
    bindings: [
      {type: "kv_namespace", name: $kv_name, namespace_id: $kv_id},
      {type: "d1", name: $db_name, id: $db_id},
      {type: "durable_object_namespace", name: "TICKET_HUB", class_name: "TicketHub"}
    ],
    migrations: {tag: "v1", steps: [{new_sqlite_classes: ["TicketHub"]}]}
  }' > metadata.json

curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "metadata=@metadata.json;type=application/json" \
  -F "worker.js=@worker.js;type=application/javascript+module" --silent > upload.json

if ! grep -q '"success":true' upload.json && ! grep -q '"success": true' upload.json; then
    echo "ERROR: Upload failed."
    cat upload.json
    exit 1
fi
echo "OK: Upload Successful."

# 4. PUSH SECRETS
echo "Pushing secrets..."
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME/secrets" -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"JWT_SECRET\",\"text\":\"$JWT_SECRET\"}" > /dev/null
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME/secrets" -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"ENCRYPTION_KEY\",\"text\":\"$ENCRYPTION_KEY\"}" > /dev/null

# 5. RUN SEED.SQL
echo "Running migrations..."
# Use jq to wrap the seed.sql file into a proper JSON object
jq -R -s '{sql: .}' seed.sql > migrate.json

curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database/$DB_ID/query" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @migrate.json > migrate_result.json

if ! grep -q '"success":true' migrate_result.json && ! grep -q '"success": true' migrate_result.json; then
    echo "ERROR: Migration failed."
    cat migrate_result.json
    exit 1
fi
echo "OK: Migrations Applied."

# 6. DEPLOY
echo "Deploying..."
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME/deploy" -H "Authorization: Bearer $API_TOKEN" > /dev/null

echo "========================================"
echo "  INSTALLATION COMPLETE AND AUTOMATED!"
echo "========================================"