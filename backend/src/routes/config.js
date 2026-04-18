export default async function configRoutes(fastify) {
  fastify.get('/', async (request, reply) => {
    return reply.send({
      workspaceMode: process.env.WORKSPACE_MODE === 'single' ? 'single' : 'multi',
    })
  })
}
