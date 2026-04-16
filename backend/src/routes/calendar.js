import { authenticate } from '../middleware/authenticate.js'

export default async function calendarRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  fastify.get('/', async (request, reply) => {
    const { workspaceId } = request.params
    const { start, end } = request.query
    let sql = `SELECT ce.*, u.username FROM calendar_events ce
               JOIN users u ON u.id = ce.created_by
               WHERE ce.workspace_id = $1`
    const params = [workspaceId]
    if (start) { params.push(start); sql += ` AND ce.end_at >= $${params.length}` }
    if (end)   { params.push(end);   sql += ` AND ce.start_at <= $${params.length}` }
    sql += ' ORDER BY ce.start_at'
    const { rows } = await fastify.pg.query(sql, params)
    return reply.send(rows)
  })

  fastify.post('/', {
    schema: {
      body: {
        type: 'object', required: ['title', 'startAt', 'endAt'],
        properties: {
          title: { type: 'string', maxLength: 500 },
          description: { type: 'string', maxLength: 5000 },
          startAt: { type: 'string' },
          endAt: { type: 'string' },
          allDay: { type: 'boolean' },
          color: { type: 'string', maxLength: 20 },
        },
      },
    },
  }, async (request, reply) => {
    const { workspaceId } = request.params
    const { title, description, startAt, endAt, allDay, color } = request.body
    const { rows: [event] } = await fastify.pg.query(
      `INSERT INTO calendar_events (workspace_id, title, description, start_at, end_at, all_day, color, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [workspaceId, title, description, startAt, endAt, allDay || false, color || '#6366f1', request.user.id]
    )
    return reply.code(201).send(event)
  })

  fastify.patch('/:id', async (request, reply) => {
    const allowed = ['title', 'description', 'start_at', 'end_at', 'all_day', 'color']
    const fields = Object.keys(request.body).filter(k => allowed.includes(k))
    if (fields.length === 0) return reply.code(400).send({ error: 'No valid fields' })
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const { rows: [event] } = await fastify.pg.query(
      `UPDATE calendar_events SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [request.params.id, ...fields.map(f => request.body[f])]
    )
    return reply.send(event)
  })

  fastify.delete('/:id', async (request, reply) => {
    await fastify.pg.query('DELETE FROM calendar_events WHERE id = $1', [request.params.id])
    return reply.send({ ok: true })
  })
}
