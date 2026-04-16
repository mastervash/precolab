import fastifyPostgres from '@fastify/postgres'

export default async function db(fastify) {
  await fastify.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL,
  })

  // Run migrations on startup
  const client = await fastify.pg.connect()
  try {
    await runMigrations(client)
  } finally {
    client.release()
  }
}

async function runMigrations(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  const migrations = await import('../db/migrations.js')
  for (const [version, sql] of Object.entries(migrations.default)) {
    const { rows } = await client.query(
      'SELECT version FROM schema_migrations WHERE version = $1',
      [version]
    )
    if (rows.length === 0) {
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        )
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }
  }
}
