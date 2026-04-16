import { authenticate } from '../middleware/authenticate.js'

export default async function commentsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /api/comments?entityType=card&entityId=xxx
  fastify.get('/', async (request, reply) => {
    const { entityType, entityId } = request.query
    if (!entityType || !entityId) return reply.code(400).send({ error: 'entityType and entityId required' })

    const { rows } = await fastify.pg.query(
      `SELECT c.*, u.username, u.avatar_color FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.entity_type = $1 AND c.entity_id = $2
       ORDER BY c.created_at ASC`,
      [entityType, entityId]
    )
    return reply.send(rows)
  })

  // POST /api/comments
  fastify.post('/', {
    schema: {
      body: {
        type: 'object', required: ['entityType', 'entityId', 'body'],
        properties: {
          entityType: { type: 'string', maxLength: 50 },
          entityId: { type: 'string' },
          parentId: { type: 'string' },
          body: { type: 'string', maxLength: 10000 },
        },
      },
    },
  }, async (request, reply) => {
    const { entityType, entityId, parentId, body } = request.body
    const { rows: [comment] } = await fastify.pg.query(
      `INSERT INTO comments (entity_type, entity_id, parent_id, author_id, body)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [entityType, entityId, parentId || null, request.user.id, body]
    )
    return reply.code(201).send(comment)
  })

  // PATCH /api/comments/:id
  fastify.patch('/:id', {
    schema: { body: { type: 'object', required: ['body'], properties: { body: { type: 'string', maxLength: 10000 } } } },
  }, async (request, reply) => {
    const { rows: [comment] } = await fastify.pg.query(
      `UPDATE comments SET body = $1, updated_at = NOW() WHERE id = $2 AND author_id = $3 RETURNING *`,
      [request.body.body, request.params.id, request.user.id]
    )
    if (!comment) return reply.code(403).send({ error: 'Not authorized or not found' })
    return reply.send(comment)
  })

  // DELETE /api/comments/:id
  fastify.delete('/:id', async (request, reply) => {
    const result = await fastify.pg.query(
      'DELETE FROM comments WHERE id = $1 AND author_id = $2', [request.params.id, request.user.id]
    )
    if (result.rowCount === 0) return reply.code(403).send({ error: 'Not authorized or not found' })
    return reply.send({ ok: true })
  })
}
