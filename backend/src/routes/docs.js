import { authenticate } from '../middleware/authenticate.js'

export default async function docsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /
  fastify.get('/', async (request, reply) => {
    const { workspaceId } = request.params
    const { rows } = await fastify.pg.query(
      `SELECT id, title, created_by, created_at, updated_at FROM documents WHERE workspace_id = $1 ORDER BY updated_at DESC`,
      [workspaceId]
    )
    return reply.send(rows)
  })

  // POST /
  fastify.post('/', {
    schema: { body: { type: 'object', properties: { title: { type: 'string', maxLength: 500 } } } },
  }, async (request, reply) => {
    const { workspaceId } = request.params
    const title = request.body?.title || 'Untitled'
    const { rows: [doc] } = await fastify.pg.query(
      `INSERT INTO documents (workspace_id, title, created_by) VALUES ($1, $2, $3) RETURNING id, title, created_at, updated_at`,
      [workspaceId, title, request.user.id]
    )
    logActivity(fastify, workspaceId, request.user.id, 'created_doc', 'document', doc.id, title)
    return reply.code(201).send(doc)
  })

  // GET /:docId
  fastify.get('/:docId', async (request, reply) => {
    const { rows: [doc] } = await fastify.pg.query(
      `SELECT id, title, workspace_id, created_by, created_at, updated_at FROM documents WHERE id = $1`,
      [request.params.docId]
    )
    if (!doc) return reply.code(404).send({ error: 'Not found' })
    return reply.send(doc)
  })

  // PATCH /:docId — update title only (content via Yjs WS)
  fastify.patch('/:docId', {
    schema: { body: { type: 'object', required: ['title'], properties: { title: { type: 'string', maxLength: 500 } } } },
  }, async (request, reply) => {
    const { rows: [doc] } = await fastify.pg.query(
      `UPDATE documents SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, updated_at`,
      [request.body.title, request.params.docId]
    )
    return reply.send(doc)
  })

  // DELETE /:docId
  fastify.delete('/:docId', async (request, reply) => {
    await fastify.pg.query('DELETE FROM documents WHERE id = $1', [request.params.docId])
    return reply.send({ ok: true })
  })
}

function logActivity(fastify, workspaceId, actorId, action, entityType, entityId, entityTitle) {
  fastify.pg.query(
    `INSERT INTO activity_events (workspace_id, actor_id, action, entity_type, entity_id, entity_title) VALUES ($1,$2,$3,$4,$5,$6)`,
    [workspaceId, actorId, action, entityType, entityId, entityTitle]
  ).catch(() => {})
}
