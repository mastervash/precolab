import cors from './cors.js'
import helmet from './helmet.js'
import jwt from './jwt.js'
import db from './db.js'
import redis from './redis.js'
import multipart from './multipart.js'
import rateLimit from './rateLimit.js'
import websocket from './websocket.js'

export async function registerPlugins(fastify) {
  // Security first
  await fastify.register(helmet)
  await fastify.register(cors)
  await fastify.register(rateLimit)

  // Data
  await fastify.register(db)
  await fastify.register(redis)

  // Auth
  await fastify.register(jwt)

  // Uploads
  await fastify.register(multipart)

  // WebSocket (must come before routes)
  await fastify.register(websocket)
}
