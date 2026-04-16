import React from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

const TILES = [
  { to: '/kanban',     icon: '▦',  label: 'Kanban',      desc: 'Manage tasks on boards' },
  { to: '/docs',       icon: '📄', label: 'Docs',         desc: 'Collaborative documents' },
  { to: '/todos',      icon: '✓',  label: 'To-Do Lists',  desc: 'Shared task lists' },
  { to: '/chat',       icon: '💬', label: 'Chat',         desc: 'Team messaging' },
  { to: '/whiteboard', icon: '✏️', label: 'Whiteboard',   desc: 'Collaborative canvas' },
  { to: '/mindmap',    icon: '🧠', label: 'Mind Map',     desc: 'Visual idea mapping' },
  { to: '/images',     icon: '🖼', label: 'Images',       desc: 'Share & edit images' },
  { to: '/files',      icon: '📁', label: 'Files',        desc: 'File storage' },
  { to: '/calendar',   icon: '📅', label: 'Calendar',     desc: 'Team schedule' },
  { to: '/polls',      icon: '📊', label: 'Polls',        desc: 'Team voting' },
  { to: '/activity',   icon: '⚡', label: 'Activity',     desc: 'Recent workspace activity' },
]

export default function DashboardPage() {
  const { user, currentWorkspace } = useAuthStore()

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Welcome back, {user?.username}
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
        {currentWorkspace?.name}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {TILES.map(t => (
          <Link key={t.to} to={t.to} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.label}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
