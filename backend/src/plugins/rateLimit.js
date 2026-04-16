import fastifyRateLimit from '@fastify/rate-limit'

export default async function rateLimit(fastify) {
  await fastify.register(fastifyRateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    // Auth routes override with stricter limits via route-level config
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({
      error: 'Too many requests, please slow down',
    }),
  })
}
