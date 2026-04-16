import { authenticate } from '../middleware/authenticate.js'
import { checkMembership, denyViewer } from '../middleware/workspace.js'

export default async function todosRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', checkMembership(fastify))

  fastify.get('/', async (request, reply) => {
    const { workspaceId } = request.params
    const { rows: lists } = await fastify.pg.query(
      `SELECT * FROM todo_lists WHERE workspace_id = $1 ORDER BY created_at`,
      [workspaceId]
    )
    const { rows: items } = await fastify.pg.query(
      `SELECT ti.*, u.username as assignee_username FROM todo_items ti
       LEFT JOIN users u ON u.id = ti.assignee_id
       WHERE ti.list_id IN (SELECT id FROM todo_lists WHERE workspace_id = $1)
       ORDER BY ti.position`,
      [workspaceId]
    )
    return reply.send({ lists, items })
  })

  fastify.post('/lists', {
    schema: { body: { type: 'object', required: ['title'], properties: { title: { type: 'string', maxLength: 200 } } } },
  }, async (request, reply) => {
    if (denyViewer(request, reply)) return
    const { workspaceId } = request.params
    const { rows: [list] } = await fastify.pg.query(
      `INSERT INTO todo_lists (workspace_id, title, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [workspaceId, request.body.title, request.user.id]
    )
    broadcast(fastify, workspaceId, { type: 'todo_list:created', list })
    return reply.code(201).send(list)
  })

  fastify.post('/lists/:listId/items', { // editor+
    schema: {
      body: {
        type: 'object', required: ['text'],
        properties: {
          text: { type: 'string', maxLength: 1000 },
          assigneeId: { type: 'string' },
          dueDate: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (denyViewer(request, reply)) return
    const { workspaceId, listId } = request.params
    const { text, assigneeId, dueDate } = request.body
    const { rows: [{ max_pos }] } = await fastify.pg.query(
      `SELECT COALESCE(MAX(position), -1) as max_pos FROM todo_items WHERE list_id = $1`, [listId]
    )
    const { rows: [item] } = await fastify.pg.query(
      `INSERT INTO todo_items (list_id, text, assignee_id, due_date, position, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [listId, text, assigneeId || null, dueDate || null, max_pos + 1, request.user.id]
    )
    broadcast(fastify, workspaceId, { type: 'todo_item:created', item })
    return reply.code(201).send(item)
  })

  fastify.patch('/items/:itemId', async (request, reply) => {
    if (denyViewer(request, reply)) return
    const { itemId, workspaceId } = request.params
    const allowed = ['text', 'completed', 'assignee_id', 'due_date', 'position']
    const fields = Object.keys(request.body).filter(k => allowed.includes(k))
    if (fields.length === 0) return reply.code(400).send({ error: 'No valid fields' })
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const vals = fields.map(f => request.body[f])
    const { rows: [item] } = await fastify.pg.query(
      `UPDATE todo_items SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [itemId, ...vals]
    )
    broadcast(fastify, workspaceId, { type: 'todo_item:updated', item })
    return reply.send(item)
  })

  fastify.delete('/items/:itemId', async (request, reply) => {
    if (denyViewer(request, reply)) return
    const { itemId, workspaceId } = request.params
    await fastify.pg.query('DELETE FROM todo_items WHERE id = $1', [itemId])
    broadcast(fastify, workspaceId, { type: 'todo_item:deleted', itemId })
    return reply.send({ ok: true })
  })

  fastify.delete('/lists/:listId', async (request, reply) => {
    if (denyViewer(request, reply)) return
    const { listId, workspaceId } = request.params
    await fastify.pg.query('DELETE FROM todo_lists WHERE id = $1', [listId])
    broadcast(fastify, workspaceId, { type: 'todo_list:deleted', listId })
    return reply.send({ ok: true })
  })
}

function broadcast(fastify, workspaceId, data) {
  fastify.redis.publish(`ws:${workspaceId}`, JSON.stringify(data))
}
