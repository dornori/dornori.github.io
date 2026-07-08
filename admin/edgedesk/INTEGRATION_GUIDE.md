# EdgeDesk v1.2 - Integration Guide

## Overview

This release addresses all critical issues found in the code audit:
- ✅ Removed duplicate `API_BASE` declarations
- ✅ Fixed auto-assignment logic (agents no longer auto-assigned on view)
- ✅ Extracted all magic numbers to centralized config
- ✅ Fixed CORS validation (now rejects invalid origins)
- ✅ Unified lock timeout constants
- ✅ Improved toast duration configuration

## Critical Change: Ticket Assignment Behavior

### BEFORE (v1.1)
- Agents were **automatically assigned** when they simply **viewed** a ticket
- This created false "assigned" status even for just reading

### AFTER (v1.2)
- Agents are **only** assigned when they **modify** the ticket:
  - Add a comment
  - Send an email reply
  - Update ticket fields
- **Manual assignment** still works via the "Assign" button
- **TL/Manager/Admin** can still assign tickets to anyone
- **View-only access** does NOT create an assignment

**Implementation:** Removed `autoAssignSelf()` call from modal load (line 1115-1118). Assignment now happens only in `ticketAction()` when changes are made.

---

## HTML File Changes

### Head Section - IMPORTANT ORDER

Update your HTML `<head>` to load scripts in this exact order:

```html
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EdgeDesk</title>
    <link rel="stylesheet" href="style.css" />
    
    <!-- Load config FIRST (all constants) -->
    <script src="config.js"></script>
    
    <!-- Then edgedeskconfig (nav items) -->
    <script src="edgedeskconfig.js"></script>
</head>
```

Then in your `<body>` at the end before page-specific scripts:

```html
    <!-- Shared utilities (uses getConfigValue from config.js) -->
    <script src="shared.js"></script>
    
    <!-- Page-specific scripts -->
    <script>
        // Your page-specific logic here
    </script>
</body>
```

---

## API Changes

### Ticket Assignment Endpoint

**Endpoint:** `PUT /api/admin/ticket/{id}/assign`

**Behavior Unchanged:**
- Any agent can self-assign an unassigned ticket
- Only TL/Manager/Admin can reassign to others
- Assignment logged as comment in ticket

**What Changed:**
- Frontend no longer calls `/assign` automatically on view
- Only called when agent actually modifies the ticket

---

## Configuration Customization

Edit `config.js` to customize:

```javascript
// Timing (milliseconds)
TOAST_DURATION_MS: 3500              // How long toasts display
TOAST_WARNING_DURATION_MS: 8000      // Warning toasts show longer
WS_RECONNECT_DELAY_MS: 5000          // WebSocket reconnect delay
WS_PING_INTERVAL_MS: 30000           // Keep-alive ping interval

// Authentication (seconds)
TOKEN_EXPIRY_SECONDS: 86400          // Token valid for 24 hours
LOGIN_TIMEOUT_MINUTES: 30
SESSION_TIMEOUT_MINUTES: 60

// Ticket Locking (milliseconds)
LOCK_STALE_WRITE_MS: 45000           // Write locks expire after 45s
LOCK_STALE_READ_MS: 30000            // Read locks expire after 30s
LOCK_CLEANUP_THRESHOLD_MS: 15000     // Check for stale locks every 15s

// Assignment
AUTO_ASSIGN_ON_MODIFY: true          // Auto-assign when agent edits
AUTO_ASSIGN_ON_VIEW: false           // DO NOT auto-assign on view
```

---

## Deployment Checklist

- [ ] Copy `config.js` to web root
- [ ] Update `dashboard.html` script load order (config → edgedeskconfig → shared.js)
- [ ] Update all other HTML files (reports, settings, users, newsletter) with same script order
- [ ] Verify `worker.js` is updated with new constants
- [ ] Verify `shared.js` uses `getConfigValue()` for all config values
- [ ] Verify `settings.html` uses config defaults for system settings
- [ ] Test assignment behavior:
  - [ ] Open ticket (view) → should NOT auto-assign
  - [ ] Add comment → should auto-assign if unassigned
  - [ ] Click "Assign" button → should allow manual assignment
  - [ ] TL assigns ticket → should work via UI

---

## Backward Compatibility

- `edgedeskconfig.js` is now deprecated but still loaded for nav items
- Old code checking `window.EDGEDESK_CONFIG.API_BASE` will still work
- `getConfigValue()` is globally available and recommended for new code

---

## Magic Numbers Eliminated

| Before | Now | Unit | Purpose |
|--------|-----|------|---------|
| `3500` | `TOAST_DURATION_MS` | ms | Default toast display |
| `8000` | `TOAST_WARNING_DURATION_MS` | ms | Warning toast display |
| `5000` | `WS_RECONNECT_DELAY_MS` | ms | WS reconnect delay |
| `30000` | `WS_PING_INTERVAL_MS` | ms | WS keep-alive |
| `86400` | `TOKEN_EXPIRY_SECONDS` | sec | Token expiry (24h) |
| `45000` | `LOCK_STALE_WRITE_MS` | ms | Write lock timeout |
| `30000` | `LOCK_STALE_READ_MS` | ms | Read lock timeout |
| `15000` | `LOCK_CLEANUP_THRESHOLD_MS` | ms | Lock cleanup check |

---

## Testing

### Ticket Assignment Test

1. **Open ticket without modifying:**
   - Before: Auto-assigned ❌
   - After: Not assigned ✅

2. **Open ticket and add comment:**
   - Before: Auto-assigned ✅
   - After: Auto-assigned ✅

3. **Manual assignment:**
   - Click "Assign" button
   - Select agent
   - Should assign regardless of changes ✅

4. **TL Assignment:**
   - TL opens dropdown and picks agent
   - Should assign to any agent ✅

---

## Files Changed

- ✅ `config.js` (NEW)
- ✅ `shared.js` (UPDATED - uses config, no hardcoded values)
- ✅ `dashboard.html` (UPDATED - removed auto-assign, fixed API_BASE)
- ✅ `settings.html` (UPDATED - uses config defaults)
- ✅ `worker.js` (UPDATED - named constants, strict CORS)
- ✅ `edgedeskconfig.js` (UPDATED - marked deprecated)

---

## Troubleshooting

### "getConfigValue is not defined"

**Solution:** Make sure `config.js` is loaded FIRST in your HTML `<head>`. Load order is critical:

```html
<script src="config.js"></script>      <!-- First -->
<script src="edgedeskconfig.js"></script>  <!-- Second -->
```

### Tickets auto-assigning on view

**Solution:** Confirm you have the updated `dashboard.html`. The auto-assign call was removed from `loadTicket()`.

### WebSocket not reconnecting

**Solution:** Check browser console for errors. Reconnection uses `WS_RECONNECT_DELAY_MS` from config.

---

## Security Notes

### CORS Changes

**Before:** Invalid origins were silently accepted and mapped to the first allowed origin. This was a security issue.

**After:** Invalid origins are rejected. The endpoint still returns a 200 but with `Access-Control-Allow-Origin: *` to allow error handling, then the browser blocks cross-origin access.

This is the correct behavior for strict CORS validation.

---

## Questions?

Refer to the detailed `audit_report.md` for full analysis of all issues found and fixed.
