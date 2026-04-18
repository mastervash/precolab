# WORKSPACE_MODE Deployment Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `WORKSPACE_MODE=single|multi` env var that lets operators choose between a single shared team workspace or the full multi-workspace experience at deploy time, and fix WebSocket connections failing on HTTPS.

**Architecture:** A public `GET /api/config` endpoint exposes `workspaceMode` to the frontend. The frontend fetches this on boot, stores it in a Zustand store, and conditionally hides workspace management UI. The backend guards workspace creation routes and modifies registration logic based on the env var. No schema changes — the workspace table is still used in both modes.

**Tech Stack:** Fastify (backend routes), Zustand (frontend state), React hooks (boot fetch), PostgreSQL (workspace seeding via register route)

---

## File Map

**Create:**
- `backend/src/routes/config.js` — public GET /api/config endpoint
- `frontend/src/store/configStore.js` — Zustand store for workspaceMode

**Modify:**
- `backend/src/routes/index.js` — register config route
- `backend/src/routes/workspaces.js:20-52` — 403 guard on POST /
- `backend/src/routes/auth.js:30-111` — single-mode registration logic
- `frontend/src/pages/KanbanPage.jsx:39` — ws:// → protocol-aware wss://
- `frontend/src/pages/DocPage.jsx:22` — ws:// → protocol-aware wss://
- `frontend/src/pages/MindMapPage.jsx:44` — ws:// → protocol-aware wss://
- `frontend/src/pages/WhiteboardPage.jsx:15` — ws:// → protocol-aware wss://
- `frontend/src/pages/TodoPage.jsx:24` — ws:// → protocol-aware wss://
- `frontend/src/App.jsx` — fetch config on boot, gate render on config loaded
- `frontend/src/components/layout/WorkspaceShell.jsx:169-182,241-247` — hide selector, restrict invite button to admins
- `.env.example` — add WORKSPACE_MODE and WORKSPACE_NAME vars
- `docker-compose.yml` — pass WORKSPACE_MODE and WORKSPACE_NAME to backend

---

## Task 1: Create multi-workspace snapshot branch

**Files:** git only

- [ ] **Step 1: Create and push the snapshot branch**

```bash
cd /home/mastervash/precolab
git checkout -b multi-workspace
git push -u origin multi-workspace
git checkout main
```

Expected: branch `multi-workspace` created, pushed to remote, back on `main`.

- [ ] **Step 2: Commit**

No code changed — the branch creation is the commit.

---

## Task 2: Add env vars to config files

**Files:**
- Modify: `.env.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add vars to `.env.example`**

In `.env.example`, add after the `FRONTEND_URL` / `VITE_WS_URL` block:

```
# Workspace mode: "single" = one shared team workspace (invite-only after first user)
#                 "multi"  = each user gets their own workspace (default)
WORKSPACE_MODE=multi
WORKSPACE_NAME=Team Workspace

# Note: leave VITE_WS_URL unset in production — the frontend auto-detects wss:// on HTTPS
# VITE_WS_URL=wss://yourdomain.com
```

- [ ] **Step 2: Add vars to `docker-compose.yml` backend environment block**

In `docker-compose.yml`, under the `backend:` → `environment:` section (after `FRONTEND_URL`), add:

```yaml
      WORKSPACE_MODE: ${WORKSPACE_MODE:-multi}
      WORKSPACE_NAME: ${WORKSPACE_NAME:-Team Workspace}
```

- [ ] **Step 3: Commit**

```bash
git add .env.example docker-compose.yml
git commit -m "config: add WORKSPACE_MODE and WORKSPACE_NAME env vars"
```

---

## Task 3: Fix WebSocket protocol detection (5 files)

**Files:**
- Modify: `frontend/src/pages/KanbanPage.jsx`
- Modify: `frontend/src/pages/TodoPage.jsx`
- Modify: `frontend/src/pages/DocPage.jsx`
- Modify: `frontend/src/pages/MindMapPage.jsx`
- Modify: `frontend/src/pages/WhiteboardPage.jsx`

The problem: all 5 files construct `ws://${location.host}` hardcoded. On HTTPS pages (Cloudflare tunnel), browsers block `ws://` as mixed content. The fix: detect `location.protocol` and use `wss:` when on HTTPS.

- [ ] **Step 1: Fix KanbanPage.jsx line 39**

Find this line (around line 39):
```js
const wsUrl = (import.meta.env.VITE_WS_URL || `ws://${location.host}`) + `/ws/workspace/${wid}?token=${accessToken}`
```

Replace with:
```js
const wsProto = location.protocol === 'https:' ? 'wss' : 'ws'
const wsUrl = (import.meta.env.VITE_WS_URL || `${wsProto}://${location.host}`) + `/ws/workspace/${wid}?token=${accessToken}`
```

- [ ] **Step 2: Fix TodoPage.jsx line 24**

Find this line (around line 24):
```js
const wsUrl = (import.meta.env.VITE_WS_URL || `ws://${location.host}`) + `/ws/workspace/${wid}?token=${accessToken}`
```

Replace with:
```js
const wsProto = location.protocol === 'https:' ? 'wss' : 'ws'
const wsUrl = (import.meta.env.VITE_WS_URL || `${wsProto}://${location.host}`) + `/ws/workspace/${wid}?token=${accessToken}`
```

- [ ] **Step 3: Fix DocPage.jsx line 22**

Find this line (around line 22):
```js
const wsBase = import.meta.env.VITE_WS_URL || `ws://${location.host}`
```

Replace with:
```js
const wsBase = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
```

- [ ] **Step 4: Fix MindMapPage.jsx line 44**

Find this line (around line 44):
```js
const wsBase = import.meta.env.VITE_WS_URL || `ws://${location.host}`
```

Replace with:
```js
const wsBase = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
```

- [ ] **Step 5: Fix WhiteboardPage.jsx line 15**

Find this line (around line 15):
```js
const wsBase = import.meta.env.VITE_WS_URL || `ws://${location.host}`
```

Replace with:
```js
const wsBase = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/KanbanPage.jsx frontend/src/pages/TodoPage.jsx \
        frontend/src/pages/DocPage.jsx frontend/src/pages/MindMapPage.jsx \
        frontend/src/pages/WhiteboardPage.jsx
git commit -m "fix: use wss:// on HTTPS to fix WebSocket mixed-content errors"
```

---

## Task 4: Create GET /api/config endpoint

**Files:**
- Create: `backend/src/routes/config.js`
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: Create `backend/src/routes/config.js`**

```js
export default async function configRoutes(fastify) {
  fastify.get('/', async (request, reply) => {
    return reply.send({
      workspaceMode: process.env.WORKSPACE_MODE === 'single' ? 'single' : 'multi',
    })
  })
}
```

- [ ] **Step 2: Register the route in `backend/src/routes/index.js`**

Add import at the top (after the existing imports):
```js
import configRoutes from './config.js'
```

Add registration inside `registerRoutes` (before the other routes, after `authRoutes`):
```js
  await fastify.register(configRoutes, { prefix: '/api/config' })
```

The file should now look like:
```js
import authRoutes from './auth.js'
import usersRoutes from './users.js'
import workspacesRoutes from './workspaces.js'
import kanbanRoutes from './kanban.js'
import docsRoutes from './docs.js'
import todosRoutes from './todos.js'
import chatRoutes from './chat.js'
import whiteboardRoutes from './whiteboard.js'
import mindmapRoutes from './mindmap.js'
import filesRoutes from './files.js'
import commentsRoutes from './comments.js'
import activityRoutes from './activity.js'
import pollsRoutes from './polls.js'
import calendarRoutes from './calendar.js'
import collaborationRoutes from './collaboration.js'
import configRoutes from './config.js'

export async function registerRoutes(fastify) {
  await fastify.register(configRoutes, { prefix: '/api/config' })
  await fastify.register(authRoutes, { prefix: '/api/auth' })
  await fastify.register(usersRoutes, { prefix: '/api/users' })
  await fastify.register(workspacesRoutes, { prefix: '/api/workspaces' })
  await fastify.register(kanbanRoutes, { prefix: '/api/workspaces/:workspaceId/kanban' })
  await fastify.register(docsRoutes, { prefix: '/api/workspaces/:workspaceId/docs' })
  await fastify.register(todosRoutes, { prefix: '/api/workspaces/:workspaceId/todos' })
  await fastify.register(chatRoutes, { prefix: '/api/workspaces/:workspaceId/chat' })
  await fastify.register(whiteboardRoutes, { prefix: '/api/workspaces/:workspaceId/whiteboards' })
  await fastify.register(mindmapRoutes, { prefix: '/api/workspaces/:workspaceId/mindmaps' })
  await fastify.register(filesRoutes, { prefix: '/api/workspaces/:workspaceId/files' })
  await fastify.register(commentsRoutes, { prefix: '/api/comments' })
  await fastify.register(activityRoutes, { prefix: '/api/workspaces/:workspaceId/activity' })
  await fastify.register(pollsRoutes, { prefix: '/api/workspaces/:workspaceId/polls' })
  await fastify.register(calendarRoutes, { prefix: '/api/workspaces/:workspaceId/calendar' })
  await fastify.register(collaborationRoutes, { prefix: '/ws' })
}
```

- [ ] **Step 3: Verify the endpoint manually**

```bash
cd /home/mastervash/precolab
docker compose up backend -d
curl http://localhost:3000/api/config
```

Expected output: `{"workspaceMode":"multi"}` (or `"single"` if env var is set)

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/config.js backend/src/routes/index.js
git commit -m "feat: add GET /api/config endpoint to expose workspace mode"
```

---

## Task 5: Guard workspace creation in single mode

**Files:**
- Modify: `backend/src/routes/workspaces.js`

- [ ] **Step 1: Add guard to POST / (create workspace) at line 30**

In `backend/src/routes/workspaces.js`, inside the `fastify.post('/', ...)` handler, add this as the very first line inside the `async (request, reply) => {` callback:

```js
  }, async (request, reply) => {
    if (process.env.WORKSPACE_MODE === 'single') {
      return reply.code(403).send({ error: 'Workspace creation is disabled in single-workspace mode' })
    }
    const { name } = request.body
    // ... rest of existing code unchanged
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/workspaces.js
git commit -m "feat: block workspace creation in single mode"
```

---

## Task 6: Single-mode registration logic in auth.js

**Files:**
- Modify: `backend/src/routes/auth.js`

Currently `POST /api/auth/register` always creates a personal workspace. In single mode:
- First user ever: create the shared workspace (using `WORKSPACE_NAME`) and make them admin
- Subsequent users without invite: 403
- Subsequent users with valid invite: create user, join invite workspace (no personal workspace)

- [ ] **Step 1: Replace the register handler body in `backend/src/routes/auth.js`**

Replace the entire handler from line 30 (`async (request, reply) => {`) through line 111 (`}`) with:

```js
  }, async (request, reply) => {
    const { email, username, password, inviteToken } = request.body
    const client = await fastify.pg.connect()
    try {
      // Single-workspace mode: require invite after first user exists
      if (process.env.WORKSPACE_MODE === 'single') {
        const { rows: [firstUser] } = await client.query('SELECT id FROM users LIMIT 1')
        if (firstUser && !inviteToken) {
          return reply.code(403).send({ error: 'Registration requires an invite link' })
        }
      }

      const { rows: existing } = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email.toLowerCase(), username.toLowerCase()]
      )
      if (existing.length > 0) {
        return reply.code(409).send({ error: 'Email or username already taken' })
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
      const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

      const { rows: [user] } = await client.query(
        `INSERT INTO users (email, username, password_hash, avatar_color)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, username, avatar_color, created_at`,
        [email.toLowerCase(), username.toLowerCase(), passwordHash, color]
      )

      // Validate invite token if provided
      let inviteRow = null
      if (inviteToken) {
        const { rows: [inv] } = await client.query(
          `SELECT id, workspace_id, role FROM workspace_invites
           WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
          [inviteToken]
        )
        if (!inv) return reply.code(400).send({ error: 'Invite link is invalid or expired' })
        inviteRow = inv
      }

      // Create workspace:
      // - Multi mode: always create a personal workspace
      // - Single mode, no invite (first user): create the shared workspace
      // - Single mode, with invite: skip — user joins via invite below
      const shouldCreateWorkspace = process.env.WORKSPACE_MODE !== 'single' || !inviteRow
      if (shouldCreateWorkspace) {
        const isSingleFirstUser = process.env.WORKSPACE_MODE === 'single'
        const workspaceName = isSingleFirstUser
          ? (process.env.WORKSPACE_NAME || 'Team Workspace')
          : `${username}'s Workspace`
        const slug = isSingleFirstUser
          ? `team-${nanoid(6)}`
          : `${username.toLowerCase()}-${nanoid(6)}`
        const { rows: [workspace] } = await client.query(
          `INSERT INTO workspaces (name, slug, owner_id) VALUES ($1, $2, $3) RETURNING id, name, slug`,
          [workspaceName, slug, user.id]
        )
        await client.query(
          `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
          [workspace.id, user.id]
        )
        await client.query(
          `INSERT INTO chat_rooms (workspace_id, name) VALUES ($1, 'general')`,
          [workspace.id]
        )
      }

      // Consume invite — join the invited workspace
      if (inviteRow) {
        await client.query(
          `INSERT INTO workspace_members (workspace_id, user_id, role)
           VALUES ($1, $2, $3) ON CONFLICT (workspace_id, user_id) DO NOTHING`,
          [inviteRow.workspace_id, user.id, inviteRow.role]
        )
        await client.query(
          `UPDATE workspace_invites SET used_at = NOW(), used_by = $1 WHERE id = $2`,
          [user.id, inviteRow.id]
        )
      }

      const { rows: workspaces } = await client.query(
        `SELECT w.id, w.name, w.slug, wm.role
         FROM workspaces w
         JOIN workspace_members wm ON wm.workspace_id = w.id
         WHERE wm.user_id = $1`,
        [user.id]
      )

      const { accessToken, refreshToken } = await issueTokens(fastify, client, user)

      return reply.code(201).send({
        user: { id: user.id, email: user.email, username: user.username, avatarColor: user.avatar_color },
        workspaces,
        accessToken,
        refreshToken,
      })
    } finally {
      client.release()
    }
  })
```

- [ ] **Step 2: Verify multi-mode is unchanged**

```bash
docker compose up backend -d
# Register a new user (no invite) — should succeed in multi mode
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'
```

Expected: `201` with user, workspaces (one personal workspace), tokens.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/auth.js
git commit -m "feat: single-mode registration — first user seeds workspace, subsequent require invite"
```

---

## Task 7: Create frontend configStore

**Files:**
- Create: `frontend/src/store/configStore.js`

- [ ] **Step 1: Create the store**

```js
import { create } from 'zustand'

export const useConfigStore = create((set) => ({
  workspaceMode: null,
  setConfig: ({ workspaceMode }) => set({ workspaceMode }),
}))
```

`workspaceMode: null` means "not yet fetched". The app gates rendering until this is set.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/configStore.js
git commit -m "feat: add configStore for workspace mode"
```

---

## Task 8: Fetch config on app boot in App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add config fetch to App.jsx**

Replace the entire `frontend/src/App.jsx` with:

```jsx
import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore.js'
import { useConfigStore } from './store/configStore.js'
import ToastContainer from './components/ui/Toast.jsx'
import './store/themeStore.js' // apply saved theme on load
import WorkspaceShell from './components/layout/WorkspaceShell.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import KanbanPage from './pages/KanbanPage.jsx'
import DocPage from './pages/DocPage.jsx'
import TodoPage from './pages/TodoPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import WhiteboardPage from './pages/WhiteboardPage.jsx'
import MindMapPage from './pages/MindMapPage.jsx'
import ImagesPage from './pages/ImagesPage.jsx'
import FilesPage from './pages/FilesPage.jsx'
import ActivityPage from './pages/ActivityPage.jsx'
import PollsPage from './pages/PollsPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import JoinPage from './pages/JoinPage.jsx'

function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  const setConfig = useConfigStore((s) => s.setConfig)
  const workspaceMode = useConfigStore((s) => s.workspaceMode)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ workspaceMode: 'multi' }))
  }, [])

  if (!workspaceMode) return null

  return (
    <>
    <ToastContainer />
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/join" element={<JoinPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WorkspaceShell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/kanban" element={<KanbanPage />} />
                <Route path="/docs/:docId?" element={<DocPage />} />
                <Route path="/todos" element={<TodoPage />} />
                <Route path="/chat/:roomId?" element={<ChatPage />} />
                <Route path="/whiteboard/:boardId?" element={<WhiteboardPage />} />
                <Route path="/mindmap/:mapId?" element={<MindMapPage />} />
                <Route path="/images" element={<ImagesPage />} />
                <Route path="/files" element={<FilesPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/polls" element={<PollsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </WorkspaceShell>
          </ProtectedRoute>
        }
      />
    </Routes>
    </>
  )
}
```

Key changes from the original: added `useEffect` import, imported `useConfigStore`, added the boot fetch with fallback, and gated render with `if (!workspaceMode) return null`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: fetch /api/config on boot, gate render until mode is known"
```

---

## Task 9: Update WorkspaceShell for single mode

**Files:**
- Modify: `frontend/src/components/layout/WorkspaceShell.jsx`

Two changes:
1. Hide the workspace `<select>` dropdown when `workspaceMode === 'single'` (only one workspace, no switching needed)
2. Restrict the invite button to admins only (in both modes — currently shown to everyone)

- [ ] **Step 1: Add configStore import and derive `isAdmin`**

At the top of `WorkspaceShell.jsx`, after the existing imports, add:
```js
import { useConfigStore } from '../../store/configStore.js'
```

Inside the `WorkspaceShell` component function, after the existing destructuring/useState lines, add:
```js
  const workspaceMode = useConfigStore((s) => s.workspaceMode)
  const isAdmin = currentWorkspace?.role === 'admin'
```

- [ ] **Step 2: Wrap the workspace selector with a mode check (lines 169-182)**

Find this block:
```jsx
        {/* Workspace selector */}
        {!collapsed && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Workspace
            </div>
            <select
              value={currentWorkspace?.id || ''}
              onChange={e => setCurrentWorkspace(workspaces.find(w => w.id === e.target.value))}
              style={{ padding: '6px 8px', fontSize: 12, fontWeight: 500 }}
            >
              {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}
```

Replace with:
```jsx
        {/* Workspace selector — hidden in single mode (only one workspace) */}
        {!collapsed && workspaceMode === 'multi' && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Workspace
            </div>
            <select
              value={currentWorkspace?.id || ''}
              onChange={e => setCurrentWorkspace(workspaces.find(w => w.id === e.target.value))}
              style={{ padding: '6px 8px', fontSize: 12, fontWeight: 500 }}
            >
              {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}
```

- [ ] **Step 3: Restrict invite button to admins (lines 241-247)**

Find this block:
```jsx
              <button
                onClick={() => setShowInvite(true)}
                className="btn-icon"
                title="Invite member"
                style={{ flexShrink: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M19 8v6 M22 11h-6" /></svg>
              </button>
```

Replace with:
```jsx
              {isAdmin && (
                <button
                  onClick={() => setShowInvite(true)}
                  className="btn-icon"
                  title="Invite member"
                  style={{ flexShrink: 0 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M19 8v6 M22 11h-6" /></svg>
                </button>
              )}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/WorkspaceShell.jsx
git commit -m "feat: hide workspace selector in single mode, restrict invite to admins"
```

---

## Task 10: Full stack smoke test

- [ ] **Step 1: Rebuild and bring up the stack**

```bash
cd /home/mastervash/precolab
docker compose down
docker compose up --build -d
docker compose logs backend --tail=30
```

Expected: backend starts, migrations run, no errors.

- [ ] **Step 2: Test config endpoint**

```bash
curl http://localhost:3000/api/config
```

Expected: `{"workspaceMode":"multi"}`

- [ ] **Step 3: Open the app and verify WebSocket pages load**

Navigate to `http://justas.fyi:5173`, log in, then visit:
- `/kanban` — should load without console errors
- `/docs` — should load without console errors
- `/chat` — should load without console errors

Open browser devtools → Console — verify no mixed-content WebSocket errors.

- [ ] **Step 4: Test single mode**

In `.env`, add `WORKSPACE_MODE=single` then restart backend only:

```bash
docker compose up backend -d --build
curl http://localhost:3000/api/config
```

Expected: `{"workspaceMode":"single"}`

- [ ] **Step 5: Verify workspace selector is hidden**

Reload the frontend. In the sidebar, the "Workspace" dropdown should be gone.

- [ ] **Step 6: Verify invite button is admin-only**

Log in as a non-admin member — the invite button should not appear in the sidebar.
Log in as an admin — the invite button should appear.

- [ ] **Step 7: Verify workspace creation is blocked in single mode**

```bash
curl -X POST http://localhost:3000/api/workspaces \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <your-access-token>' \
  -d '{"name":"New Workspace"}'
```

Expected: `403 {"error":"Workspace creation is disabled in single-workspace mode"}`

- [ ] **Step 8: Final push**

```bash
git pull --rebase
git push
```

Expected: `git status` shows "up to date with origin/main".
