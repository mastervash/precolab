import { authenticate } from '../middleware/authenticate.js'
import { fileTypeFromBuffer } from 'file-type'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf', 'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  ...ALLOWED_IMAGE_TYPES,
])

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/uploads'

export default async function filesRoutes(fastify) {
  fastify.addHook('preHandler', authenticate)

  // GET /images
  fastify.get('/images', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      `SELECT f.id, f.filename, f.original_name, f.mime_type, f.size_bytes, f.created_at, u.username
       FROM files f JOIN users u ON u.id = f.uploaded_by
       WHERE f.workspace_id = $1 AND f.file_type = 'image' ORDER BY f.created_at DESC`,
      [request.params.workspaceId]
    )
    return reply.send(rows.map(r => ({ ...r, url: `/api/workspaces/${request.params.workspaceId}/files/serve/${r.filename}` })))
  })

  // GET /docs (non-image files)
  fastify.get('/docs', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      `SELECT f.id, f.filename, f.original_name, f.mime_type, f.size_bytes, f.created_at, u.username
       FROM files f JOIN users u ON u.id = f.uploaded_by
       WHERE f.workspace_id = $1 AND f.file_type = 'file' ORDER BY f.created_at DESC`,
      [request.params.workspaceId]
    )
    return reply.send(rows.map(r => ({ ...r, url: `/api/workspaces/${request.params.workspaceId}/files/serve/${r.filename}` })))
  })

  // POST /upload
  fastify.post('/upload', async (request, reply) => {
    const { workspaceId } = request.params
    const parts = request.files()
    const uploaded = []

    for await (const part of parts) {
      const buffer = await part.toBuffer()

      // Validate file type by magic bytes
      const detected = await fileTypeFromBuffer(buffer)
      const mimeType = detected?.mime || part.mimetype

      if (!ALLOWED_FILE_TYPES.has(mimeType)) {
        return reply.code(400).send({ error: `File type not allowed: ${mimeType}` })
      }

      const isImage = ALLOWED_IMAGE_TYPES.has(mimeType)
      const subdir = isImage ? 'images' : 'files'
      const ext = path.extname(part.filename) || ''
      const filename = `${crypto.randomUUID()}${ext}`
      const filePath = path.join(UPLOAD_DIR, subdir, filename)

      await fs.writeFile(filePath, buffer)

      const { rows: [file] } = await fastify.pg.query(
        `INSERT INTO files (workspace_id, filename, original_name, mime_type, size_bytes, file_type, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, filename, original_name, mime_type, size_bytes, created_at`,
        [workspaceId, filename, part.filename, mimeType, buffer.length, isImage ? 'image' : 'file', request.user.id]
      )
      uploaded.push({ ...file, url: `/api/workspaces/${workspaceId}/files/serve/${filename}` })
    }

    return reply.code(201).send(uploaded)
  })

  // GET /serve/:filename — serve file
  fastify.get('/serve/:filename', async (request, reply) => {
    const { filename } = request.params
    // Sanitize: no path traversal
    if (filename.includes('/') || filename.includes('..')) {
      return reply.code(400).send({ error: 'Invalid filename' })
    }

    const { rows: [file] } = await fastify.pg.query(
      'SELECT * FROM files WHERE filename = $1', [filename]
    )
    if (!file) return reply.code(404).send({ error: 'Not found' })

    const subdir = file.file_type === 'image' ? 'images' : 'files'
    const filePath = path.join(UPLOAD_DIR, subdir, filename)

    try {
      const buffer = await fs.readFile(filePath)
      return reply
        .header('Content-Type', file.mime_type)
        .header('Content-Disposition', `inline; filename="${file.original_name}"`)
        .send(buffer)
    } catch {
      return reply.code(404).send({ error: 'File not found on disk' })
    }
  })

  // DELETE /:id
  fastify.delete('/:id', async (request, reply) => {
    const { rows: [file] } = await fastify.pg.query(
      'SELECT * FROM files WHERE id = $1 AND workspace_id = $2',
      [request.params.id, request.params.workspaceId]
    )
    if (!file) return reply.code(404).send({ error: 'Not found' })

    const subdir = file.file_type === 'image' ? 'images' : 'files'
    const filePath = path.join(UPLOAD_DIR, subdir, file.filename)
    await fs.rm(filePath, { force: true })
    await fastify.pg.query('DELETE FROM files WHERE id = $1', [file.id])
    return reply.send({ ok: true })
  })
}
