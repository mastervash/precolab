import { authenticate } from '../middleware/authenticate.js'
import { checkMembership, denyViewer } from '../middleware/workspace.js'

export default async function chatRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', checkMembership(fastify))

  // GET /rooms
  fastify.get('/rooms', async (request, reply) => {
    const { workspaceId } = request.params
    const { rows } = await fastify.pg.query(
      `SELECT * FROM chat_rooms WHERE workspace_id = $1 ORDER BY name`,
      [workspaceId]
    )
    return reply.send(rows)
  })

  // POST /rooms
  fastify.post('/rooms', {
    schema: { body: { type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 100 } } } },
  }, async (request, reply) => {
    if (denyViewer(request, reply)) return
    const { workspaceId } = request.params
    const { rows: [room] } = await fastify.pg.query(
      `INSERT INTO chat_rooms (workspace_id, name) VALUES ($1, $2) RETURNING *`,
      [workspaceId, request.body.name]
    )
    return reply.code(201).send(room)
  })

  // GET /rooms/:roomId/messages
  fastify.get('/rooms/:roomId/messages', async (request, reply) => {
    const { roomId } = request.params
    const limit = Math.min(parseInt(request.query.limit || '50'), 100)
    const before = request.query.before
    const conditions = ['m.room_id = $1']
    const params = [roomId]
    if (before) {
      params.push(before)
      conditions.push(`m.created_at < $${params.length}`)
    }
    const { rows } = await fastify.pg.query(
      `SELECT m.*, u.username, u.avatar_color FROM messages m
       JOIN users u ON u.id = m.author_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.created_at DESC LIMIT ${limit}`,
      params
    )
    return reply.send(rows.reverse())
  })

  // WebSocket /rooms/:roomId/ws
  fastify.get('/rooms/:roomId/ws', { websocket: true }, (socket, request) => {
    const { roomId, workspaceId } = request.params

    // Verify token from query param (WS can't set headers easily)
    let userId, username, avatarColor
    try {
      const token = request.query.token
      const decoded = fastify.jwt.verify(token)
      userId = decoded.id
      username = decoded.username
    } catch {
      socket.close(1008, 'Unauthorized')
      return
    }

    const channel = `chat:${roomId}`

    // Subscribe to Redis for this room
    const sub = fastify.redisSub.duplicate()
    sub.subscribe(channel)
    sub.on('message', (_, msg) => {
      if (socket.readyState === 1) socket.send(msg)
    })

    socket.on('message', async (raw) => {
      let data
      try { data = JSON.parse(raw) } catch { return }

      if (data.type === 'message' && data.body?.trim()) {
        const body = data.body.trim().substring(0, 4000)
        const { rows: [msg] } = await fastify.pg.query(
          `INSERT INTO messages (room_id, author_id, body) VALUES ($1,$2,$3)
           RETURNING id, room_id, author_id, body, created_at`,
          [roomId, userId, body]
        )
        const payload = JSON.stringify({ ...msg, username, avatarColor })
        fastify.redis.publish(channel, payload)
      }
    })

    socket.on('close', () => {
      sub.unsubscribe(channel)
      sub.quit()
    })
  })
}
