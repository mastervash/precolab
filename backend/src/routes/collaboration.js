/**
 * Yjs WebSocket collaboration server
 * Handles rooms for: doc:{id}, whiteboard:{id}, mindmap:{id}
 * Protocol: y-websocket binary frames
 */
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync.js'
import * as awarenessProtocol from 'y-protocols/awareness.js'
import * as encoding from 'lib0/encoding.js'
import * as decoding from 'lib0/decoding.js'

const messageSync = 0
const messageAwareness = 1

// In-memory doc store per room
const docs = new Map()
const awareness = new Map()

function getDoc(roomName) {
  if (!docs.has(roomName)) {
    docs.set(roomName, new Y.Doc())
    awareness.set(roomName, new awarenessProtocol.Awareness(docs.get(roomName)))
  }
  return { doc: docs.get(roomName), aw: awareness.get(roomName) }
}

export default async function collaborationRoutes(fastify) {
  // /ws/collab/:room — Yjs sync
  fastify.get('/collab/:room', { websocket: true }, async (socket, request) => {
    const roomName = request.params.room

    // Auth via query token
    let userId
    try {
      const token = request.query.token
      const decoded = fastify.jwt.verify(token)
      userId = decoded.id
    } catch {
      socket.close(1008, 'Unauthorized')
      return
    }

    const { doc, aw } = getDoc(roomName)

    // Load persisted state if available and doc is fresh
    if (doc.store.clients.size === 0) {
      await loadDocState(fastify, roomName, doc)
    }

    // Track connections per room
    if (!doc._connections) doc._connections = new Set()
    doc._connections.add(socket)

    // Send sync step 1
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeSyncStep1(encoder, doc)
    socket.send(encoding.toUint8Array(encoder))

    // Send awareness states
    const awarenessEncoder = encoding.createEncoder()
    encoding.writeVarUint(awarenessEncoder, messageAwareness)
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(aw, Array.from(aw.getStates().keys()))
    )
    socket.send(encoding.toUint8Array(awarenessEncoder))

    // Handle updates
    const docUpdateHandler = (update) => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.writeUpdate(encoder, update)
      const msg = encoding.toUint8Array(encoder)
      doc._connections.forEach(conn => {
        if (conn !== socket && conn.readyState === 1) conn.send(msg)
      })
      // Persist state snapshot to Redis
      fastify.redis.set(`yjs:${roomName}`, Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64'), 'EX', 3600)
    }

    const awarenessUpdateHandler = ({ added, updated, removed }) => {
      const changedClients = [...added, ...updated, ...removed]
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(aw, changedClients))
      const msg = encoding.toUint8Array(encoder)
      doc._connections.forEach(conn => {
        if (conn !== socket && conn.readyState === 1) conn.send(msg)
      })
    }

    doc.on('update', docUpdateHandler)
    aw.on('update', awarenessUpdateHandler)

    socket.on('message', (rawMsg) => {
      const decoder = decoding.createDecoder(new Uint8Array(rawMsg))
      const msgType = decoding.readVarUint(decoder)

      if (msgType === messageSync) {
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, messageSync)
        syncProtocol.readSyncMessage(decoder, encoder, doc, null)
        if (encoding.length(encoder) > 1) socket.send(encoding.toUint8Array(encoder))
      } else if (msgType === messageAwareness) {
        awarenessProtocol.applyAwarenessUpdate(aw, decoding.readVarUint8Array(decoder), socket)
      }
    })

    socket.on('close', async () => {
      doc._connections.delete(socket)
      doc.off('update', docUpdateHandler)
      aw.off('update', awarenessUpdateHandler)
      awarenessProtocol.removeAwarenessStates(aw, [doc.clientID], null)

      // Persist to DB when last connection closes
      if (doc._connections.size === 0) {
        await persistDocState(fastify, roomName, doc)
      }
    })
  })

  // /ws/workspace/:workspaceId — General workspace event bus (kanban, todos, etc.)
  fastify.get('/workspace/:workspaceId', { websocket: true }, (socket, request) => {
    const { workspaceId } = request.params

    let userId
    try {
      const decoded = fastify.jwt.verify(request.query.token)
      userId = decoded.id
    } catch {
      socket.close(1008, 'Unauthorized')
      return
    }

    const channel = `ws:${workspaceId}`
    const sub = fastify.redisSub.duplicate()
    sub.subscribe(channel)
    sub.on('message', (_, msg) => {
      if (socket.readyState === 1) socket.send(msg)
    })

    socket.on('close', () => {
      sub.unsubscribe(channel)
      sub.quit()
    })
  })
}

async function loadDocState(fastify, roomName, doc) {
  try {
    // Try Redis first
    const cached = await fastify.redis.get(`yjs:${roomName}`)
    if (cached) {
      Y.applyUpdate(doc, Buffer.from(cached, 'base64'))
      return
    }
    // Fall back to DB
    const table = roomTable(roomName)
    if (!table) return
    const id = roomName.split(':')[1]
    const { rows: [row] } = await fastify.pg.query(
      `SELECT yjs_state FROM ${table} WHERE id = $1`, [id]
    )
    if (row?.yjs_state) {
      Y.applyUpdate(doc, row.yjs_state)
    }
  } catch { /* not fatal */ }
}

async function persistDocState(fastify, roomName, doc) {
  try {
    const table = roomTable(roomName)
    if (!table) return
    const id = roomName.split(':')[1]
    const state = Y.encodeStateAsUpdate(doc)
    await fastify.pg.query(
      `UPDATE ${table} SET yjs_state = $1, updated_at = NOW() WHERE id = $2`,
      [Buffer.from(state), id]
    )
  } catch { /* not fatal */ }
}

function roomTable(roomName) {
  if (roomName.startsWith('doc:')) return 'documents'
  if (roomName.startsWith('whiteboard:')) return 'whiteboards'
  if (roomName.startsWith('mindmap:')) return 'mindmaps'
  return null
}
