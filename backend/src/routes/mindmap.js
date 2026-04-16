import { authenticate } from '../middleware/authenticate.js'

export default async function mindmapRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  fastify.get('/', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      `SELECT id, title, created_by, created_at, updated_at FROM mindmaps WHERE workspace_id = $1 ORDER BY updated_at DESC`,
      [request.params.workspaceId]
    )
    return reply.send(rows)
  })

  fastify.post('/', {
    schema: { body: { type: 'object', properties: { title: { type: 'string', maxLength: 200 } } } },
  }, async (request, reply) => {
    const { rows: [mm] } = await fastify.pg.query(
      `INSERT INTO mindmaps (workspace_id, title, created_by) VALUES ($1,$2,$3) RETURNING id, title, created_at`,
      [request.params.workspaceId, request.body?.title || 'Mind Map', request.user.id]
    )
    return reply.code(201).send(mm)
  })

  fastify.delete('/:id', async (request, reply) => {
    await fastify.pg.query('DELETE FROM mindmaps WHERE id = $1', [request.params.id])
    return reply.send({ ok: true })
  })
}
