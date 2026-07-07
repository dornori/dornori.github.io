// permissions.js
// Single client-side ACL helper. Role defaults + per-user overrides are
// resolved server-side (buildEffectivePermissions in worker.js) into
// user.effective_permissions — this file only reads that resolved object.
// No role tables or fallback logic should be duplicated in any page.

function resolvePermission(effectivePermissions, resource, action) {
    if (!effectivePermissions) return false;
    const perms = effectivePermissions[resource];
    if (!perms) return false;
    const key = action === 'read' ? 'view' : (action === 'write' ? 'edit' : action);
    return perms[key] === true;
}

function resolvePageAccess(effectivePermissions, page) {
    return resolvePermission(effectivePermissions, page, 'view');
}
