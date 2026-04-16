import fastifyRateLimit from '@fastify/rate-limit'

export default async function rateLimit(fastify) {
  await fastify.register(fastifyRateLimit, {
    global: false, // Apply per-route via config
    max: 100,
    timeWindow: '1 minute',
  })
}
