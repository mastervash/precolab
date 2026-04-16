# PrecoLab

A self-hosted collaborative workspace for teams. Multiple users can view and edit content simultaneously with real-time sync across all tools.

## Features

| Tool | Description |
|---|---|
| **Kanban Board** | Drag-and-drop cards across columns, real-time updates |
| **Documents** | Rich text editor with live cursors and multi-user editing |
| **To-Do Lists** | Shared task lists with assignments and due dates |
| **Chat** | Channel-based messaging with message history |
| **Whiteboard** | Collaborative freehand canvas (Excalidraw) |
| **Mind Map** | Node-based idea mapping with real-time sync |
| **Images** | Upload, gallery view, and basic crop editing |
| **Files** | Upload and share PDFs, docs, and other files |
| **Calendar** | Shared team calendar with event management |
| **Polls** | Create polls and vote as a team |
| **Activity Feed** | Live stream of workspace activity |
| **Comments** | Threaded comments on any item |

## Tech Stack

- **Frontend** — React + Vite, Zustand, React Router v6
- **Backend** — Node.js + Fastify
- **Database** — PostgreSQL (migrations run automatically on startup)
- **Cache / Pub-Sub** — Redis
- **Real-time** — WebSockets + [Yjs](https://yjs.dev/) CRDT for conflict-free collaborative editing
- **Deployment** — Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose
- An external reverse proxy or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) for production access

### Setup

1. Clone the repo and copy the example env file:

```bash
git clone https://github.com/mastervash/precolab.git
cd precolab
cp .env.example .env
```

2. Edit `.env` and set strong values for all secrets:

```bash
POSTGRES_PASSWORD=your_strong_db_password
REDIS_PASSWORD=your_strong_redis_password
JWT_SECRET=your_jwt_secret_min_32_chars        # openssl rand -hex 64
JWT_REFRESH_SECRET=your_refresh_secret         # openssl rand -hex 64
FRONTEND_URL=https://your-domain.com
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com
```

3. Start the stack:

```bash
docker compose up --build
```

Frontend runs on port **5173**, backend API on port **3000**.

### Development (without Docker)

**Backend:**
```bash
cd backend
npm install
# Set environment variables then:
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
precolab/
├── backend/
│   └── src/
│       ├── plugins/       # Fastify plugins (auth, db, redis, websocket)
│       ├── routes/        # API routes + WebSocket handlers
│       └── db/
│           └── migrations.js  # All DB schema migrations
└── frontend/
    └── src/
        ├── api/           # Axios client with JWT refresh
        ├── components/    # Shared UI components
        ├── pages/         # One page per feature
        └── store/         # Zustand state (auth)
```

**Real-time sync:**
- Documents, whiteboards, and mind maps use Yjs (CRDT) over WebSocket — edits merge automatically with no conflicts
- Kanban, to-dos, and chat use a Redis pub/sub event bus broadcast to all connected clients
- Activity feed uses Server-Sent Events (SSE)

**Authentication:**
- JWT access tokens (15 min) + refresh tokens (30 days, rotated on use)
- Passwords hashed with bcrypt
- File uploads validated by magic bytes (not just extension)

## License

MIT
