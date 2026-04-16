import fastifyWebsocket from '@fastify/websocket'

export default async function websocket(fastify) {
  await fastify.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1 MB
    },
  })
}
