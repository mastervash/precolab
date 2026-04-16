import { authenticate } from '../middleware/authenticate.js'

export default async function kanbanRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /boards
  fastify.get('/boards', async (request, reply) => {
    const { workspaceId } = request.params
    const { rows } = await fastify.pg.query(
      `SELECT b.*, u.username as created_by_username
       FROM boards b JOIN users u ON u.id = b.created_by
       WHERE b.workspace_id = $1 ORDER BY b.created_at`,
      [workspaceId]
    )
    return reply.send(rows)
  })

  // POST /boards
  fastify.post('/boards', {
    schema: { body: { type: 'object', required: ['title'], properties: { title: { type: 'string', maxLength: 200 } } } },
  }, async (request, reply) => {
    const { workspaceId } = request.params
    const { rows: [board] } = await fastify.pg.query(
      `INSERT INTO boards (workspace_id, title, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [workspaceId, request.body.title, request.user.id]
    )
    // Add default columns
    await fastify.pg.query(
      `INSERT INTO board_columns (board_id, title, position) VALUES ($1,'To Do',0),($1,'In Progress',1),($1,'Done',2)`,
      [board.id]
    )
    broadcast(fastify, workspaceId, { type: 'board:created', board })
    return reply.code(201).send(board)
  })

  // GET /boards/:boardId — full board with columns and cards
  fastify.get('/boards/:boardId', async (request, reply) => {
    const { boardId } = request.params
    const { rows: columns } = await fastify.pg.query(
      `SELECT * FROM board_columns WHERE board_id = $1 ORDER BY position`,
      [boardId]
    )
    const { rows: cards } = await fastify.pg.query(
      `SELECT c.*, u.username as assignee_username
       FROM cards c LEFT JOIN users u ON u.id = c.assignee_id
       WHERE c.board_id = $1 ORDER BY c.position`,
      [boardId]
    )
    return reply.send({ columns, cards })
  })

  // POST /boards/:boardId/columns
  fastify.post('/boards/:boardId/columns', {
    schema: { body: { type: 'object', required: ['title'], properties: { title: { type: 'string', maxLength: 100 } } } },
  }, async (request, reply) => {
    const { boardId, workspaceId } = request.params
    const { rows: [{ max_pos }] } = await fastify.pg.query(
      `SELECT COALESCE(MAX(position), -1) as max_pos FROM board_columns WHERE board_id = $1`, [boardId]
    )
    const { rows: [col] } = await fastify.pg.query(
      `INSERT INTO board_columns (board_id, title, position) VALUES ($1, $2, $3) RETURNING *`,
      [boardId, request.body.title, max_pos + 1]
    )
    broadcast(fastify, workspaceId, { type: 'column:created', column: col })
    return reply.code(201).send(col)
  })

  // POST /boards/:boardId/cards
  fastify.post('/boards/:boardId/cards', {
    schema: {
      body: {
        type: 'object', required: ['title', 'columnId'],
        properties: {
          title: { type: 'string', maxLength: 500 },
          columnId: { type: 'string' },
          description: { type: 'string', maxLength: 5000 },
          assigneeId: { type: 'string' },
          dueDate: { type: 'string' },
          labels: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const { boardId, workspaceId } = request.params
    const { title, columnId, description, assigneeId, dueDate, labels } = request.body
    const { rows: [{ max_pos }] } = await fastify.pg.query(
      `SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = $1`, [columnId]
    )
    const { rows: [card] } = await fastify.pg.query(
      `INSERT INTO cards (column_id, board_id, title, description, position, assignee_id, due_date, labels, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [columnId, boardId, title, description, max_pos + 1, assigneeId || null, dueDate || null, labels || [], request.user.id]
    )
    broadcast(fastify, workspaceId, { type: 'card:created', card })
    logActivity(fastify, workspaceId, request.user.id, 'created_card', 'card', card.id, title)
    return reply.code(201).send(card)
  })

  // PATCH /boards/:boardId/cards/:cardId — move or update card
  fastify.patch('/boards/:boardId/cards/:cardId', async (request, reply) => {
    const { cardId, workspaceId } = request.params
    const updates = request.body
    const allowed = ['title', 'description', 'column_id', 'position', 'assignee_id', 'due_date', 'labels']
    const fields = Object.keys(updates).filter(k => allowed.includes(k))
    if (fields.length === 0) return reply.code(400).send({ error: 'No valid fields' })

    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const vals = fields.map(f => updates[f])
    const { rows: [card] } = await fastify.pg.query(
      `UPDATE cards SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [cardId, ...vals]
    )
    broadcast(fastify, workspaceId, { type: 'card:updated', card })
    return reply.send(card)
  })

  // DELETE /boards/:boardId/cards/:cardId
  fastify.delete('/boards/:boardId/cards/:cardId', async (request, reply) => {
    const { cardId, workspaceId } = request.params
    await fastify.pg.query('DELETE FROM cards WHERE id = $1', [cardId])
    broadcast(fastify, workspaceId, { type: 'card:deleted', cardId })
    return reply.send({ ok: true })
  })
}

function broadcast(fastify, workspaceId, data) {
  fastify.redis.publish(`ws:${workspaceId}`, JSON.stringify(data))
}

function logActivity(fastify, workspaceId, actorId, action, entityType, entityId, entityTitle) {
  fastify.pg.query(
    `INSERT INTO activity_events (workspace_id, actor_id, action, entity_type, entity_id, entity_title)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [workspaceId, actorId, action, entityType, entityId, entityTitle]
  ).catch(() => {})
}
