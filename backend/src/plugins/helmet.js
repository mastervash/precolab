import fastifyHelmet from '@fastify/helmet'

export default async function helmet(fastify) {
  await fastify.register(fastifyHelmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
}
