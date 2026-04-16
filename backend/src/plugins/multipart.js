import fastifyMultipart from '@fastify/multipart'

export default async function multipart(fastify) {
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB
      files: 10,
    },
  })
}
