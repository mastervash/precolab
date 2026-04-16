import { authenticate } from '../middleware/authenticate.js'

export default async function usersRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /api/users/workspace/:workspaceId — list workspace members
  fastify.get('/workspace/:workspaceId', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      `SELECT u.id, u.username, u.email, u.avatar_color, wm.role
       FROM users u
       JOIN workspace_members wm ON wm.user_id = u.id
       WHERE wm.workspace_id = $1
       ORDER BY u.username`,
      [request.params.workspaceId]
    )
    return reply.send(rows)
  })
}
