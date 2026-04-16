import { authenticate } from '../middleware/authenticate.js'
import { checkMembership, denyViewer } from '../middleware/workspace.js'

export default async function whiteboardRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', checkMembership(fastify))

  fastify.get('/', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      `SELECT id, title, created_by, created_at, updated_at FROM whiteboards WHERE workspace_id = $1 ORDER BY updated_at DESC`,
      [request.params.workspaceId]
    )
    return reply.send(rows)
  })

  fastify.post('/', {
    schema: { body: { type: 'object', properties: { title: { type: 'string', maxLength: 200 } } } },
  }, async (request, reply) => {
    if (denyViewer(request, reply)) return
    const { rows: [wb] } = await fastify.pg.query(
      `INSERT INTO whiteboards (workspace_id, title, created_by) VALUES ($1,$2,$3) RETURNING id, title, created_at`,
      [request.params.workspaceId, request.body?.title || 'Whiteboard', request.user.id]
    )
    return reply.code(201).send(wb)
  })

  fastify.delete('/:id', async (request, reply) => {
    if (denyViewer(request, reply)) return
    await fastify.pg.query('DELETE FROM whiteboards WHERE id = $1', [request.params.id])
    return reply.send({ ok: true })
  })
}
