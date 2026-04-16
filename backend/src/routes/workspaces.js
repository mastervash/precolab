import { authenticate } from '../middleware/authenticate.js'
import { nanoid } from 'nanoid'

export default async function workspacesRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /api/workspaces — list user's workspaces
  fastify.get('/', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      `SELECT w.id, w.name, w.slug, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1`,
      [request.user.id]
    )
    return reply.send(rows)
  })

  // POST /api/workspaces — create workspace
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const { name } = request.body
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${nanoid(6)}`
    const client = await fastify.pg.connect()
    try {
      const { rows: [workspace] } = await client.query(
        `INSERT INTO workspaces (name, slug, owner_id) VALUES ($1, $2, $3)
         RETURNING id, name, slug`,
        [name, slug, request.user.id]
      )
      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [workspace.id, request.user.id]
      )
      await client.query(
        `INSERT INTO chat_rooms (workspace_id, name) VALUES ($1, 'general')`,
        [workspace.id]
      )
      return reply.code(201).send(workspace)
    } finally {
      client.release()
    }
  })

  // POST /api/workspaces/:id/invite — generate a one-time invite link
  fastify.post('/:id/invite', {
    schema: {
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params
    const { role } = request.body

    const { rows: [membership] } = await fastify.pg.query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, request.user.id]
    )
    if (!membership || membership.role !== 'admin') {
      return reply.code(403).send({ error: 'Only admins can invite members' })
    }

    const token = nanoid(32)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await fastify.pg.query(
      `INSERT INTO workspace_invites (workspace_id, token, role, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, token, role, request.user.id, expiresAt]
    )

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return reply.send({ token, url: `${frontendUrl}/join?invite=${token}` })
  })

  // GET /api/workspaces/:id/stats — dashboard stats (any member)
  fastify.get('/:id/stats', async (request, reply) => {
    const { id } = request.params
    const { rows: [self] } = await fastify.pg.query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, request.user.id]
    )
    if (!self) return reply.code(403).send({ error: 'Not a member' })

    const [
      { rows: [counts] },
      { rows: activity },
      { rows: members },
    ] = await Promise.all([
      fastify.pg.query(`
        SELECT
          (SELECT COUNT(*) FROM boards        WHERE workspace_id = $1) AS boards,
          (SELECT COUNT(*) FROM cards c JOIN board_columns bc ON bc.id = c.column_id JOIN boards b ON b.id = bc.board_id WHERE b.workspace_id = $1) AS cards,
          (SELECT COUNT(*) FROM documents     WHERE workspace_id = $1) AS docs,
          (SELECT COUNT(*) FROM todo_items ti JOIN todo_lists tl ON tl.id = ti.list_id WHERE tl.workspace_id = $1 AND ti.completed = false) AS open_todos,
          (SELECT COUNT(*) FROM messages m    JOIN chat_rooms cr ON cr.id = m.room_id WHERE cr.workspace_id = $1) AS messages,
          (SELECT COUNT(*) FROM files         WHERE workspace_id = $1) AS files,
          (SELECT COUNT(*) FROM polls         WHERE workspace_id = $1) AS polls,
          (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1) AS members
      `, [id]),
      fastify.pg.query(`
        SELECT ae.action, ae.entity_title, ae.created_at, u.username, u.avatar_color
        FROM activity_events ae JOIN users u ON u.id = ae.actor_id
        WHERE ae.workspace_id = $1
        ORDER BY ae.created_at DESC LIMIT 5
      `, [id]),
      fastify.pg.query(`
        SELECT u.id, u.username, u.avatar_color, wm.role
        FROM workspace_members wm JOIN users u ON u.id = wm.user_id
        WHERE wm.workspace_id = $1 ORDER BY wm.joined_at LIMIT 8
      `, [id]),
    ])

    return reply.send({ counts, recentActivity: activity, members })
  })

  // GET /api/workspaces/:id/members — list members (any member)
  fastify.get('/:id/members', async (request, reply) => {
    const { id } = request.params
    const { rows: [self] } = await fastify.pg.query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, request.user.id]
    )
    if (!self) return reply.code(403).send({ error: 'Not a member' })

    const { rows } = await fastify.pg.query(
      `SELECT u.id, u.username, u.email, u.avatar_color, wm.role, wm.joined_at
       FROM workspace_members wm JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1 ORDER BY wm.joined_at`,
      [id]
    )
    return reply.send(rows)
  })

  // PATCH /api/workspaces/:id/members/:userId — change role (admin only)
  fastify.patch('/:id/members/:userId', {
    schema: {
      body: {
        type: 'object', required: ['role'],
        properties: { role: { type: 'string', enum: ['admin', 'editor', 'viewer'] } },
      },
    },
  }, async (request, reply) => {
    const { id, userId } = request.params
    const { role } = request.body

    const { rows: [self] } = await fastify.pg.query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, request.user.id]
    )
    if (!self || self.role !== 'admin') return reply.code(403).send({ error: 'Only admins can change roles' })
    if (userId === request.user.id) return reply.code(400).send({ error: 'Cannot change your own role' })

    const { rows: [m] } = await fastify.pg.query(
      `UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3 RETURNING *`,
      [role, id, userId]
    )
    if (!m) return reply.code(404).send({ error: 'Member not found' })
    return reply.send({ ok: true })
  })

  // DELETE /api/workspaces/:id/members/:userId — remove member (admin only)
  fastify.delete('/:id/members/:userId', async (request, reply) => {
    const { id, userId } = request.params

    const { rows: [self] } = await fastify.pg.query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, request.user.id]
    )
    if (!self || self.role !== 'admin') return reply.code(403).send({ error: 'Only admins can remove members' })
    if (userId === request.user.id) return reply.code(400).send({ error: 'Cannot remove yourself' })

    await fastify.pg.query(
      `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, userId]
    )
    return reply.send({ ok: true })
  })

  // PATCH /api/workspaces/:id — rename workspace (admin only)
  fastify.patch('/:id', {
    schema: {
      body: {
        type: 'object', required: ['name'],
        properties: { name: { type: 'string', minLength: 1, maxLength: 100 } },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params
    const { rows: [self] } = await fastify.pg.query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, request.user.id]
    )
    if (!self || self.role !== 'admin') return reply.code(403).send({ error: 'Only admins can rename the workspace' })

    const { rows: [ws] } = await fastify.pg.query(
      `UPDATE workspaces SET name = $1 WHERE id = $2 RETURNING id, name, slug`,
      [request.body.name, id]
    )
    return reply.send(ws)
  })
}
