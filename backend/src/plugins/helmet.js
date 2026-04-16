import fastifyHelmet from '@fastify/helmet'

export default async function helmet(fastify) {
  await fastify.register(fastifyHelmet, {
    // Allow files/images to be loaded cross-origin (served from API)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Relax CSP for the API — frontend enforces its own CSP via Vite
    contentSecurityPolicy: false,
  })
}
