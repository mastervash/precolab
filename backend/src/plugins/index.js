import cors from './cors.js'
import helmet from './helmet.js'
import jwt from './jwt.js'
import db from './db.js'
import redis from './redis.js'
import multipart from './multipart.js'
import rateLimit from './rateLimit.js'
import websocket from './websocket.js'

export async function registerPlugins(fastify) {
  // All plugins called directly (not via fastify.register) so their decorators
  // land on the root scope and are visible to all route plugins.
  await helmet(fastify)
  await cors(fastify)
  await rateLimit(fastify)
  await db(fastify)
  await redis(fastify)
  await jwt(fastify)
  await multipart(fastify)
  await websocket(fastify)
}
