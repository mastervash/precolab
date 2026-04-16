import Redis from 'ioredis'

export default async function redis(fastify) {
  const client = new Redis(process.env.REDIS_URL)
  const subscriber = new Redis(process.env.REDIS_URL)

  client.on('error', (err) => fastify.log.error({ err }, 'Redis error'))
  subscriber.on('error', (err) => fastify.log.error({ err }, 'Redis subscriber error'))

  fastify.decorate('redis', client)
  fastify.decorate('redisSub', subscriber)

  fastify.addHook('onClose', async () => {
    await client.quit()
    await subscriber.quit()
  })
}
