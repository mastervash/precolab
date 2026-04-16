import Fastify from 'fastify'
import { registerPlugins } from './plugins/index.js'
import { registerRoutes } from './routes/index.js'

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
  },
})

await registerPlugins(fastify)
await registerRoutes(fastify)

const port = parseInt(process.env.PORT || '3000')
const host = '0.0.0.0'

try {
  await fastify.listen({ port, host })
  fastify.log.info(`Server running at http://${host}:${port}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
