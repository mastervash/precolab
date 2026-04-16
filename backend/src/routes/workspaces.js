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
    return reply.send({ token, url: `${frontendUrl}/register?invite=${token}` })
  })

}
