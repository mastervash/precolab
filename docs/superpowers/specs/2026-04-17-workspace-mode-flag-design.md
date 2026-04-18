# Design: WORKSPACE_MODE Deployment Flag

**Date:** 2026-04-17  
**Status:** Approved

## Summary

Add a `WORKSPACE_MODE=single|multi` env var that controls whether Precolab runs as a single shared team workspace or a full multi-workspace application. Schema is unchanged — behavior is switched at deploy time. Also bundles a WebSocket protocol fix for HTTPS deployments.

---

## Git Strategy

- Create `multi-workspace` snapshot branch from current `HEAD` to preserve existing work
- All new work stays on `main`, which will support both modes

---

## New Env Vars

```
WORKSPACE_MODE=single          # or "multi" — defaults to "multi" if unset
WORKSPACE_NAME="Team Workspace" # used only in single mode for seeding
```

---

## Config Endpoint

New public route (no auth required):

```
GET /api/config
→ { workspaceMode: "single" | "multi" }
```

Frontend fetches this on boot before rendering anything. Stored in Zustand auth store alongside existing auth state.

---

## Backend Behavior

**In `multi` mode:** No changes — exactly current behavior.

**In `single` mode:**

- **Seeding:** On startup in `migrations.js`, if no workspace exists, seed one using `WORKSPACE_NAME` (default: `"Team Workspace"`)
- **Disabled routes:** `POST /api/workspaces` and `DELETE /api/workspaces/:id` return `403`
- **Invites:** Invite generation always targets the seeded workspace — no workspace selector
- **Registration:** Joining via invite auto-adds user to the single workspace with the invited role
- **All other routes** (`/api/workspaces/:workspaceId/...`) work unchanged — frontend passes the one known workspace ID

Roles (admin / editor / viewer) are preserved in both modes.

---

## Frontend Behavior

**Config fetch:** `GET /api/config` called on app boot before rendering. Loading state shown until resolved.

**In `multi` mode:** No changes.

**In `single` mode:**

- Workspace switcher hidden
- "Create workspace" UI hidden
- Workspace management/settings page hidden (admins still see member management)
- After login, user is sent directly to workspace dashboard — no workspace picker. The workspace ID comes from the user's memberships list returned by the login/refresh response (same as today — there will simply always be exactly one entry)
- Invite UI generates a link with no workspace selector

---

## WebSocket Fix (bundled)

All frontend WS URL construction changes from:
```js
const wsBase = import.meta.env.VITE_WS_URL || `ws://${location.host}`
```
to:
```js
const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
const wsBase = import.meta.env.VITE_WS_URL || `${wsProto}//${location.host}`
```

This fixes mixed-content errors on HTTPS deployments (Cloudflare tunnels, etc.).

---

## What Does NOT Change

- Database schema — no table or column changes
- Route paths — all `/api/workspaces/:workspaceId/...` routes remain
- Role system — admin/editor/viewer fully preserved in both modes
- Invite link mechanism — reused, just simplified in single mode
