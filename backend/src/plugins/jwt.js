import fastifyJwt from '@fastify/jwt'

export default async function jwt(fastify) {
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
    sign: { expiresIn: '15m' },
  })

  // Convenience decorator used by routes
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}
