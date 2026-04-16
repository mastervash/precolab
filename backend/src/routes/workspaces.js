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

  // POST /api/workspaces/:id/invite — invite user by email
  fastify.post('/:id/invite', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params
    const { email, role } = request.body

    // Must be admin
    const { rows: [membership] } = await fastify.pg.query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, request.user.id]
    )
    if (!membership || membership.role !== 'admin') {
      return reply.code(403).send({ error: 'Only admins can invite members' })
    }

    const { rows: [invitee] } = await fastify.pg.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    )
    if (!invitee) return reply.code(404).send({ error: 'User not found' })

    await fastify.pg.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = $3`,
      [id, invitee.id, role]
    )
    return reply.send({ ok: true })
  })
}
