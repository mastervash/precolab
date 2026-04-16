import authRoutes from './auth.js'
import usersRoutes from './users.js'
import workspacesRoutes from './workspaces.js'
import kanbanRoutes from './kanban.js'
import docsRoutes from './docs.js'
import todosRoutes from './todos.js'
import chatRoutes from './chat.js'
import whiteboardRoutes from './whiteboard.js'
import mindmapRoutes from './mindmap.js'
import filesRoutes from './files.js'
import commentsRoutes from './comments.js'
import activityRoutes from './activity.js'
import pollsRoutes from './polls.js'
import calendarRoutes from './calendar.js'
import collaborationRoutes from './collaboration.js'

export async function registerRoutes(fastify) {
  await fastify.register(authRoutes, { prefix: '/api/auth' })
  await fastify.register(usersRoutes, { prefix: '/api/users' })
  await fastify.register(workspacesRoutes, { prefix: '/api/workspaces' })
  await fastify.register(kanbanRoutes, { prefix: '/api/workspaces/:workspaceId/kanban' })
  await fastify.register(docsRoutes, { prefix: '/api/workspaces/:workspaceId/docs' })
  await fastify.register(todosRoutes, { prefix: '/api/workspaces/:workspaceId/todos' })
  await fastify.register(chatRoutes, { prefix: '/api/workspaces/:workspaceId/chat' })
  await fastify.register(whiteboardRoutes, { prefix: '/api/workspaces/:workspaceId/whiteboards' })
  await fastify.register(mindmapRoutes, { prefix: '/api/workspaces/:workspaceId/mindmaps' })
  await fastify.register(filesRoutes, { prefix: '/api/workspaces/:workspaceId/files' })
  await fastify.register(commentsRoutes, { prefix: '/api/comments' })
  await fastify.register(activityRoutes, { prefix: '/api/workspaces/:workspaceId/activity' })
  await fastify.register(pollsRoutes, { prefix: '/api/workspaces/:workspaceId/polls' })
  await fastify.register(calendarRoutes, { prefix: '/api/workspaces/:workspaceId/calendar' })
  await fastify.register(collaborationRoutes, { prefix: '/ws' })
}
