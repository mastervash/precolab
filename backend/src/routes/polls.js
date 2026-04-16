import { authenticate } from '../middleware/authenticate.js'
import { checkMembership, denyViewer } from '../middleware/workspace.js'

export default async function pollsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', checkMembership(fastify))

  fastify.get('/', async (request, reply) => {
    const { rows: polls } = await fastify.pg.query(
      `SELECT p.*, u.username FROM polls p JOIN users u ON u.id = p.created_by
       WHERE p.workspace_id = $1 ORDER BY p.created_at DESC`,
      [request.params.workspaceId]
    )
    const { rows: options } = await fastify.pg.query(
      `SELECT po.*, COUNT(pv.user_id)::int as vote_count
       FROM poll_options po
       LEFT JOIN poll_votes pv ON pv.option_id = po.id
       WHERE po.poll_id IN (SELECT id FROM polls WHERE workspace_id = $1)
       GROUP BY po.id ORDER BY po.position`,
      [request.params.workspaceId]
    )
    const { rows: userVotes } = await fastify.pg.query(
      `SELECT pv.poll_id, pv.option_id FROM poll_votes pv
       WHERE pv.user_id = $1 AND pv.poll_id IN (SELECT id FROM polls WHERE workspace_id = $2)`,
      [request.user.id, request.params.workspaceId]
    )

    return reply.send(polls.map(p => ({
      ...p,
      options: options.filter(o => o.poll_id === p.id),
      userVote: userVotes.find(v => v.poll_id === p.id)?.option_id || null,
    })))
  })

  fastify.post('/', { // editor+ only
    schema: {
      body: {
        type: 'object', required: ['question', 'options'],
        properties: {
          question: { type: 'string', maxLength: 1000 },
          options: { type: 'array', items: { type: 'string', maxLength: 500 }, minItems: 2, maxItems: 10 },
          closesAt: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (denyViewer(request, reply)) return
    const { workspaceId } = request.params
    const { question, options, closesAt } = request.body
    const client = await fastify.pg.connect()
    try {
      const { rows: [poll] } = await client.query(
        `INSERT INTO polls (workspace_id, question, created_by, closes_at) VALUES ($1,$2,$3,$4) RETURNING *`,
        [workspaceId, question, request.user.id, closesAt || null]
      )
      for (let i = 0; i < options.length; i++) {
        await client.query(
          `INSERT INTO poll_options (poll_id, text, position) VALUES ($1,$2,$3)`,
          [poll.id, options[i], i]
        )
      }
      return reply.code(201).send(poll)
    } finally {
      client.release()
    }
  })

  fastify.post('/:pollId/vote', {
    schema: { body: { type: 'object', required: ['optionId'], properties: { optionId: { type: 'string' } } } },
  }, async (request, reply) => {
    const { pollId } = request.params
    const { optionId } = request.body

    // Verify option belongs to poll
    const { rows: [opt] } = await fastify.pg.query(
      'SELECT id FROM poll_options WHERE id = $1 AND poll_id = $2', [optionId, pollId]
    )
    if (!opt) return reply.code(400).send({ error: 'Invalid option' })

    await fastify.pg.query(
      `INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1,$2,$3)
       ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = $2, voted_at = NOW()`,
      [pollId, optionId, request.user.id]
    )
    return reply.send({ ok: true })
  })

  fastify.delete('/:pollId', async (request, reply) => {
    if (denyViewer(request, reply)) return
    await fastify.pg.query('DELETE FROM polls WHERE id = $1 AND created_by = $2',
      [request.params.pollId, request.user.id])
    return reply.send({ ok: true })
  })
}
