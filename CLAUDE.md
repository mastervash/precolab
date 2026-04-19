# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->


## Build & Test

```bash
docker compose up --build   # Start full stack (backend :3000, frontend :5173, postgres, redis)
./start.sh                  # Alternative start script
# No test suite yet
```

## Environment Quirks

- `node` is not in PATH — only `bun` at `~/.bun/bin/bun`; a `node → bun` symlink was created at `~/.bun/bin/node`
- MCP servers go in `~/.mcp.json` (not in `settings.json` — that key is rejected by schema)
- claude-mem worker must be running for `smart_search`/`smart_outline`/`smart_unfold` tools; start with:
  `bun ~/.claude/plugins/cache/thedotmack/claude-mem/10.6.3/scripts/worker-service.cjs start`
- New `.mcp.json` entries only load in the **next** Claude Code session (restart or `/hooks` to reload)
- `.env` is not committed — copy from `.env.example` and generate JWT secrets with `openssl rand -hex 64`
- App is served at `justas.fyi:5173` (not localhost) — API calls must go through nginx proxy, not hardcoded `localhost:3000`

## Architecture Overview

React + Vite SPA (port 5173) ↔ Fastify REST + WebSocket API (port 3000) ↔ PostgreSQL + Redis

- Auth: JWT (15min) + refresh tokens (30d), bcrypt passwords
- Real-time: WebSockets + Yjs CRDT for docs/whiteboard/mindmap; SSE for activity feed
- DB migrations: auto-applied on backend startup (`backend/src/db/migrations.js`)
- Role middleware: `checkMembership(fastify)` factory + `denyViewer()` guard (`backend/src/middleware/workspace.js`)
- Frontend state: Zustand auth store (`setAuth(user, workspaces, accessToken, refreshToken)`)

## Docker / Deployment Gotchas

- Backend Dockerfile needs `RUN apk add --no-cache python3 make g++` — `bcrypt` requires native compilation
- Fastify plugin scoping: `fastify.register(plugin)` creates an encapsulated child scope; decorators like `fastify.pg` and `fastify.authenticate` won't be visible to sibling route plugins. All plugins in `backend/src/plugins/index.js` must be called directly: `await plugin(fastify)` (not `fastify.register(plugin)`)
- nginx proxies `/api/` and `/ws` to the backend container — frontend uses relative URLs; don't set `VITE_API_URL` to a hardcoded host
- In `docker-compose.yml` build args, use `${VAR-}` not `${VAR:-default}` for vars that should allow empty string — `:-` treats empty as unset and applies the default

## Conventions & Patterns

- CSS design tokens: `var(--bg)`, `var(--bg-2/3/4)`, `var(--border)`, `var(--primary)`, `var(--text)`, `var(--text-muted)` — use these everywhere, never hardcode colors
- Third-party component theming (react-big-calendar, ReactFlow) done via injected `<style>` tags with `.rbc-*` / `.react-flow__*` class overrides
- Invite tokens: nanoid(32), single-use, 7-day expiry, stored in `workspace_invites` table
- Public routes (no auth): `/api/auth/*` — workspace routes at `/api/workspaces/*` require authenticate hook
