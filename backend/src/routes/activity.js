import { authenticate } from '../middleware/authenticate.js'
import { checkMembership } from '../middleware/workspace.js'

export default async function activityRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', checkMembership(fastify))

  // GET /api/workspaces/:workspaceId/activity
  fastify.get('/', async (request, reply) => {
    const { workspaceId } = request.params
    const limit = Math.min(parseInt(request.query.limit || '50'), 100)
    const { rows } = await fastify.pg.query(
      `SELECT ae.*, u.username, u.avatar_color FROM activity_events ae
       JOIN users u ON u.id = ae.actor_id
       WHERE ae.workspace_id = $1
       ORDER BY ae.created_at DESC LIMIT $2`,
      [workspaceId, limit]
    )
    return reply.send(rows)
  })

  // GET /api/workspaces/:workspaceId/activity/stream — SSE
  fastify.get('/stream', async (request, reply) => {
    const { workspaceId } = request.params

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    const channel = `activity:${workspaceId}`
    const sub = fastify.redisSub.duplicate()
    await sub.subscribe(channel)

    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n')
    }, 30000)

    sub.on('message', (_, msg) => {
      reply.raw.write(`data: ${msg}\n\n`)
    })

    request.raw.on('close', () => {
      clearInterval(heartbeat)
      sub.unsubscribe(channel)
      sub.quit()
    })
  })
}
