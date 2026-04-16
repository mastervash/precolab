import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import crypto from 'node:crypto'

const SALT_ROUNDS = 12
const REFRESH_EXPIRY_DAYS = 30

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
]

export default async function authRoutes(fastify) {
  // POST /api/auth/register
  fastify.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'username', 'password'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
          username: { type: 'string', minLength: 2, maxLength: 30, pattern: '^[a-zA-Z0-9_-]+$' },
          password: { type: 'string', minLength: 8, maxLength: 128 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, username, password } = request.body
    const client = await fastify.pg.connect()
    try {
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

      // Create default workspace
      const slug = `${username.toLowerCase()}-${nanoid(6)}`
      const { rows: [workspace] } = await client.query(
        `INSERT INTO workspaces (name, slug, owner_id) VALUES ($1, $2, $3) RETURNING id, name, slug`,
        [`${username}'s Workspace`, slug, user.id]
      )
      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [workspace.id, user.id]
      )

      // Create default general chat room
      await client.query(
        `INSERT INTO chat_rooms (workspace_id, name) VALUES ($1, 'general')`,
        [workspace.id]
      )

      const { accessToken, refreshToken } = await issueTokens(fastify, client, user)

      return reply.code(201).send({
        user: { id: user.id, email: user.email, username: user.username, avatarColor: user.avatar_color },
        workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
        accessToken,
        refreshToken,
      })
    } finally {
      client.release()
    }
  })

  // POST /api/auth/login
  fastify.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', maxLength: 255 },
          password: { type: 'string', maxLength: 128 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body
    const client = await fastify.pg.connect()
    try {
      const { rows: [user] } = await client.query(
        'SELECT id, email, username, password_hash, avatar_color FROM users WHERE email = $1',
        [email.toLowerCase()]
      )
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const valid = await bcrypt.compare(password, user.password_hash)
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const { rows: workspaces } = await client.query(
        `SELECT w.id, w.name, w.slug, wm.role
         FROM workspaces w
         JOIN workspace_members wm ON wm.workspace_id = w.id
         WHERE wm.user_id = $1`,
        [user.id]
      )

      const { accessToken, refreshToken } = await issueTokens(fastify, client, user)

      return reply.send({
        user: { id: user.id, email: user.email, username: user.username, avatarColor: user.avatar_color },
        workspaces,
        accessToken,
        refreshToken,
      })
    } finally {
      client.release()
    }
  })

  // POST /api/auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body || {}
    if (!refreshToken) return reply.code(400).send({ error: 'Missing refresh token' })

    const tokenHash = hashToken(refreshToken)
    const client = await fastify.pg.connect()
    try {
      const { rows: [stored] } = await client.query(
        `SELECT rt.user_id, u.email, u.username, u.avatar_color
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
        [tokenHash]
      )
      if (!stored) return reply.code(401).send({ error: 'Invalid or expired refresh token' })

      // Rotate token
      await client.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash])
      const user = { id: stored.user_id, email: stored.email, username: stored.username, avatar_color: stored.avatar_color }
      const tokens = await issueTokens(fastify, client, user)

      return reply.send(tokens)
    } finally {
      client.release()
    }
  })

  // GET /api/auth/me
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const client = await fastify.pg.connect()
    try {
      const { rows: [user] } = await client.query(
        'SELECT id, email, username, avatar_color, created_at FROM users WHERE id = $1',
        [request.user.id]
      )
      if (!user) return reply.code(404).send({ error: 'User not found' })

      const { rows: workspaces } = await client.query(
        `SELECT w.id, w.name, w.slug, wm.role
         FROM workspaces w
         JOIN workspace_members wm ON wm.workspace_id = w.id
         WHERE wm.user_id = $1`,
        [user.id]
      )

      return reply.send({
        user: { id: user.id, email: user.email, username: user.username, avatarColor: user.avatar_color },
        workspaces,
      })
    } finally {
      client.release()
    }
  })

  // POST /api/auth/logout
  fastify.post('/logout', async (request, reply) => {
    const { refreshToken } = request.body || {}
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken)
      await fastify.pg.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash])
    }
    return reply.send({ ok: true })
  })
}

async function issueTokens(fastify, client, user) {
  const accessToken = fastify.jwt.sign({ id: user.id, email: user.email, username: user.username })

  const rawRefresh = nanoid(64)
  const tokenHash = hashToken(rawRefresh)
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 86400 * 1000)

  await client.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, expiresAt]
  )

  return { accessToken, refreshToken: rawRefresh }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
