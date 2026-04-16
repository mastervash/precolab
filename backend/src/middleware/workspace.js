/**
 * Verifies the authenticated user is a member of the requested workspace
 * and attaches `request.workspaceRole` ('admin' | 'editor' | 'viewer').
 *
 * Expects `request.params.workspaceId` (workspace-scoped routes).
 */
export function checkMembership(fastify) {
  return async function (request, reply) {
    const workspaceId = request.params.workspaceId
    if (!workspaceId) return // non-workspace routes skip this

    const { rows: [m] } = await fastify.pg.query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, request.user.id]
    )
    if (!m) return reply.code(403).send({ error: 'Not a member of this workspace' })
    request.workspaceRole = m.role
  }
}

/**
 * Inline guard for mutation routes — call at the top of any POST/PATCH/DELETE handler.
 * Returns true if the reply was already sent (caller should return immediately).
 */
export function denyViewer(request, reply) {
  if (request.workspaceRole === 'viewer') {
    reply.code(403).send({ error: 'Viewers cannot modify content' })
    return true
  }
  return false
}
